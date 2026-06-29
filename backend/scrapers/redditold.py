from datetime import datetime
import asyncio
from scrapers.base import BaseScraper, ScrapedLead

class RedditScraper(BaseScraper):
    def __init__(self, db=None):
        super().__init__(db)
        self.platform_name = "Reddit"

    async def scrape(self) -> list[ScrapedLead]:
        # Fetch everything async first
        creds = await self._get_credentials()
        keywords = await self._get_keywords("website,web developer,web designer,hire,need,looking for")
        exclude = await self._get_exclude("free,cheap")
        preset = "websites"
        if self.db:
            from utils.settings_loader import get_setting
            preset = await get_setting(self.db, "search_preset_active", "websites")
            
        return await asyncio.to_thread(self._scrape_sync, creds, keywords, exclude, preset)

    async def _get_credentials(self):
        """Get Reddit credentials from database or return default."""
        if not self.db:
            return "", "", "DevaxioLEADFinder/1.0"
        from utils.settings_loader import get_setting
        client_id = await get_setting(self.db, "reddit_client_id", "")
        client_secret = await get_setting(self.db, "reddit_client_secret", "")
        user_agent = await get_setting(self.db, "reddit_user_agent", "DevaxioLEADFinder/1.0")
        return client_id, client_secret, user_agent

    def _scrape_sync(self, creds, keywords, exclude, preset) -> list[ScrapedLead]:
        leads = []
        try:
            import praw
            client_id, client_secret, user_agent = creds
            if not client_id or not client_secret:
                print("Reddit credentials not configured. Please add them in Settings > Platform API Keys.")
                return leads
            reddit = praw.Reddit(
                client_id=client_id,
                client_secret=client_secret,
                user_agent=user_agent,
            )
            
            # Choose subreddits based on preset
            if any(term in preset for term in ["job", "internship", "cybersecurity", "network"]):
                subreddits = ["forhire", "jobbit", "cscareerquestions", "netsec", "sysadmin", "networking"]
            else:
                subreddits = ["forhire", "freelance", "webdev", "web_design", "smallbusiness", "startups"]
            
            for sub_name in subreddits:
                try:
                    sub = reddit.subreddit(sub_name)
                    for post in sub.new(limit=25):
                        title_lower = post.title.lower()
                        text_lower = (post.selftext or "").lower()
                        combined = title_lower + " " + text_lower
                        
                        # Check if matches any keyword
                        matches_keyword = any(kw in combined for kw in keywords)
                        # Check if should be excluded
                        matches_exclude = any(ex in combined for ex in exclude)
                        
                        if matches_keyword and not matches_exclude:
                            leads.append(ScrapedLead(
                                title=post.title,
                                platform="Reddit",
                                url=f"https://reddit.com{post.permalink}",
                                timestamp=datetime.fromtimestamp(post.created_utc),
                                author=str(post.author),
                                description=post.selftext[:1000] if post.selftext else "",
                            ))
                except Exception as e:
                    print(f"Reddit subreddit {sub_name} error: {e}")
                    continue
        except Exception as e:
            print(f"Reddit scrape error: {e}")
        return leads
