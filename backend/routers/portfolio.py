from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import PortfolioProject, ResumeData, User
from schemas import PortfolioProjectOut, PortfolioProjectCreate, PortfolioProjectUpdate
from auth import get_current_user
from utils.ai_caller import call_ai

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

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

    try:
        response = await call_ai(prompt, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI extraction failed: {str(e)}")

    import json
    import re

    json_match = re.search(r"\[.*\]", response, re.DOTALL)
    if not json_match:
        raise HTTPException(status_code=500, detail="AI did not return valid JSON")

    try:
        projects_data = json.loads(json_match.group(0))
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI output as JSON")

    created = []
    for p in projects_data:
        if not p.get("title"):
            continue
        project = PortfolioProject(
            user_id=current_user.id,
            title=p["title"],
            description=p.get("description"),
            url=p.get("url"),
            tech_stack=p.get("tech_stack", []),
            year=p.get("year"),
            client_name=p.get("client_name"),
        )
        db.add(project)
        created.append(project)

    await db.commit()
    for c in created:
        await db.refresh(c)
    return created
