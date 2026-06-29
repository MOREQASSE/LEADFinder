import asyncio
import logging
import subprocess
import time
import os
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from models import Lead, ResumeData, Setting
from ai.browser_llm import get_browser_llm
from ai.direct_fill import fill_contact_page
from browser_use import Agent, BrowserSession

logger = logging.getLogger(__name__)

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
LINKEDIN_PROFILE_DIR = os.path.join(PROJECT_ROOT, "linkedin_profile", "profile")

AUTO_APPLY_MODE_KEY = "auto_apply_mode"
HEADLESS_KEY = "auto_apply_headless"

_CDP_PORT = 19222
_browser_process: subprocess.Popen | None = None


class AutoApplyResult(BaseModel):
    status: str = Field(description="One of: success, review, failed")
    message: str = Field(description="Human-readable summary")
    fields_filled: list[str] = Field(default_factory=list)
    steps_taken: list[str] = Field(default_factory=list)
    model_used: Optional[str] = Field(default=None)
    error: Optional[str] = Field(default=None)
    confirmation_url: Optional[str] = Field(default=None)


def _build_resume_context(resume: ResumeData) -> str:
    parts = []
    if resume.name: parts.append(f"Name: {resume.name}")
    if resume.email: parts.append(f"Email: {resume.email}")
    if resume.phone: parts.append(f"Phone: {resume.phone}")
    if resume.portfolio_url: parts.append(f"Portfolio: {resume.portfolio_url}")
    if resume.location: parts.append(f"Location: {resume.location}")
    if resume.timezone: parts.append(f"Timezone: {resume.timezone}")
    if resume.skills:
        skills = ', '.join(resume.skills) if isinstance(resume.skills, list) else resume.skills
        parts.append(f"Skills: {skills}")
    if resume.experience_years is not None: parts.append(f"Experience: {resume.experience_years} years")
    if resume.education: parts.append(f"Education: {resume.education}")
    if resume.languages:
        langs = ', '.join(resume.languages) if isinstance(resume.languages, list) else resume.languages
        parts.append(f"Languages: {langs}")
    if resume.pricing_min is not None and resume.pricing_max is not None:
        parts.append(f"Rate: ${resume.pricing_min} - ${resume.pricing_max}")
    if resume.voice_tone: parts.append(f"Tone: {resume.voice_tone}")
    if resume.availability: parts.append(f"Availability: {resume.availability}")
    if resume.past_projects: parts.append(f"Past projects: {resume.past_projects[:500]}")
    if resume.additional_notes: parts.append(f"Notes: {resume.additional_notes[:500]}")
    return "\n".join(parts) if parts else "No resume data available."


def _find_chrome() -> str:
    candidates = [
        os.path.expandvars(r"%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Chromium\Application\chrome.exe"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    try:
        import playwright
        p_dir = os.path.dirname(os.path.dirname(playwright.__file__))
        driver = os.path.join(p_dir, "driver", "chrome.exe")
        if os.path.isfile(driver):
            return driver
    except ImportError:
        pass
    raise RuntimeError("Chrome not found. Install Chrome or Playwright.")


def _launch_browser(headless: bool, initial_url: str = "") -> tuple[str, subprocess.Popen]:
    global _browser_process
    _kill_browser()
    chrome = _find_chrome()
    port = _CDP_PORT
    args = [
        chrome,
        f"--remote-debugging-port={port}",
        f"--user-data-dir={LINKEDIN_PROFILE_DIR}",
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--no-default-browser-check",
        "--new-window",
    ]
    if initial_url:
        args.append(initial_url)
    if headless:
        args.append("--headless=new")
    logger.info("Launching Chrome via subprocess on port %d", port)
    proc = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    _browser_process = proc
    cdp_url = f"http://127.0.0.1:{port}"
    for i in range(30):
        try:
            import httpx
            r = httpx.get(f"{cdp_url}/json/version", timeout=3)
            if r.status_code == 200:
                logger.info("Chrome ready on %s after %ds", cdp_url, i + 1)
                return cdp_url, proc
        except Exception:
            pass
        time.sleep(1)
    _kill_browser()
    raise RuntimeError(f"Chrome did not start on port {port} after 30s")


def _kill_browser():
    global _browser_process
    if _browser_process and _browser_process.poll() is None:
        try:
            _browser_process.terminate()
            _browser_process.wait(timeout=5)
        except Exception:
            _browser_process.kill()
            _browser_process.wait(timeout=3)
    _browser_process = None


async def _get_setting(db: AsyncSession, key: str, default: str = "") -> str:
    result = await db.execute(select(Setting).where(Setting.key == key))
    s = result.scalar_one_or_none()
    return s.value if s else default


async def _store_auto_apply_result(
    db: AsyncSession, lead_id: int, result_data: dict,
):
    from models import ApplicationLog

    log = ApplicationLog(
        lead_id=lead_id,
        status=result_data.get("status", "failed"),
        message=result_data.get("message", ""),
        fields_filled=result_data.get("fields_filled", []),
        steps_taken=result_data.get("steps_taken", []),
        model_used=result_data.get("model_used"),
        error=result_data.get("error"),
        confirmation_url=result_data.get("confirmation_url"),
    )
    db.add(log)
    if result_data.get("status") in ("success", "review"):
        new_status = "submitted" if result_data["status"] == "success" else "review"
        await db.execute(update(Lead).where(Lead.id == lead_id).values(application_status=new_status))
    await db.commit()


async def _run_agent_steps(task, primary_llm, fallback_llm, cdp_url, resume_context):
    session = BrowserSession(cdp_url=cdp_url, wait_between_actions=0.5)
    agent = Agent(
        task=task,
        llm=primary_llm,
        fallback_llm=fallback_llm,
        browser_session=session,
        directly_open_url=False,
        step_timeout=45,
        llm_timeout=30,
        use_vision=False,
        max_actions_per_step=5,
        max_failures=3,
        use_thinking=False,
        flash_mode=True,
        max_history_items=10,
        extend_system_message=f"You are a senior job applicant. Your details:\n{resume_context}",
    )
    return await agent.run(max_steps=40)


async def auto_apply_to_lead(
    lead: Lead, resume: ResumeData, db: AsyncSession, confirm: bool = False,
) -> AutoApplyResult:
    mode = await _get_setting(db, AUTO_APPLY_MODE_KEY, "review")
    headless_str = await _get_setting(db, HEADLESS_KEY, "false")
    headless = headless_str.lower() == "true"
    if confirm:
        mode = "autonomous"

    job_url = lead.url or ""
    if not job_url:
        return AutoApplyResult(status="failed", message="No job URL available.", error="missing_job_url")

    primary_llm, fallback_llm = await get_browser_llm(db)
    model_name = getattr(primary_llm, "model", "unknown")

    resume_context = _build_resume_context(resume)

    go_mode = (
        "After filling the form, STOP at the final review step. Do NOT click Submit."
        if mode == "review"
        else "Complete the entire application including clicking the final Submit button."
    )

    cdp_url, browser_proc = _launch_browser(headless, initial_url=job_url)

    # Phase 1: Try direct fill of contact page (zero AI)
    direct_ok = await fill_contact_page(cdp_url, resume)
    if direct_ok:
        logger.info("Phase 1 (direct fill) OK — contact page handled without AI")
        task = (
            f"Continue the Easy Apply application.\n"
            f"The contact info page (name, phone, location) has already been filled and submitted.\n\n"
            f"Candidate details:\n{resume_context}\n\n"
            f"Instructions:\n"
            f"1. Handle any remaining steps: uploads, additional questions, dropdowns.\n"
            f"2. Click Next/Continue for each step.\n"
            f"3. {go_mode}\n"
            f"4. If blocked, state the specific error."
        )
    else:
        logger.info("Phase 1 skipped — using full AI agent from start")
        task = (
            f"Apply to the job using Easy Apply.\n"
            f"Candidate details:\n{resume_context}\n\n"
            f"Instructions:\n"
            f"1. Click 'Easy Apply' (if not already clicked).\n"
            f"2. Answer all form fields accurately using the candidate details.\n"
            f"3. Click Next/Continue for each step.\n"
            f"4. {go_mode}\n"
            f"5. If blocked, state the specific error."
        )

    try:
        history = await _run_agent_steps(
            task,
            primary_llm,
            fallback_llm,
            cdp_url,
            resume_context,
        )
        final = (history.final_result() or "").strip().lower()

        if "status: success" in final or history.is_successful():
            status = "success"
        elif "status: review" in final:
            status = "review"
        else:
            status = "failed"

        result = AutoApplyResult(
            status=status,
            message=history.final_result() or "No result returned",
            steps_taken=[a.get("action", str(a)) for a in (history.model_actions() or [])],
            model_used=model_name,
        )
        logger.info("Auto-apply completed: status=%s", status)

    except asyncio.TimeoutError:
        result = AutoApplyResult(status="failed", message="Auto-apply timed out", error="timeout", model_used=model_name)
    except Exception as e:
        logger.exception("Auto-apply failed")
        result = AutoApplyResult(status="failed", message=f"Auto-apply failed: {str(e)}", error=str(e), model_used=model_name)
    finally:
        _kill_browser()

    await _store_auto_apply_result(db, lead.id, result.model_dump())
    return result
