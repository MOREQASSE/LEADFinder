from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import async_session
from models import Lead
from scrapers.reddit import RedditScraper
from scrapers.craigslist import CraigslistScraper
from scrapers.upwork import UpworkScraper
from scrapers.mastodon import MastodonScraper
from scrapers.indeed import IndeedScraper
from scrapers.hackernews import HackerNewsScraper
from scrapers.google_alerts import GoogleAlertsScraper
from scrapers.lionbridge import LionbridgeScraper
from notifications import notify_new_lead
from utils.ranking import calculate_rank
from utils.currency import convert_to_mad

scheduler = AsyncIOScheduler()

async def run_scraper(scraper_class, interval_minutes: int):
    try:
        async with async_session() as db:
            scraper = scraper_class(db)
            leads = await scraper.scrape()
            new_leads = []
            for sl in leads:
                result = await db.execute(select(Lead).where(Lead.url == sl.url))
                if result.scalar_one_or_none():
                    continue
                mad_amount = None
                if sl.budget_min is not None:
                    mad_amount = await convert_to_mad(sl.budget_min, sl.budget_currency)
                rank = await calculate_rank(sl.budget_min, sl.budget_max, sl.description, sl.title, db)
                lead = Lead(
                    title=sl.title, platform=sl.platform, url=sl.url,
                    timestamp=sl.timestamp, author=sl.author,
                    budget_raw=sl.budget_raw, budget_min=sl.budget_min,
                    budget_max=sl.budget_max, budget_currency=sl.budget_currency,
                    budget_mad=mad_amount, description=sl.description,
                    rank=rank, status="new",
                )
                db.add(lead)
                new_leads.append(lead)
            
            if new_leads:
                await db.commit()
                for lead in new_leads:
                    await notify_new_lead(lead, db)
    except Exception as e:
        print(f"Scraper {scraper_class.__name__} error: {e}")

def start_scheduler():
    scheduler.add_job(run_scraper, IntervalTrigger(minutes=2), args=[RedditScraper, 2])
    scheduler.add_job(run_scraper, IntervalTrigger(minutes=30), args=[CraigslistScraper, 30])
    scheduler.add_job(run_scraper, IntervalTrigger(minutes=60), args=[UpworkScraper, 60])
    scheduler.add_job(run_scraper, IntervalTrigger(minutes=5), args=[MastodonScraper, 5])
    scheduler.add_job(run_scraper, IntervalTrigger(minutes=60), args=[IndeedScraper, 60])
    scheduler.add_job(run_scraper, IntervalTrigger(minutes=60), args=[HackerNewsScraper, 60])
    scheduler.add_job(run_scraper, IntervalTrigger(minutes=360), args=[GoogleAlertsScraper, 360])
    scheduler.add_job(run_scraper, IntervalTrigger(minutes=60), args=[LionbridgeScraper, 60])
    scheduler.start()
