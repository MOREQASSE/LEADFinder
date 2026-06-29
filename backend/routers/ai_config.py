import os
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from database import get_db
from models import AIConfig, ResumeData, User
from schemas import AIConfigOut, AIConfigCreate, ResumeDataOut, ResumeUpload, ResumeUpdate
from auth import get_current_user

UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "resumes"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.get("/config", response_model=list[AIConfigOut])
async def list_ai_configs(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(AIConfig))
    return result.scalars().all()

@router.post("/config", response_model=AIConfigOut)
async def create_ai_config(data: AIConfigCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    config = AIConfig(**data.model_dump())
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config

@router.delete("/config/{config_id}")
async def delete_ai_config(config_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(AIConfig).where(AIConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    await db.delete(config)
    await db.commit()
    return {"status": "deleted"}

@router.post("/config/{config_id}/primary")
async def set_primary_ai_config(config_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(AIConfig).where(AIConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    # Set all configs is_primary = False
    await db.execute(update(AIConfig).values(is_primary=False))
    
    # Set this one to True
    config.is_primary = True
    await db.commit()
    await db.refresh(config)
    return {"status": "ok", "primary_id": config.id}

@router.get("/resume", response_model=ResumeDataOut)
async def get_resume(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ResumeData).where(ResumeData.user_id == current_user.id).limit(1))
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=404, detail="No resume data found")
    return resume

@router.post("/resume/upload-file", response_model=ResumeDataOut)
async def upload_resume_file(file: UploadFile = File(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from ai.resume_parser import parse_resume
    from utils.file_parser import extract_text_from_file
    content = await file.read()
    raw_text = await extract_text_from_file(content, file.filename)

    file_path = None
    if file.filename:
        safe_name = f"resume_{current_user.id}_{file.filename}"
        dest = UPLOADS_DIR / safe_name
        with open(dest, "wb") as f:
            f.write(content)
        file_path = str(dest)

    parsed = await parse_resume(raw_text, db)
    result = await db.execute(select(ResumeData).where(ResumeData.user_id == current_user.id))
    existing = result.scalar_one_or_none()
    if existing:
        for key, value in parsed.items():
            setattr(existing, key, value)
        existing.raw_text = raw_text
        existing.resume_file_path = file_path
        resume = existing
    else:
        resume_data = {**parsed, "resume_file_path": file_path}
        resume = ResumeData(user_id=current_user.id, raw_text=raw_text, **resume_data)
        db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume

@router.post("/resume", response_model=ResumeDataOut)
async def upload_resume(data: ResumeUpload, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from ai.resume_parser import parse_resume
    parsed = await parse_resume(data.raw_text, db)
    result = await db.execute(select(ResumeData).where(ResumeData.user_id == current_user.id))
    existing = result.scalar_one_or_none()
    if existing:
        for key, value in parsed.items():
            setattr(existing, key, value)
        existing.raw_text = data.raw_text
        resume = existing
    else:
        resume = ResumeData(user_id=current_user.id, raw_text=data.raw_text, **parsed)
        db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume

@router.put("/resume", response_model=ResumeDataOut)
async def update_resume(data: ResumeUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ResumeData).where(ResumeData.user_id == current_user.id).limit(1))
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=404, detail="No resume data found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(resume, key, value)
    await db.commit()
    await db.refresh(resume)
    return resume
