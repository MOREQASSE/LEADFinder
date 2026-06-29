import asyncio
import atexit
import json
import os
import subprocess
import sys
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from sqlalchemy import select, delete
from pydantic import BaseModel
from database import get_db
from models import Lead, ResumeData, PortfolioProject, User, ContactSpare, ApplicationLog, GeneratedDocument
from schemas import LeadOut, GeneratedDocumentOut
from auth import get_current_user
from utils.settings_loader import get_setting
from utils.contact_extractor import extract_contact
from utils.email_sender import send_email
from utils.ai_caller import call_ai
from ai.auto_apply import auto_apply_to_lead, AutoApplyResult

router = APIRouter(prefix="/api/automation", tags=["automation"])

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
LINKEDIN_PROFILE_DIR = PROJECT_ROOT / "linkedin_profile"
LINKEDIN_PROFILE_DIR.mkdir(exist_ok=True)

UPLOADS_DIR = PROJECT_ROOT / "uploads" / "resumes"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# ── Browser process lifecycle management ──────────────────────────

_active_browsers: dict[str, subprocess.Popen] = {}


def _browser_key(lead_id: int, operation: str) -> str:
    return f"{operation}_{lead_id}"


def _launch_browser(key: str, args: list, cwd: str | Path) -> subprocess.Popen:
    """Launch a browser subprocess, killing any existing one for the same key."""
    existing = _active_browsers.get(key)
    if existing and existing.poll() is None:
        existing.kill()
        try:
            existing.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pass
    proc = subprocess.Popen(args, cwd=cwd)
    _active_browsers[key] = proc
    return proc


def _cleanup_browsers():
    for key, proc in list(_active_browsers.items()):
        if proc.poll() is None:
            proc.kill()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                pass


atexit.register(_cleanup_browsers)

class DraftEmailRequest(BaseModel):
    lead_id: int
    custom_prompt: str | None = None

class SendEmailRequest(BaseModel):
    lead_id: int
    subject: str
    body: str

class EmailDraftOut(BaseModel):
    subject: str
    body: str

class SendLinkedInDmRequest(BaseModel):
    message: str

@router.post("/{lead_id}/extract-contact")
async def extract_lead_contact(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.contact_email:
        return {
            "email": lead.contact_email,
            "phone": lead.contact_phone,
            "source": lead.contact_source,
            "confidence": 1.0,
            "verified": True,
            "all_findings": [],
            "method_breakdown": {"cached": 1},
            "elapsed_seconds": 0.0,
        }

    extra = {}
    if lead.platform.lower() == "mastodon":
        mastodon_token = await get_setting(db, "mastodon_access_token", "")
        extra["access_token"] = mastodon_token

    email, phone, source = await extract_contact(lead.platform, lead.author, lead.url, extra)

    from osint.engine import run_osint_cascade
    osint_result = None
    try:
        osint_result = await asyncio.wait_for(
            run_osint_cascade(
                author=lead.author or "",
                company=lead.author,
                company_url=lead.url,
                page_text=lead.description or "",
            ),
            timeout=45,
        )
    except asyncio.TimeoutError:
        pass
    except Exception:
        pass

    if email or phone:
        findings = []
        if osint_result:
            findings = osint_result.all_findings
        return {
            "email": email,
            "phone": phone,
            "source": source,
            "confidence": 0.9,
            "verified": True,
            "all_findings": findings,
            "method_breakdown": {"platform": 1, **(osint_result.method_breakdown if osint_result else {})},
            "elapsed_seconds": osint_result.elapsed_seconds if osint_result else 0.0,
        }

    if osint_result:
        if osint_result.email:
            email = osint_result.email
            source = f"osint_{osint_result.source}"
        if osint_result.phone:
            phone = osint_result.phone
            if not source:
                source = f"osint_{osint_result.source}"

        lead.contact_email = email
        lead.contact_phone = phone
        lead.contact_source = source
        if email or phone:
            lead.application_status = "contact_found"
        await db.commit()

        return {
            "email": email,
            "phone": phone,
            "source": source,
            "confidence": osint_result.confidence,
            "verified": osint_result.verified,
            "all_findings": osint_result.all_findings,
            "method_breakdown": osint_result.method_breakdown,
            "elapsed_seconds": osint_result.elapsed_seconds,
        }

    lead.application_status = "contact_unavailable"
    await db.commit()

    return {
        "email": None,
        "phone": None,
        "source": None,
        "confidence": 0.0,
        "verified": False,
        "all_findings": [],
        "method_breakdown": {},
        "elapsed_seconds": 0.0,
    }


@router.post("/{lead_id}/osint-scan")
async def osint_scan(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await extract_lead_contact(lead_id, db, current_user)


@router.post("/{lead_id}/draft-email", response_model=EmailDraftOut)
async def draft_outreach_email(
    lead_id: int,
    req: DraftEmailRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.contact_email:
        raise HTTPException(status_code=400, detail="No contact email. Run extract-contact first.")

    resume_result = await db.execute(select(ResumeData).where(ResumeData.user_id == current_user.id).limit(1))
    resume = resume_result.scalars().first()

    resume_block = ""
    if resume:
        items = []
        if resume.name: items.append(f"Name: {resume.name}")
        if resume.skills: items.append(f"Skills: {', '.join(resume.skills) if isinstance(resume.skills, list) else resume.skills}")
        if resume.portfolio_url: items.append(f"Portfolio: {resume.portfolio_url}")
        if resume.experience_years: items.append(f"Experience: {resume.experience_years} years")
        if resume.pricing_min and resume.pricing_max: items.append(f"Budget range: {resume.pricing_min}-{resume.pricing_max} MAD")
        if resume.voice_tone: items.append(f"Tone: {resume.voice_tone}")
        if resume.past_projects: items.append(f"Past projects: {resume.past_projects[:200]}")
        resume_block = "\n".join(items)

    platform_context = ""
    if lead.platform.lower() == "reddit":
        platform_context = "The prospect posted on Reddit looking for services."
    elif lead.platform.lower() == "craigslist":
        platform_context = "The prospect posted on Craigslist."
    elif lead.platform.lower() == "mastodon":
        platform_context = "The prospect posted on Mastodon."
    elif lead.platform.lower() == "hackernews":
        platform_context = "The prospect posted on HackerNews."
    elif lead.platform.lower() == "upwork":
        platform_context = "The prospect posted a job on Upwork."
    elif lead.platform.lower() == "lionbridge":
        platform_context = "The prospect posted a job on Lionbridge."
    else:
        platform_context = f"The prospect is from {lead.platform}."

    custom = ""
    if req and req.custom_prompt:
        custom = f"\nAdditional instructions from user: {req.custom_prompt}"

    prompt = f"""Write a professional outreach email based on the following:

{platform_context}
Title: {lead.title or 'N/A'}
Author: {lead.author or 'N/A'}
Description: {(lead.description or '')[:1000]}
Budget: {lead.budget_raw or 'Not specified'}
Contact email: {lead.contact_email}

About me (the sender):
{resume_block or 'A freelance web developer'}
{custom}

The email should:
1. Have a clear subject line
2. Be concise (2-3 paragraphs max)
3. Reference their specific post/project
4. Explain how I can help based on my skills
5. Include a clear call to action
6. Use a professional but warm tone

Output ONLY the email body, starting with "Subject: " on the first line."""

    try:
        response = await call_ai(prompt, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI draft failed: {str(e)}")

    response = response or ""
    lines = response.strip().split("\n", 1)
    subject = lines[0].replace("Subject:", "").replace("subject:", "").strip() if lines[0].lower().startswith("subject") else f"Re: {lead.title or 'Your post'}"
    body = lines[1] if len(lines) > 1 else response

    return EmailDraftOut(subject=subject, body=body)

@router.post("/{lead_id}/send-email")
async def send_outreach_email(
    lead_id: int,
    req: SendEmailRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.contact_email:
        raise HTTPException(status_code=400, detail="No contact email for this lead")

    auto_send_str = await get_setting(db, "auto_send_email", "1")
    auto_send = auto_send_str == "1"

    if not auto_send:
        return {
            "status": "preview_only",
            "message": "Auto-send is disabled in Settings. Email was not sent.",
            "to": lead.contact_email,
            "subject": req.subject,
        }

    html = req.body.replace("\n", "<br>")
    success, msg = await send_email(lead.contact_email, req.subject, html, db)

    if success:
        lead.application_status = "contacted"
        await db.commit()
        return {"status": "sent", "message": msg, "to": lead.contact_email}
    else:
        return {"status": "failed", "message": msg}

@router.post("/{lead_id}/auto-fill-linkedin")
async def auto_fill_linkedin(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if "linkedin.com/jobs/view/" not in lead.url:
        raise HTTPException(status_code=400, detail="Not a LinkedIn job posting")

    lead.application_status = "draft_ready"
    await db.commit()

    from utils.settings_loader import get_setting
    profile_dir = str(LINKEDIN_PROFILE_DIR)

    resume_result = await db.execute(select(ResumeData).where(ResumeData.user_id == current_user.id).limit(1))
    resume = resume_result.scalars().first()
    resume_path = str(resume.resume_file_path) if (resume and resume.resume_file_path and Path(resume.resume_file_path).exists()) else "None"

    script_path = str(PROJECT_ROOT / "backend" / "scripts" / "linkedin_auto_fill.py")
    _launch_browser(
        _browser_key(lead_id, "autofill"),
        [sys.executable, script_path, lead.url, profile_dir, resume_path],
        cwd=str(PROJECT_ROOT),
    )

    return {
        "status": "started",
        "message": "LinkedIn Easy Apply assistant opened. Fill in your credentials if prompted, review the pre-filled form, then click Submit.",
    }

@router.get("/{lead_id}/status")
async def get_automation_status(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {
        "application_status": lead.application_status,
        "contact_email": lead.contact_email,
        "contact_phone": lead.contact_phone,
        "contact_source": lead.contact_source,
    }

@router.post("/{lead_id}/mark-applied")
async def mark_as_applied(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.application_status = "applied"
    await db.commit()
    return {"status": "applied"}

class FindHiringManagerResult(BaseModel):
    name: str
    title: str
    profile_url: str
    source: str

class SaveContactRequest(FindHiringManagerResult):
    spare_candidates: list[FindHiringManagerResult] = []

class FindHiringManagerResponse(BaseModel):
    candidates: list[FindHiringManagerResult]
    note: str | None = None

class SpareCandidateResult(BaseModel):
    id: int
    name: str
    title: str | None
    profile_url: str
    source: str | None
    created_at: datetime | None

    class Config:
        from_attributes = True

@router.post("/{lead_id}/find-hiring-manager", response_model=FindHiringManagerResponse)
async def find_hiring_manager(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if "linkedin.com" not in lead.url:
        raise HTTPException(status_code=400, detail="Not a LinkedIn lead")

    if lead.linkedin_contact_url:
        return FindHiringManagerResponse(candidates=[FindHiringManagerResult(
            name=lead.linkedin_contact_name or "",
            title=lead.linkedin_contact_title or "",
            profile_url=lead.linkedin_contact_url,
            source="saved",
        )])

    profile_dir = str(LINKEDIN_PROFILE_DIR)
    company_name = lead.author or ""
    script_path = str(PROJECT_ROOT / "backend" / "scripts" / "linkedin_dm_finder.py")

    browser_key = _browser_key(lead_id, "finder")
    existing = _active_browsers.get(browser_key)
    if existing and existing.poll() is None:
        existing.kill()
        try:
            existing.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pass

    proc = subprocess.Popen(
        [sys.executable, script_path, lead.url, company_name, profile_dir],
        cwd=str(PROJECT_ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    _active_browsers[browser_key] = proc

    loop = asyncio.get_event_loop()
    try:
        stdout, stderr = await loop.run_in_executor(None, lambda: proc.communicate(timeout=180))
    except subprocess.TimeoutExpired:
        proc.kill()
        stdout, stderr = await loop.run_in_executor(None, proc.communicate)
        stderr_text = stderr.decode()[:500] if stderr else ""
        _active_browsers.pop(browser_key, None)
        raise HTTPException(
            status_code=504,
            detail=f"Hiring manager search timed out.\n{stderr_text}"
        )

    _active_browsers.pop(browser_key, None)

    if proc.returncode != 0:
        stderr_text = stderr.decode()[:500] if stderr else "Unknown error"
        raise HTTPException(status_code=500, detail=f"Script failed (exit {proc.returncode}):\n{stderr_text}")

    try:
        data = json.loads(stdout)
    except json.JSONDecodeError:
        stderr_text = stderr.decode()[:300] if stderr else ""
        raise HTTPException(status_code=500, detail=f"Script output invalid: {stdout[:200]}\nStderr:\n{stderr_text}")

    error = data.get("error")
    if error:
        raise HTTPException(status_code=500, detail=error)

    candidates = data.get("candidates", [])
    note = data.get("note")

    if candidates:
        lead.linkedin_contact_name = candidates[0]["name"]
        lead.linkedin_contact_title = candidates[0]["title"]
        lead.linkedin_contact_url = candidates[0]["profile_url"]
        await db.commit()

    result = [FindHiringManagerResult(**c) for c in candidates]
    return FindHiringManagerResponse(candidates=result, note=note)

@router.post("/{lead_id}/save-linkedin-contact")
async def save_linkedin_contact(
    lead_id: int,
    data: SaveContactRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.linkedin_contact_name = data.name
    lead.linkedin_contact_title = data.title
    lead.linkedin_contact_url = data.profile_url
    if data.spare_candidates:
        await db.execute(delete(ContactSpare).where(ContactSpare.lead_id == lead_id))
        for spare in data.spare_candidates:
            db.add(ContactSpare(
                lead_id=lead_id,
                name=spare.name,
                title=spare.title,
                profile_url=spare.profile_url,
                source=spare.source,
            ))
    await db.commit()
    return {"status": "saved"}

@router.get("/{lead_id}/spare-candidates", response_model=list[SpareCandidateResult])
async def get_spare_candidates(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ContactSpare)
        .where(ContactSpare.lead_id == lead_id)
        .order_by(ContactSpare.created_at.desc())
    )
    return result.scalars().all()

@router.post("/{lead_id}/draft-linkedin-dm")
async def draft_linkedin_dm(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.linkedin_contact_url:
        raise HTTPException(status_code=400, detail="No hiring manager contact saved. Run find-hiring-manager first.")

    resume_result = await db.execute(select(ResumeData).where(ResumeData.user_id == current_user.id).limit(1))
    resume = resume_result.scalars().first()

    my_name = (current_user.name or "").strip() or (resume.name.strip() if (resume and resume.name) else "me")
    my_skills = ""
    if resume and resume.skills:
        my_skills = ', '.join(resume.skills) if isinstance(resume.skills, list) else resume.skills
    my_portfolio = resume.portfolio_url if (resume and resume.portfolio_url) else ""
    my_exp = resume.experience_years if (resume and resume.experience_years) else 0

    prompt = f"""Write a short LinkedIn connection note from me ({my_name}) to a hiring manager.

JOB DETAILS:
• Role: {lead.title or 'N/A'}
• Company: {lead.author or 'N/A'}
• Description: {(lead.description or '')[:500]}

HIRING MANAGER:
• Name: {lead.linkedin_contact_name or 'Hiring Manager'}
• Title: {lead.linkedin_contact_title or 'N/A'}

ABOUT ME ({my_name}):
• Skills: {my_skills or 'Not specified'}
• Portfolio: {my_portfolio or 'Not specified'}
• Experience: {my_exp} years

RULES — follow EVERY rule exactly:
1. Open with "Hey {{their_name}}, my name is {my_name} and..."
2. Reference the specific job they are hiring for
3. Mention ONE relevant skill or project
4. End with a call to action (e.g. "Would love to chat")
5. MUST be 150-200 characters max (LinkedIn connection note limit)
6. NEVER use brackets, placeholders, notes, meta, commentary
7. NEVER sign off or add "Thanks" """
    try:
        response = await call_ai(prompt, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI draft failed: {str(e)}")

    body = (response or "").strip()
    lead.linkedin_connection_note = body
    await db.commit()

    return {"body": body}

@router.post("/{lead_id}/send-linkedin-dm")
async def send_linkedin_dm(
    lead_id: int,
    req: SendLinkedInDmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.linkedin_contact_url:
        raise HTTPException(status_code=400, detail="No hiring manager contact saved.")

    profile_dir = str(LINKEDIN_PROFILE_DIR)
    contact_url = lead.linkedin_contact_url

    import tempfile
    dm_text = req.message
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8")
    tmp.write(dm_text)
    tmp.close()
    dm_file = tmp.name

    script_path = str(PROJECT_ROOT / "backend" / "scripts" / "linkedin_dm_sender.py")
    _launch_browser(
        _browser_key(lead_id, "senddm"),
        [sys.executable, script_path, contact_url, profile_dir, dm_file],
        cwd=str(PROJECT_ROOT),
    )

    lead.application_status = "draft_ready"
    await db.commit()

    return {
        "status": "started",
        "message": "LinkedIn DM window opened. Review the message and click Send.",
    }

@router.post("/{lead_id}/send-linkedin-connect")
async def send_linkedin_connect(
    lead_id: int,
    req: SendLinkedInDmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.linkedin_contact_url:
        raise HTTPException(status_code=400, detail="No hiring manager contact saved.")

    profile_dir = str(LINKEDIN_PROFILE_DIR)
    contact_url = lead.linkedin_contact_url

    import tempfile
    dm_text = req.message
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8")
    tmp.write(dm_text)
    tmp.close()
    dm_file = tmp.name

    script_path = str(PROJECT_ROOT / "backend" / "scripts" / "linkedin_connect_sender.py")
    _launch_browser(
        _browser_key(lead_id, "connect"),
        [sys.executable, script_path, contact_url, profile_dir, dm_file],
        cwd=str(PROJECT_ROOT),
    )

    lead.application_status = "contacted"
    await db.commit()

    return {
        "status": "sent",
        "message": "Connection request sent.",
    }


class AutoApplyRequest(BaseModel):
    lead_id: int
    confirm: bool = False


class AutoApplyResponse(BaseModel):
    status: str
    message: str
    fields_filled: list[str] = []
    steps_taken: list[str] = []
    model_used: str | None = None
    error: str | None = None
    confirmation_url: str | None = None


class AutoApplyLogOut(BaseModel):
    id: int
    lead_id: int
    status: str
    message: str | None
    fields_filled: list
    steps_taken: list
    model_used: str | None
    error: str | None
    confirmation_url: str | None
    created_at: datetime | None

    class Config:
        from_attributes = True


@router.post("/auto-apply", response_model=AutoApplyResponse)
async def start_auto_apply(
    req: AutoApplyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == req.lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    resume_result = await db.execute(
        select(ResumeData).where(ResumeData.user_id == current_user.id).limit(1)
    )
    resume = resume_result.scalars().first()
    if not resume:
        raise HTTPException(status_code=400, detail="No resume data found. Complete your profile first.")

    if "linkedin.com/jobs" not in lead.url:
        raise HTTPException(status_code=400, detail="Only LinkedIn job postings are supported for auto-apply.")

    try:
        app_result: AutoApplyResult = await auto_apply_to_lead(
            lead=lead,
            resume=resume,
            db=db,
            confirm=req.confirm,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return AutoApplyResponse(
        status=app_result.status,
        message=app_result.message,
        fields_filled=app_result.fields_filled,
        steps_taken=app_result.steps_taken,
        model_used=app_result.model_used,
        error=app_result.error,
        confirmation_url=app_result.confirmation_url,
    )


@router.post("/{lead_id}/auto-apply-confirm", response_model=AutoApplyResponse)
async def confirm_auto_apply(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    resume_result = await db.execute(
        select(ResumeData).where(ResumeData.user_id == current_user.id).limit(1)
    )
    resume = resume_result.scalars().first()
    if not resume:
        raise HTTPException(status_code=400, detail="No resume data found. Complete your profile first.")

    try:
        app_result: AutoApplyResult = await auto_apply_to_lead(
            lead=lead,
            resume=resume,
            db=db,
            confirm=True,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return AutoApplyResponse(
        status=app_result.status,
        message=app_result.message,
        fields_filled=app_result.fields_filled,
        steps_taken=app_result.steps_taken,
        model_used=app_result.model_used,
        error=app_result.error,
        confirmation_url=app_result.confirmation_url,
    )


@router.get("/{lead_id}/auto-apply-logs", response_model=list[AutoApplyLogOut])
async def get_auto_apply_logs(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ApplicationLog)
        .where(ApplicationLog.lead_id == lead_id)
        .order_by(ApplicationLog.created_at.desc())
        .limit(20)
    )
    return result.scalars().all()


@router.get("/{lead_id}/documents", response_model=list[GeneratedDocumentOut])
async def get_generated_documents(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(GeneratedDocument)
        .where(
            GeneratedDocument.lead_id == lead_id,
            GeneratedDocument.user_id == current_user.id,
        )
        .order_by(GeneratedDocument.created_at.desc())
    )
    docs = result.scalars().all()
    for doc in docs:
        if isinstance(doc.content_json, str):
            doc.content_json = json.loads(doc.content_json)
    return docs


@router.post("/{lead_id}/generate-resume")
async def generate_resume(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    from ai.resume_generator import generate_resume_content
    try:
        content = await generate_resume_content(lead, current_user.id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    if "error" in content:
        raise HTTPException(status_code=500, detail=content["error"])
    return content


@router.post("/{lead_id}/generate-cover-letter")
async def generate_cover_letter(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    from ai.resume_generator import generate_cover_letter_content
    try:
        content = await generate_cover_letter_content(lead, current_user.id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    if "error" in content:
        raise HTTPException(status_code=500, detail=content["error"])
    return content
