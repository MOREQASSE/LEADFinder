from datetime import datetime
import feedparser
from scrapers.base import BaseScraper, ScrapedLead

class HackerNewsScraper(BaseScraper):
    def __init__(self, db=None):
        super().__init__(db)
        self.platform_name = "HackerNews"

    async def scrape(self) -> list[ScrapedLead]:
        leads = []
        keywords = await self._get_keywords("looking for,need a,hire,website,web dev,freelance,job,internship")
        exclude = await self._get_exclude("free,cheap,no pay")
        mode = await self._get_mode()
        
        try:
            # Check preset to decide which feeds to use
            preset = "websites"
            if self.db:
                from utils.settings_loader import get_setting
                preset = await get_setting(self.db, "search_preset_active", "websites")
            
            # Mode-aware feed selection
            if mode == "job_hunter":
                feeds = [
                    ("https://hnrss.org/jobs", 30),  # Who is hiring
                    ("https://hnrss.org/frontpage", 10),
                ]
            elif mode == "internship_scout":
                feeds = [
                    ("https://hnrss.org/jobs", 20),
                    ("https://hnrss.org/frontpage", 15),
                ]
            elif mode == "clients_excavator":
                feeds = [
                    ("https://hnrss.org/frontpage", 20),
                    ("https://hnrss.org/jobs", 10),
                    ("https://hnrss.org/show", 10),
                ]
            elif any(term in preset for term in ["job", "internship", "cybersecurity", "network"]):
                feeds = [
                    ("https://hnrss.org/jobs", 20),
                    ("https://hnrss.org/frontpage", 10),
                ]
            else:
                feeds = [
                    ("https://hnrss.org/frontpage", 20),
                    ("https://hnrss.org/jobs", 10),
                ]
            
            for feed_url, limit in feeds:
                try:
                    feed = feedparser.parse(feed_url)
                    for entry in feed.entries[:limit]:
                        title_lower = entry.title.lower()
                        desc_lower = entry.get("summary", "").lower()
                        combined = title_lower + " " + desc_lower
                        
                        # Check if matches any keyword
                        matches_keyword = any(kw in combined for kw in keywords)
                        # Check if should be excluded
                        matches_exclude = any(ex in combined for ex in exclude)
                        
                        if matches_keyword and not matches_exclude:
                            author = entry.get("author_detail", {}).get("name", "") or ""
                            leads.append(ScrapedLead(
                                title=entry.title,
                                platform="HackerNews",
                                url=entry.link,
                                author=author,
                                timestamp=datetime(*entry.published_parsed[:6]) if hasattr(entry, "published_parsed") else None,
                                description=entry.get("summary", "")[:500],
                            ))
                except Exception as e:
                    print(f"HackerNews feed {feed_url} error: {e}")
                    continue
        except Exception as e:
            print(f"HackerNews scrape error: {e}")
        return leads
