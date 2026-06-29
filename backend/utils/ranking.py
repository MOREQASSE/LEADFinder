import re
from typing import Optional

from utils.scoring import classify_lead


async def calculate_rank(budget_min: Optional[float], budget_max: Optional[float],
                          description: str, title: str, db=None,
                          low_max: float = 100, medium_max: float = 500, high_min: float = 1000) -> str:
    text = ((description or '') + " " + (title or '')).lower()

    # DB blacklist override (respects user-configured keywords)
    if db:
        blacklist = await extract_keywords("blacklist_keywords", db)
        for kw in blacklist:
            if kw in text:
                return "Spam"

    # Primary classification via scoring engine
    rank, _score = classify_lead(title, description, budget_min, budget_max)

    # DB boost keywords override (respects user-configured upgrades)
    if db and rank in ('Cold', 'Warm'):
        boost_keywords = await extract_keywords("boost_keywords", db)
        if any(kw in text for kw in boost_keywords):
            if rank == 'Cold':
                rank = 'Warm'
            elif rank == 'Warm':
                rank = 'Hot'

    return rank


async def extract_keywords(setting_key: str, db=None) -> list:
    """Extract keywords from database settings or use defaults."""
    defaults = {
        "boost_keywords": "urgent,asap,company",
        "blacklist_keywords": "scam,fake",
        "tag_keywords": "wordpress,shopify,ecommerce",
    }
    if db:
        from sqlalchemy import select
        from models import Setting
        result = await db.execute(select(Setting).where(Setting.key == setting_key))
        setting = result.scalar_one_or_none()
        if setting and setting.value:
            return [kw.strip() for kw in setting.value.split(",") if kw.strip()]
    default_str = defaults.get(setting_key, "")
    return [kw.strip() for kw in default_str.split(",") if kw.strip()]
