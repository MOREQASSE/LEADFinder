from datetime import datetime
import feedparser
from scrapers.base import BaseScraper, ScrapedLead

class UpworkScraper(BaseScraper):
    def __init__(self, db=None):
        super().__init__(db)
        self.platform_name = "Upwork"

    async def _get_custom_feed(self):
        """Get custom RSS feed from settings."""
        if not self.db:
            return None
        from utils.settings_loader import get_setting
        return await get_setting(self.db, "upwork_rss_url", "")

    async def _build_feeds(self):
        """Build RSS feed URLs based on search keywords or custom setting."""
        custom_url = await self._get_custom_feed()
        if custom_url:
            return [custom_url]
            
        keywords = await self._get_keywords()
        feeds = []
        for kw in keywords[:2]:  # Use top 2 keywords
            query = kw.replace(" ", "+")
            feeds.append(f"https://www.upwork.com/ab/feed/jobs/rss?q={query}&sort=recency")
        return feeds

    async def scrape(self) -> list[ScrapedLead]:
        leads = []
        exclude_terms = await self._get_exclude()
        feeds = await self._build_feeds()
        
        for feed_url in feeds:
            try:
                feed = feedparser.parse(feed_url)
                for entry in feed.entries[:15]:
                    title_lower = entry.title.lower()
                    desc_lower = entry.get("summary", "").lower()
                    combined = title_lower + " " + desc_lower
                    
                    # Skip if matches exclude terms
                    if any(ex in combined for ex in exclude_terms):
                        continue
                    
                    leads.append(ScrapedLead(
                        title=entry.title,
                        platform="Upwork",
                        url=entry.link,
                        timestamp=datetime(*entry.published_parsed[:6]) if hasattr(entry, "published_parsed") else None,
                        description=entry.get("summary", "")[:1000],
                    ))
            except Exception as e:
                print(f"Upwork scrape error: {e}")
        return leads
