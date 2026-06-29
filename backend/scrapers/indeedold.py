from datetime import datetime
import feedparser
from scrapers.base import BaseScraper, ScrapedLead

class IndeedScraper(BaseScraper):
    def __init__(self, db=None):
        super().__init__(db)
        self.platform_name = "Indeed"

    async def _get_custom_feed(self):
        """Get custom RSS feed from settings."""
        if not self.db:
            return None
        from utils.settings_loader import get_setting
        return await get_setting(self.db, "indeed_rss_url", "")

    async def _build_feeds(self):
        """Build RSS feed URLs based on mode keywords + geography."""
        custom_url = await self._get_custom_feed()
        if custom_url:
            return [custom_url]

        base_keywords = await self._get_keywords()
        keywords = await self._get_mode_keywords(base_keywords)
        geo = await self._get_geo_context()
        location = geo.get("location", "")

        feeds = []
        for kw in keywords[:3]:
            query = kw.replace(" ", "+")
            loc = location.replace(" ", "+") if location else ""
            feeds.append(f"https://rss.indeed.com/rss?q={query}&l={loc}")
        return feeds

    async def _scrape_adzuna(self) -> list[ScrapedLead]:
        """Scrape from Adzuna API as a fallback for Indeed."""
        if not self.db:
            return []
        from utils.settings_loader import get_setting
        app_id = await get_setting(self.db, "adzuna_api_id", "")
        app_key = await get_setting(self.db, "adzuna_api_key", "")
        
        if not app_id or not app_key:
            return []
            
        leads = []
        try:
            import httpx
            keywords = await self._get_keywords()
            query = "+".join(keywords[:2]).replace(" ", "+")
            url = f"https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id={app_id}&app_key={app_key}&results_per_page=20&what={query}"
            
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    for job in data.get("results", []):
                        leads.append(ScrapedLead(
                            title=job.get("title", ""),
                            platform="Indeed/Adzuna",
                            url=job.get("redirect_url", ""),
                            timestamp=datetime.fromisoformat(job.get("created", "").replace("Z", "+00:00")) if job.get("created") else None,
                            description=job.get("description", ""),
                            budget_min=job.get("salary_min"),
                            budget_max=job.get("salary_max"),
                        ))
        except Exception as e:
            print(f"Adzuna scrape error: {e}")
        return leads

    async def scrape(self) -> list[ScrapedLead]:
        leads = []
        base_exclude = await self._get_exclude()
        exclude_terms = await self._get_mode_exclude(base_exclude)
        feeds = await self._build_feeds()
        
        # Try RSS first
        for feed_url in feeds:
            try:
                feed = feedparser.parse(feed_url)
                for entry in feed.entries[:15]:
                    title_lower = entry.title.lower()
                    desc_lower = entry.get("summary", "").lower()
                    combined = title_lower + " " + desc_lower
                    
                    if any(ex in combined for ex in exclude_terms):
                        continue
                    
                    leads.append(ScrapedLead(
                        title=entry.title,
                        platform="Indeed",
                        url=entry.link,
                        timestamp=datetime(*entry.published_parsed[:6]) if hasattr(entry, "published_parsed") else None,
                        description=entry.get("summary", "")[:1000],
                    ))
            except Exception as e:
                print(f"Indeed RSS error: {e}")
        
        # Fallback to Adzuna if no leads found and keys exist
        if not leads:
            adzuna_leads = await self._scrape_adzuna()
            leads.extend(adzuna_leads)
            
        return leads
