from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import Reply, Lead, User
from schemas import ReplyOut, ReplyGenerate, ReplySend
from auth import get_current_user

router = APIRouter(prefix="/api/replies", tags=["replies"])

@router.get("/", response_model=list[ReplyOut])
async def list_replies(lead_id: int = None, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Reply).order_by(Reply.created_at.desc())
    if lead_id:
        query = query.where(Reply.lead_id == lead_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{reply_id}", response_model=ReplyOut)
async def get_reply(reply_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Reply).where(Reply.id == reply_id))
    reply = result.scalar_one_or_none()
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    return reply

@router.post("/generate", response_model=ReplyOut)
async def generate_draft(data: ReplyGenerate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead_result = await db.execute(select(Lead).where(Lead.id == data.lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    from ai.draft_generator import generate_draft_reply
    draft = await generate_draft_reply(lead, current_user.id, db)
    return draft

@router.post("/send", response_model=ReplyOut)
async def send_reply(data: ReplySend, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Reply).where(Reply.id == data.reply_id))
    reply = result.scalar_one_or_none()
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    reply.sent_content = data.content or reply.draft_content
    reply.status = "sent"
    reply.sent_at = func.now()
    await db.commit()
    await db.refresh(reply)
    lead_result = await db.execute(select(Lead).where(Lead.id == reply.lead_id))
    lead = lead_result.scalar_one()
    lead.status = "replied"
    await db.commit()
    return reply

@router.post("/{reply_id}/retry", response_model=ReplyOut)
async def retry_reply(reply_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Reply).where(Reply.id == reply_id))
    reply = result.scalar_one_or_none()
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    reply.retry_count += 1
    reply.status = "pending"
    await db.commit()
    await db.refresh(reply)
    return reply
