from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Notification, User, Lead
from config import settings

async def create_notification(user_id: int, title: str, message: str, lead_id: int, db: AsyncSession):
    notif = Notification(user_id=user_id, title=title, message=message, lead_id=lead_id)
    db.add(notif)
    await db.commit()

async def notify_new_lead(lead: Lead, db: AsyncSession):
    result = await db.execute(select(User))
    users = result.scalars().all()
    for user in users:
        await create_notification(
            user_id=user.id,
            title=f"New {lead.platform} Lead",
            message=f"New lead: {lead.title[:100]}",
            lead_id=lead.id,
            db=db,
        )
