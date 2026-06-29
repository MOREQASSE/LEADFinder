import asyncio
import json
import threading
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from database import get_db
from models import Lead, User
from schemas import LeadOut, LeadUpdate
from auth import get_current_user
from pydantic import BaseModel
from typing import Optional, Dict

# Scrapers
from scrapers.reddit import RedditScraper
from scrapers.craigslist import CraigslistScraper
from scrapers.upwork import UpworkScraper
from scrapers.mastodon import MastodonScraper
from scrapers.indeed import IndeedScraper
from scrapers.hackernews import HackerNewsScraper
from scrapers.google_alerts import GoogleAlertsScraper
from scrapers.google_maps import GoogleMapsScraper, _active_browsers
from scrapers.linkedin import LinkedInScraper
from scrapers.lionbridge import LionbridgeScraper
from utils.ranking import calculate_rank
from utils.currency import convert_to_mad
from notifications import notify_new_lead

router = APIRouter(prefix="/api/leads", tags=["leads"])

_active_scrapes: Dict[int, threading.Event] = {}

SCRAPERS = [
    (RedditScraper, "Reddit"),
    (CraigslistScraper, "Craigslist"),
    (UpworkScraper, "Upwork"),
    (MastodonScraper, "Mastodon"),
    (IndeedScraper, "Indeed"),
    (HackerNewsScraper, "HackerNews"),
    (GoogleAlertsScraper, "Google Alerts"),
    (LinkedInScraper, "LinkedIn"),
    (LionbridgeScraper, "Lionbridge"),
]

class ScrapeRequest(BaseModel):
    platforms: list[str] = []

class MapsScrapeRequest(BaseModel):
    business_type: str
    city: str
    country: str

class ScrapeResult(BaseModel):
    platform: str
    leads_found: int
    new_leads: int
    error: Optional[str] = None

class ScrapeResponse(BaseModel):
    results: list[ScrapeResult]
    total_new: int

@router.get("/", response_model=list[LeadOut])
async def list_leads(
    platform: str = None,
    rank: str = None,
    status: str = None,
    keyword: str = None,
    easy_apply: bool = None,
    application_status: str = None,
    sort: str = "desc",
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = Lead.created_at.desc() if sort == "desc" else Lead.created_at.asc()
    query = select(Lead).order_by(order)
    if platform:
        query = query.where(Lead.platform == platform)
    if rank:
        query = query.where(Lead.rank == rank)
    if status:
        query = query.where(Lead.status == status)
    if keyword:
        query = query.where(
            Lead.title.ilike(f"%{keyword}%") | Lead.description.ilike(f"%{keyword}%")
        )
    if easy_apply is not None:
        query = query.where(Lead.has_easy_apply == easy_apply)
    if application_status:
        query = query.where(Lead.application_status == application_status)
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{lead_id}", response_model=LeadOut)
async def get_lead(lead_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.delete("/{lead_id}")
async def delete_lead(lead_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.delete(lead)
    await db.commit()
    return {"status": "deleted"}


class BulkDeleteRequest(BaseModel):
    ids: list[int]


@router.post("/delete-bulk")
async def bulk_delete_by_ids(
    req: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not req.ids:
        return {"status": "deleted", "count": 0}
    result = await db.execute(select(Lead).where(Lead.id.in_(req.ids)))
    leads = result.scalars().all()
    count = len(leads)
    for lead in leads:
        await db.delete(lead)
    await db.commit()
    return {"status": "deleted", "count": count}


@router.delete("/")
async def clear_leads(
    platform: str = None,
    rank: str = None,
    status: str = None,
    keyword: str = None,
    easy_apply: bool = None,
    application_status: str = None,
    city: str = None,
    biz_type: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Lead)
    if platform:
        query = query.where(Lead.platform == platform)
    if rank:
        query = query.where(Lead.rank == rank)
    if status:
        query = query.where(Lead.status == status)
    if city:
        query = query.where(Lead.description.ilike(f"%Location: {city}%"))
    if biz_type:
        query = query.where(Lead.description.ilike(f"%Type: {biz_type}%"))
    if keyword:
        query = query.where(
            Lead.title.ilike(f"%{keyword}%") | Lead.description.ilike(f"%{keyword}%")
        )
    if easy_apply is not None:
        query = query.where(Lead.has_easy_apply == easy_apply)
    if application_status:
        query = query.where(Lead.application_status == application_status)
    result = await db.execute(query)
    leads = result.scalars().all()
    count = len(leads)
    for lead in leads:
        await db.delete(lead)
    await db.commit()
    return {"status": "deleted", "count": count}

@router.patch("/{lead_id}", response_model=LeadOut)
async def update_lead(lead_id: int, data: LeadUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if data.status is not None:
        lead.status = data.status
    if data.rank is not None:
        lead.rank = data.rank
    if data.assigned_to is not None:
        lead.assigned_to = data.assigned_to
    if data.tags is not None:
        lead.tags = data.tags
    if data.description is not None:
        lead.description = data.description
        
    await db.commit()
    await db.refresh(lead)
    return lead

@router.get("/stats/overview")
async def lead_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = await db.execute(select(func.count(Lead.id)))
    hot = await db.execute(select(func.count(Lead.id)).where(Lead.rank == "Hot"))
    warm = await db.execute(select(func.count(Lead.id)).where(Lead.rank == "Warm"))
    cold = await db.execute(select(func.count(Lead.id)).where(Lead.rank == "Cold"))
    return {
        "total": total.scalar(),
        "hot": hot.scalar(),
        "warm": warm.scalar(),
        "cold": cold.scalar()
    }

@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_leads(
    request: ScrapeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger scraping for selected platforms."""
    results = []
    total_new = 0
    
    # Filter scrapers based on request
    scrapers_to_run = SCRAPERS
    if request.platforms:
        scrapers_to_run = [(cls, name) for cls, name in SCRAPERS if name in request.platforms]
    
    for scraper_class, platform_name in scrapers_to_run:
        try:
            scraper = scraper_class(db)
            leads = await scraper.scrape()
            
            new_leads = []
            for sl in leads:
                # Check for duplicates
                result = await db.execute(select(Lead).where(Lead.url == sl.url))
                if result.scalar_one_or_none():
                    continue
                
                # Convert currency
                mad_amount = None
                if sl.budget_min is not None:
                    mad_amount = await convert_to_mad(sl.budget_min, sl.budget_currency)
                
                # Calculate rank
                rank = await calculate_rank(sl.budget_min, sl.budget_max, sl.description, sl.title, db)
                
                lead = Lead(
                    title=sl.title, platform=sl.platform, url=sl.url,
                    timestamp=sl.timestamp, author=sl.author,
                    budget_raw=sl.budget_raw, budget_min=sl.budget_min,
                    budget_max=sl.budget_max, budget_currency=sl.budget_currency,
                    budget_mad=mad_amount, description=sl.description,
                    rank=rank, status="new",
                    has_easy_apply="linkedin.com/jobs/" in (sl.url or ""),
                )
                db.add(lead)
                new_leads.append(lead)
            
            if new_leads:
                await db.commit()
                for lead in new_leads:
                    await notify_new_lead(lead, db)
            
            results.append(ScrapeResult(
                platform=platform_name,
                leads_found=len(leads),
                new_leads=len(new_leads),
                error=None
            ))
            total_new += len(new_leads)
            
        except Exception as e:
            results.append(ScrapeResult(
                platform=platform_name,
                leads_found=0,
                new_leads=0,
                error=str(e)
            ))
    
    return ScrapeResponse(results=results, total_new=total_new)

@router.post("/reclassify")
async def reclassify_leads(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from utils.scoring import classify_lead
    result = await db.execute(select(Lead).where(Lead.rank == 'Unknown'))
    leads = result.scalars().all()
    if not leads:
        return {"status": "ok", "total": 0, "updated": 0}
    for lead in leads:
        rank, _score = classify_lead(
            lead.title or '',
            lead.description or '',
            lead.budget_min,
            lead.budget_max,
        )
        if rank != lead.rank:
            lead.rank = rank
    await db.commit()
    updated = len(leads)
    return {"status": "ok", "total": updated, "updated": updated}

@router.get("/scrape-maps/stream")
async def scrape_maps_stream(
    business_type: str,
    city: str,
    country: str,
    token: str = None,
    db: AsyncSession = Depends(get_db)
):
    # SSE via EventSource cannot set custom auth headers, so accept token via query param
    from auth import get_user_from_token
    current_user = await get_user_from_token(token, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Invalid token")
    """Stream real-time progress of Google Maps scraping via SSE."""
    loop = asyncio.get_event_loop()
    queue = asyncio.Queue()
    stop_event = threading.Event()
    _active_scrapes[current_user.id] = stop_event

    def progress(name, status, index, total):
        loop.call_soon_threadsafe(queue.put_nowait, {
            "name": name,
            "status": status,
            "index": index,
            "total": total,
        })

    async def event_generator():
        try:
            scraper = GoogleMapsScraper(db)
            scrape_task = asyncio.create_task(
                scraper.scrape_businesses(business_type, city, country, on_progress=progress, stop_event=stop_event, user_id=current_user.id)
            )

            while True:
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=0.5)
                    yield f"data: {json.dumps(msg)}\n\n"
                except asyncio.TimeoutError:
                    if scrape_task.done():
                        break
                    yield "data: {}\n\n"  # keepalive

            leads = scrape_task.result()
            # Dedup and save to DB
            new_count = 0
            for sl in leads:
                result = await db.execute(
                    select(Lead).where(
                        (Lead.url == sl.url) |
                        ((Lead.title == sl.title) & (Lead.platform == "Google Maps"))
                    )
                )
                if result.scalar_one_or_none():
                    continue
                lead = Lead(
                    title=sl.title, platform=sl.platform, url=sl.url,
                    timestamp=sl.timestamp, author=sl.author,
                    description=sl.description, rank="Warm", status="new",
                    tags=["maps", city.lower(), country.lower(), business_type.lower()],
                    has_easy_apply="linkedin.com/jobs/" in (sl.url or ""),
                )
                db.add(lead)
                new_count += 1

            if new_count:
                await db.commit()

            was_stopped = stop_event.is_set()
            yield f"data: {json.dumps({'status': 'stopped' if was_stopped else 'complete', 'leads_found': len(leads), 'new_leads': new_count})}\n\n"
        finally:
            _active_scrapes.pop(current_user.id, None)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/scrape-maps/stop")
async def stop_maps_scrape(
    current_user: User = Depends(get_current_user)
):
    event = _active_scrapes.get(current_user.id)
    if event:
        event.set()

    # Close all browser pages via CDP HTTP (direct to Chrome, bypasses Playwright)
    port = _active_browsers.pop(current_user.id, None)
    if port:
        try:
            import httpx
            with httpx.Client(timeout=5) as client:
                try:
                    targets = client.get(f"http://127.0.0.1:{port}/json").json()
                    for t in targets:
                        if t.get("type") == "page":
                            client.get(f"http://127.0.0.1:{port}/json/close/{t['id']}")
                except Exception:
                    pass  # browser already gone
        except Exception as e:
            print(f"  Error closing pages via CDP: {e}")

    if event:
        return {"status": "stopping"}
    return {"status": "no_active_scrape"}

@router.post("/scrape-maps", response_model=ScrapeResponse)
async def scrape_maps(
    request: MapsScrapeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Scrape Google Maps for businesses without websites."""
    scraper = GoogleMapsScraper(db)
    leads = await scraper.scrape_businesses(
        request.business_type, 
        request.city, 
        request.country,
        user_id=current_user.id
    )
    
    new_leads = []
    for sl in leads:
        result = await db.execute(
            select(Lead).where(
                (Lead.url == sl.url) | 
                ((Lead.title == sl.title) & (Lead.platform == "Google Maps"))
            )
        )
        if result.scalar_one_or_none():
            continue
            
        lead = Lead(
            title=sl.title,
            platform=sl.platform,
            url=sl.url,
            timestamp=sl.timestamp,
            author=sl.author,
            description=sl.description,
            rank="Warm",  # Businesses without websites are warm leads
            status="new",
            tags=["maps", request.city.lower(), request.country.lower(), request.business_type.lower()]
        )
        db.add(lead)
        new_leads.append(lead)
        
    if new_leads:
        await db.commit()
        for lead in new_leads:
            await notify_new_lead(lead, db)
            
    return ScrapeResponse(
        results=[ScrapeResult(
            platform="Google Maps",
            leads_found=len(leads),
            new_leads=len(new_leads)
        )],
        total_new=len(new_leads)
    )
