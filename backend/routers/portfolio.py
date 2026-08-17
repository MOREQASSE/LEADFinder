from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import PortfolioProject, ResumeData, User
from schemas import PortfolioProjectOut, PortfolioProjectCreate, PortfolioProjectUpdate
from auth import get_current_user
from utils.ai_caller import call_ai
from ai.resume_parser import _extract_past_projects, extract_portfolio_projects
import json
import logging
import re

logger = logging.getLogger("routers.portfolio")

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


def _parse_ai_projects(response: str):
    text = re.sub(r"```(?:json)?", "", response)
    json_match = re.search(r"\[.*\]", text, re.DOTALL)
    if not json_match:
        json_match = re.search(r"\{.*\}", text, re.DOTALL)
    if not json_match:
        return None
    try:
        parsed = json.loads(json_match.group(0))
    except json.JSONDecodeError:
        return None
    if isinstance(parsed, list):
        return [p for p in parsed if isinstance(p, dict) and p.get("title")]
    if isinstance(parsed, dict):
        for key in ("projects", "items", "entries", "data"):
            val = parsed.get(key)
            if isinstance(val, list):
                return [p for p in val if isinstance(p, dict) and p.get("title")]
    return None

@router.get("/", response_model=list[PortfolioProjectOut])
async def list_projects(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(PortfolioProject).where(PortfolioProject.user_id == current_user.id).order_by(PortfolioProject.year.desc().nullslast(), PortfolioProject.created_at.desc())
    )
    return result.scalars().all()

@router.post("/", response_model=PortfolioProjectOut)
async def create_project(data: PortfolioProjectCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = PortfolioProject(user_id=current_user.id, **data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project

@router.put("/{project_id}", response_model=PortfolioProjectOut)
async def update_project(project_id: int, data: PortfolioProjectUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(PortfolioProject).where(PortfolioProject.id == project_id, PortfolioProject.user_id == current_user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(PortfolioProject).where(PortfolioProject.id == project_id, PortfolioProject.user_id == current_user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()
    return {"status": "deleted"}

@router.post("/extract", response_model=list[PortfolioProjectOut])
async def extract_projects_from_resume(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ResumeData).where(ResumeData.user_id == current_user.id).limit(1))
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=400, detail="No resume data found. Upload your resume first.")

    source_text = ""
    if resume.past_projects:
        source_text += f"Past Projects:\n{resume.past_projects}\n\n"
    if resume.raw_text:
        source_text += f"Full Resume:\n{resume.raw_text[:3000]}"

    if not source_text.strip():
        raise HTTPException(status_code=400, detail="No past projects or resume text found.")

    prompt = f"""Extract project entries from the following text. Return a JSON array of objects with these exact keys:
- title (string, required)
- description (string)
- url (string)
- tech_stack (array of strings)
- year (integer)
- client_name (string)

Text:
{source_text[:5000]}

Return ONLY the JSON array, no other text."""

    entries = None
    try:
        response = await call_ai(prompt, db, max_tokens=1500)
        entries = _parse_ai_projects(response)
        logger.info("portfolio/extract: AI returned %d project(s)", len(entries) if entries else 0)
    except Exception as e:
        logger.warning("portfolio/extract: AI path failed: %s", str(e)[:200])

    if not entries:
        logger.warning("portfolio/extract: falling back to local regex extraction")
        local_text = resume.past_projects or _extract_past_projects(resume.raw_text or "")
        entries = extract_portfolio_projects(local_text)

    if not entries:
        raise HTTPException(status_code=404, detail="No projects could be extracted from your resume.")

    existing_result = await db.execute(
        select(PortfolioProject.title).where(PortfolioProject.user_id == current_user.id)
    )
    existing_titles = {t.lower() for t in existing_result.scalars().all() if t}

    created = []
    for p in entries:
        title = str(p.get("title") or "").strip()[:120]
        if not title or title.lower() in existing_titles:
            continue
        year = p.get("year")
        try:
            year = int(year) if year is not None else None
        except (TypeError, ValueError):
            year = None
        tech_stack = p.get("tech_stack") or []
        if not isinstance(tech_stack, list):
            tech_stack = []
        project = PortfolioProject(
            user_id=current_user.id,
            title=title,
            description=(p.get("description") or "")[:2000],
            url=p.get("url") or None,
            tech_stack=[str(t)[:40] for t in tech_stack],
            year=year,
            client_name=(p.get("client_name") or "")[:100] or None,
        )
        db.add(project)
        existing_titles.add(title.lower())
        created.append(project)

    await db.commit()
    for c in created:
        await db.refresh(c)
    return created
