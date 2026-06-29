import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Lead, ResumeData, Reply, Setting

from ai.fallback import query_with_fallback

PROMPT_KEYS = {
    "Google Maps": "prompt_maps_draft",
    "Reddit": "prompt_reddit_reply",
    "Craigslist": "prompt_craigslist_reply",
    "Upwork": "prompt_upwork_proposal",
    "Mastodon": "prompt_mastodon_reply",
    "Indeed": "prompt_indeed_apply",
    "HackerNews": "prompt_hackernews_reply",
    "Lionbridge": "prompt_lionbridge_apply",
}

PLATFORM_OPENERS = {
    "Google Maps": "Write a short, professional email to this local business owner offering web development services.",
    "Reddit": "Reply to this Reddit post offering web development services. Be conversational and helpful.",
    "Craigslist": "Reply to this Craigslist ad offering web development services. Be professional.",
    "Upwork": "Write a proposal for this Upwork job. Be professional and highlight relevant experience.",
    "Mastodon": "Reply to this Mastodon post offering web development help. Be friendly and casual.",
    "Indeed": "Apply for this job posting. Be professional.",
    "HackerNews": "Reply to this Hacker News post. Be technical and knowledgeable.",
    "Lionbridge": "Apply for this Lionbridge job posting. Be professional and highlight relevant experience.",
}

SEED_PROMPTS = {
    "prompt_maps_draft": "Write a short, professional email to this local business owner offering web development services.",
    "prompt_reddit_reply": "Reply to this Reddit post offering web development services. Be conversational and helpful.",
    "prompt_craigslist_reply": "Reply to this Craigslist ad offering web development services. Be professional.",
    "prompt_upwork_proposal": "Write a proposal for this Upwork job. Be professional and highlight relevant experience.",
    "prompt_mastodon_reply": "Reply to this Mastodon post offering web development help. Be friendly and casual.",
    "prompt_indeed_apply": "Apply for this job posting. Be professional.",
    "prompt_hackernews_reply": "Reply to this Hacker News post. Be technical and knowledgeable.",
    "prompt_lionbridge_apply": "Apply for this Lionbridge job posting. Be professional and highlight relevant experience.",
}


async def get_system_prompt(db: AsyncSession, user_id: int, platform: str) -> str | None:
    """Look up a custom system prompt from DB. Returns None to use seed fallback."""
    key = PROMPT_KEYS.get(platform)
    if not key:
        return None
    result = await db.execute(
        select(Setting).where(Setting.key == key)
    )
    setting = result.scalar_one_or_none()
    if setting and setting.value:
        return setting.value
    return None


def _inject_lead_data(template: str, lead: Lead, resume: ResumeData) -> str:
    """Replace {lead_name}, {platform}, {description}, {name}, {skills}, etc. in a custom prompt."""
    replacements = {
        "lead_name": lead.title.strip(),
        "platform": lead.platform,
        "description": (lead.description or "")[:500],
        "name": resume.name or "a web developer",
        "email": resume.email or "(not shared)",
        "phone": resume.phone or "(not shared)",
        "portfolio": resume.portfolio_url or "",
        "skills": ", ".join(resume.skills or ["Web Development"]),
        "industries": ", ".join(resume.industries or ["Various"]),
        "experience": f"{resume.experience_years:.0f} years" if resume.experience_years else "Experienced",
        "education": resume.education or "",
        "pricing": f"{resume.pricing_min or 'Negotiable'} - {resume.pricing_max or 'Negotiable'} MAD",
        "specialties": ", ".join(resume.website_types or ["Web Development"]),
        "tone": resume.voice_tone or "professional",
        "availability": resume.availability or "Flexible",
    }
    for key, value in replacements.items():
        template = template.replace("{" + key + "}", value)
    return template


def build_standard_prompt(lead: Lead, resume: ResumeData, platform: str) -> str:
    """Build the full standard prompt with lead info, resume data, and instructions."""
    opener = PLATFORM_OPENERS.get(platform, "Write a professional reply offering web development services.")

    lead_name = lead.title.strip()
    specialties = ", ".join(resume.website_types or ["Web Development"])
    skills = ", ".join(resume.skills or [])
    industries = ", ".join(resume.industries or [])

    prompt = f"""{opener}

LEAD INFORMATION:
- Business/Person Name: {lead_name}
- Lead Platform: {platform}
- Lead Description: {(lead.description or '')[:500]}

YOUR INFORMATION (USE THESE EXACTLY, DO NOT USE PLACEHOLDERS):
- Your Name: {resume.name or 'a web developer'}
- Email: {resume.email or '(not shared)'}
- Phone: {resume.phone or '(not shared)'}
- Portfolio: {resume.portfolio_url or ''}
- Skills: {skills or 'Web Development'}
- Industries: {industries or 'Various'}
- Experience: {f'{resume.experience_years:.0f} years' if resume.experience_years else 'Experienced'}
- Education: {resume.education or ''}
- Pricing Range: {resume.pricing_min or 'Negotiable'} - {resume.pricing_max or 'Negotiable'} MAD
- Specialties: {specialties}
- Your Tone: {resume.voice_tone or 'professional'}
- Availability: {resume.availability or 'Flexible'}
- Past Projects: {(resume.past_projects or '')[:300]}

INSTRUCTIONS:
1. Address the lead by name ({lead_name}) in the first sentence.
2. Use my real name ({resume.name or 'a web developer'}) — NEVER use "[Your Name]" or any placeholder.
3. If I have a portfolio URL, include it. If not, don't mention it.
4. Mention my pricing range ({resume.pricing_min or 'Negotiable'} - {resume.pricing_max or 'Negotiable'} MAD).
5. Keep it under 150 words.
6. Sound natural, not like a generic template.
7. CRITICAL: Do NOT use any square brackets, placeholders, or filler text like "[Your Name]" or "[Your Company]"."""
    return prompt


def _clean_placeholders(text: str, resume: ResumeData) -> str:
    """Replace any remaining placeholder patterns with actual data."""
    text = re.sub(r'\[Your Name\]|\[Your Company\]|\[your name\]|\[name\]', resume.name or 'a web developer', text)
    text = re.sub(r'\[Your Portfolio\]|\[portfolio\]|\[your portfolio\]', resume.portfolio_url or '', text)
    text = re.sub(r'\[Your Pricing\]|\[pricing\]|\[your rates\]', f"{resume.pricing_min or 'Negotiable'} - {resume.pricing_max or 'Negotiable'} MAD", text)
    text = re.sub(r'\[Your Website\]|\[website\]|\[your website\]', resume.portfolio_url or 'my portfolio', text)
    text = re.sub(r'\[email address\]|\[your email\]|\[email\]', '', text)
    text = re.sub(r'\[your company\]|\[company name\]', '', text)
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r' +', ' ', text).strip()
    return text


async def generate_draft_reply(lead: Lead, user_id: int, db: AsyncSession) -> Reply:
    resume_result = await db.execute(select(ResumeData).where(ResumeData.user_id == user_id).limit(1))
    resume = resume_result.scalars().first()
    if not resume:
        reply = Reply(lead_id=lead.id, user_id=user_id, status="draft", draft_content="Please upload resume data first in Settings.")
        db.add(reply)
        await db.commit()
        await db.refresh(reply)
        return reply

    custom_prompt = await get_system_prompt(db, user_id, lead.platform)
    if custom_prompt:
        custom_prompt = _inject_lead_data(custom_prompt, lead, resume)
        prompt = custom_prompt
    else:
        prompt = build_standard_prompt(lead, resume, lead.platform)

    try:
        draft_text = await query_with_fallback(prompt, db)
    except Exception as e:
        draft_text = f"[Draft generation failed: {str(e)}]"

    draft_text = _clean_placeholders(draft_text, resume)
    reply = Reply(lead_id=lead.id, user_id=user_id, status="draft", draft_content=draft_text)
    db.add(reply)
    await db.commit()
    await db.refresh(reply)
    return reply
