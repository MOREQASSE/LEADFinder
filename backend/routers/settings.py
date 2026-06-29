from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from models import Setting, User
from schemas import SettingOut, SettingUpdate
from auth import get_current_user

class BulkSettingsUpdate(BaseModel):
    settings: dict[str, str]

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("/", response_model=list[SettingOut])
async def list_settings(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Setting))
    return result.scalars().all()

@router.get("/{key}", response_model=SettingOut)
async def get_setting(key: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting

@router.put("/{key}", response_model=SettingOut)
async def update_setting(key: str, data: SettingUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        setting = Setting(key=key, value=data.value)
        db.add(setting)
    else:
        setting.value = data.value
    await db.commit()
    await db.refresh(setting)
    return setting

@router.post("/bulk-update")
async def bulk_update(data: BulkSettingsUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = 0
    for key, value in data.settings.items():
        result = await db.execute(select(Setting).where(Setting.key == key))
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = value
        else:
            setting = Setting(key=key, value=value)
            db.add(setting)
        count += 1
    await db.commit()
    return {"status": "ok", "updated": count}

@router.get("/defaults/init")
async def init_defaults(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    defaults = {
        "budget_low_max": "100",
        "budget_medium_max": "500",
        "budget_high_min": "1000",
        "rank_low": "Cold",
        "rank_medium": "Warm",
        "rank_high": "Hot",
        "boost_keywords": "urgent,asap,company",
        "blacklist_keywords": "scam,fake",
        "tag_keywords": "wordpress,shopify,ecommerce",
        "rate_limit_reddit_daily": "20",
        "rate_limit_craigslist_daily": "10",
        "rate_limit_upwork_daily": "15",
        "rate_limit_mastodon_daily": "30",
        "rate_limit_indeed_daily": "10",
        "rate_limit_hackernews_daily": "5",
        "rate_limit_lionbridge_daily": "15",
        "upwork_rss_url": "",
        "indeed_rss_url": "",
        "craigslist_rss_url": "",
        "craigslist_site": "sfbay",
        "craigslist_area": "",
        "craigslist_sites": "",
        "craigslist_use_us_hubs": "0",
        "craigslist_max_sites": "10",
        "craigslist_max_pages": "2",
        "craigslist_parallel_tabs": "4",
        "craigslist_post_goto_ms": "3200",
        "adzuna_api_id": "",
        "adzuna_api_key": "",
        "reddit_subreddits": "",
        "country": "United States",
        "auto_send_email": "1",
        "email_rate_limit_hour": "50",
        "email_rate_limit_daily": "400",
    }
    for key, value in defaults.items():
        result = await db.execute(select(Setting).where(Setting.key == key))
        if not result.scalar_one_or_none():
            db.add(Setting(key=key, value=value))
    await db.commit()
    return {"status": "ok", "defaults_initialized": len(defaults)}
