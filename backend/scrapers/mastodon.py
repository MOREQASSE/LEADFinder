from datetime import datetime
from scrapers.base import BaseScraper, ScrapedLead
import re

def strip_html(html):
    """Strip HTML tags from text."""
    if not html:
        return ""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', html)
    # Decode common HTML entities
    text = text.replace('&lt;', '<').replace('&gt;', '>')
    text = text.replace('&amp;', '&').replace('&quot;', '"')
    text = text.replace('&#39;', "'").replace('&apos;', "'")
    text = text.replace('&nbsp;', ' ')
    # Clean up extra whitespace
    text = ' '.join(text.split())
    return text.strip()

class MastodonScraper(BaseScraper):
    def __init__(self, db=None):
        super().__init__(db)
        self.platform_name = "Mastodon"

    async def _get_access_token(self):
        """Get Mastodon access token from database."""
        if not self.db:
            return None
        from utils.settings_loader import get_setting
        return await get_setting(self.db, "mastodon_access_token", "") or None

    async def _get_hashtags(self):
        """Get hashtags based on preset and mode."""
        if not self.db:
            return ["webdev", "freelance", "website", "hireadeveloper"]
        from utils.settings_loader import get_setting
        preset = await get_setting(self.db, "search_preset_active", "websites")
        mode = await self._get_mode()
        
        # Mode takes precedence, then fall back to preset-based logic
        if mode == "job_hunter":
            return ["hiring", "jobs", "jobsearch", "careers", "remotework", "techjobs"]
        elif mode == "internship_scout":
            return ["internship", "internships", "intern", "entrylevel", "newgrad", "techintern"]
        elif mode == "clients_excavator":
            if "cybersecurity" in preset:
                return ["cybersecurity", "infosec", "pentesting", "securityjobs"]
            elif "network" in preset:
                return ["networking", "sysadmin", "devops", "networkengineer"]
            else:
                return ["webdev", "freelance", "website", "hireadeveloper", "webdesign"]
        
        # Fallback: preset-based
        if "cybersecurity" in preset:
            return ["cybersecurity", "infosec", "pentesting", "securityjobs"]
        elif "network" in preset:
            return ["networking", "sysadmin", "devops", "networkengineer"]
        elif "job" in preset or "internship" in preset:
            return ["jobs", "hiring", "jobsearch", "careers"]
        else:
            return ["webdev", "freelance", "website", "hireadeveloper"]

    async def scrape(self) -> list[ScrapedLead]:
        leads = []
        try:
            from mastodon import Mastodon
            access_token = await self._get_access_token()
            mastodon = Mastodon(
                access_token=access_token,
                api_base_url="https://mastodon.social",
            )
            
            keywords = await self._get_keywords("need,looking for,hire,website,job,internship")
            exclude = await self._get_exclude("free,cheap")
            hashtags = await self._get_hashtags()
            
            for tag in hashtags:
                try:
                    results = mastodon.timeline_hashtag(tag, limit=20)
                    for post in results:
                        content = post.get("content", "").lower()
                        
                        # Check if matches any keyword
                        matches_keyword = any(kw in content for kw in keywords)
                        # Check if should be excluded
                        matches_exclude = any(ex in content for ex in exclude)
                        
                        if matches_keyword and not matches_exclude:
                            content = post.get("content", "")
                            clean_content = strip_html(content)
                            leads.append(ScrapedLead(
                                title=clean_content[:200],
                                platform="Mastodon",
                                url=post.get("url", ""),
                                timestamp=post.get("created_at"),
                                author=post.get("account", {}).get("username", ""),
                                description=clean_content[:1000],
                            ))
                except Exception as e:
                    print(f"Mastodon hashtag {tag} error: {e}")
                    continue
        except Exception as e:
            print(f"Mastodon scrape error: {e}")
        return leads
