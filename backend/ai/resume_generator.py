import json
import logging
import re
from sqlalchemy import select
from models import ResumeData, PortfolioProject, GeneratedDocument
from utils.ai_caller import call_ai

logger = logging.getLogger(__name__)

_RESUME_SYSTEM_PROMPT = """You are an expert ATS-optimized resume writer. Your output MUST be ONLY valid JSON with NO markdown, NO code fences, NO extra text, NO commentary.

RULES — FOLLOW EXACTLY:
1. Output ONLY raw JSON. No ```json, no ```, no "Here is your JSON:", no explanation.
2. Every key MUST be present in every response. No null values — use empty string "" or empty array [].
3. Use standard ATS section headers exactly as specified.
4. Skills MUST be comma-separated keywords from the job description + candidate's profile.
5. Experience bullets MUST start with action verbs and include quantified achievements where possible.
6. Keep professional_summary to 2-3 concise sentences.

REQUIRED JSON STRUCTURE (do not change key names, do not omit keys):
{
  "professional_summary": "",
  "skills": [],
  "professional_experience": [
    {"job_title": "", "company": "", "dates": "", "bullets": []}
  ],
  "projects": [
    {"name": "", "description": "", "technologies": []}
  ],
  "education": "",
  "certifications": []
}

Your entire response must be parseable by json.loads() in one pass. If you include anything outside the JSON, the system will reject it."""

_COVER_LETTER_SYSTEM_PROMPT = """You output ONLY valid JSON. No words before or after.

RULES:
1. Start your response with exactly: {
2. End your response with exactly: }
3. No markdown, no code fences, no explanation, no commentary.
4. Every key required. Empty string "" for text, empty array [] for lists.
5. Address the company and role specifically from the job description.
6. body_paragraphs must be 2-3 paragraphs, each 3-5 sentences.
7. Never include the candidate's name or contact info — those are added by the app.
8. Never include meta-commentary, never explain what you're doing, never describe the output format.

REQUIRED JSON:
{
  "salutation": "",
  "opening_paragraph": "",
  "body_paragraphs": [],
  "closing_paragraph": ""
}

Remember: START with { and END with }. Nothing else before or after."""


def _build_context_block(lead, resume_data, portfolio_projects) -> str:
    """Build the context portion of the prompt from lead + profile data."""
    lines = ["=== JOB DETAILS ==="]
    lines.append(f"Title: {lead.title or ''}")
    lines.append(f"Company: {lead.author or ''}")
    lines.append(f"Platform: {lead.platform or ''}")
    lines.append(f"Budget: {lead.budget_raw or ''}")
    lines.append(f"Description: {(lead.description or '')[:3000]}")

    if resume_data:
        lines.append("\n=== CANDIDATE PROFILE ===")
        lines.append(f"Skills: {', '.join(resume_data.skills or [])}")
        lines.append(f"Experience Years: {resume_data.experience_years or ''}")
        lines.append(f"Education: {resume_data.education or ''}")
        lines.append(f"Certifications: {', '.join(resume_data.certifications or [])}")
        lines.append(f"Languages: {', '.join(resume_data.languages or [])}")
        lines.append(f"Industries: {', '.join(resume_data.industries or [])}")
        lines.append(f"Past Projects (free text): {(resume_data.past_projects or '')[:1500]}")
        lines.append(f"Voice Tone: {resume_data.voice_tone or 'professional'}")
        lines.append(f"Availability: {resume_data.availability or ''}")
        lines.append(f"Additional Notes: {(resume_data.additional_notes or '')[:500]}")

    if portfolio_projects:
        lines.append("\n=== PORTFOLIO PROJECTS ===")
        for p in portfolio_projects:
            tech = ", ".join(p.tech_stack or []) if hasattr(p, "tech_stack") else ""
            lines.append(f"- {p.title or ''}: {p.description or ''} [{tech}]")

    return "\n".join(lines)


async def generate_resume_content(lead, user_id: int, db) -> dict:
    """Generate ATS-optimized resume content via AI, save to DB, return content dict."""
    stmt = select(ResumeData).where(ResumeData.user_id == user_id)
    result = await db.execute(stmt)
    resume_data = result.scalars().first()

    stmt = select(PortfolioProject).where(PortfolioProject.user_id == user_id)
    result = await db.execute(stmt)
    portfolio_projects = result.scalars().all()

    context = _build_context_block(lead, resume_data, portfolio_projects)
    prompt = f"""{_RESUME_SYSTEM_PROMPT}

{context}

Generate the ATS-optimized resume JSON now. Start your response with [OBJOPEN] and do not include any text before or after the JSON object."""

    raw = None
    try:
        raw = await call_ai(prompt, db, system_prompt="", max_tokens=1500)
    except Exception as e:
        logger.error("call_ai failed for resume: %s", str(e))
        return {"error": f"AI call failed: {str(e)}", "raw": str(e)}
    content = _extract_json(raw)

    if not content:
        return {"error": "AI returned invalid JSON", "raw": raw}

    await _upsert_document(db, user_id, lead.id, "resume", content)
    return content


async def generate_cover_letter_content(lead, user_id: int, db) -> dict:
    """Generate cover letter content via AI, save to DB, return content dict."""
    stmt = select(ResumeData).where(ResumeData.user_id == user_id)
    result = await db.execute(stmt)
    resume_data = result.scalars().first()

    stmt = select(PortfolioProject).where(PortfolioProject.user_id == user_id)
    result = await db.execute(stmt)
    portfolio_projects = result.scalars().all()

    context = _build_context_block(lead, resume_data, portfolio_projects)
    prompt = f"""{_COVER_LETTER_SYSTEM_PROMPT}

{context}

Generate the cover letter JSON now. Start your response with [OBJOPEN] and do not include any text before or after the JSON object."""

    raw = None
    try:
        raw = await call_ai(prompt, db, system_prompt="", max_tokens=1200)
    except Exception as e:
        logger.error("call_ai failed for cover letter: %s", str(e))
        return {"error": f"AI call failed: {str(e)}", "raw": str(e)}
    content = _extract_json(raw)

    if not content:
        return {"error": "AI returned invalid JSON", "raw": raw}

    await _upsert_document(db, user_id, lead.id, "cover_letter", content)
    return content


def _extract_json(raw: str) -> dict | None:
    """Extract and parse JSON from AI response, stripping any markdown fences."""
    if not raw:
        return None
    text = raw.strip()
    # Replace [OBJOPEN] placeholder used in prompts with literal { to avoid f-string escaping
    text = text.replace("[OBJOPEN]", "{")
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                logger.error("JSON parse failed even with regex extract. Raw text (first 500): %s", text[:500])
                return None
        logger.error("No JSON object found in AI response. Raw text (first 500): %s", text[:500])
        return None


async def _upsert_document(db, user_id: int, lead_id: int, doc_type: str, content: dict):
    """Insert or update a GeneratedDocument record."""
    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.lead_id == lead_id,
            GeneratedDocument.user_id == user_id,
            GeneratedDocument.doc_type == doc_type,
        )
    )
    existing = result.scalars().first()
    content_str = json.dumps(content, ensure_ascii=False)
    if existing:
        existing.content_json = content_str
    else:
        doc = GeneratedDocument(
            user_id=user_id, lead_id=lead_id,
            doc_type=doc_type, content_json=content_str,
        )
        db.add(doc)
    await db.commit()
