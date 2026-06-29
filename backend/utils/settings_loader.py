"""Utility to load settings from database."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Setting


async def get_setting(db: AsyncSession, key: str, default: str = "") -> str:
    """Get a setting value from database by key."""
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalar_one_or_none()
    return setting.value if setting else default


async def get_all_settings(db: AsyncSession) -> dict:
    """Get all settings as a dictionary."""
    result = await db.execute(select(Setting))
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}
