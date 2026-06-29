from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import Reply

DAILY_LIMITS = {
    "Reddit": 20, "Craigslist": 10, "Upwork": 15,
    "Mastodon": 30, "Indeed": 10, "HackerNews": 5,
    "Lionbridge": 15,
}

HOURLY_LIMITS = {
    "Reddit": 3, "Craigslist": 1, "Upwork": 2,
    "Mastodon": 5, "Indeed": 2, "HackerNews": 1,
    "Lionbridge": 2,
}

async def check_rate_limit(platform: str, lead_id: int, db: AsyncSession) -> tuple[bool, str]:
    daily = DAILY_LIMITS.get(platform, 10)
    hourly = HOURLY_LIMITS.get(platform, 2)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    hour_ago = now - timedelta(hours=1)
    daily_count = await db.execute(
        select(func.count(Reply.id)).where(Reply.lead_id == lead_id, Reply.sent_at >= today_start)
    )
    if daily_count.scalar() >= daily:
        return False, f"Daily limit ({daily}) reached for {platform}"
    hourly_count = await db.execute(
        select(func.count(Reply.id)).where(Reply.lead_id == lead_id, Reply.sent_at >= hour_ago)
    )
    if hourly_count.scalar() >= hourly:
        return False, f"Hourly limit ({hourly}) reached for {platform}"
    return True, ""
