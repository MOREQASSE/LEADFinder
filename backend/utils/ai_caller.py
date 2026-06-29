from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import AIConfig
from ai.fallback import query_with_fallback

async def call_ai(prompt: str, db: AsyncSession, system_prompt: str = None, max_tokens: int = 500) -> str:
    full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
    return await query_with_fallback(full_prompt, db, max_tokens=max_tokens)

async def get_primary_model_name(db: AsyncSession) -> str:
    result = await db.execute(select(AIConfig).where(AIConfig.is_primary == True).limit(1))
    config = result.scalars().first()
    return config.model if config else "unknown"
