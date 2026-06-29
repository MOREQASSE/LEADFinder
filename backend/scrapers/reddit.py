import asyncio
import logging
import re
from datetime import datetime, timezone
import feedparser
import httpx
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper, ScrapedLead

logger = logging.getLogger(__name__)

PRESET_SUBREDDITS = {
    "websites": ["forhire", "freelance", "webdev", "web_design", "smallbusiness", "startups"],
    "network_telecom_jobs": ["forhire", "jobbit", "cscareerquestions", "netsec", "sysadmin", "networking"],
    "network_telecom_internship": ["forhire", "jobbit", "cscareerquestions", "netsec", "sysadmin", "networking"],
    "cybersecurity_jobs": ["forhire", "jobbit", "cscareerquestions", "netsec", "cybersecurity", "AskNetsec"],
    "cybersecurity_internship": ["forhire", "jobbit", "cscareerquestions", "netsec", "cybersecurity", "AskNetsec"],
}

DEFAULT_SUBREDDITS = ["forhire", "freelance", "webdev", "web_design", "smallbusiness", "startups"]
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
MAX_SUBREDDITS = 20

_SIDEBAR_CACHE: dict[str, set[str]] = {}

class RedditScraper(BaseScraper):
    def __init__(self, db=None):
        super().__init__(db)
        self.platform_name = "Reddit"

    async def scrape(self) -> list[ScrapedLead]:
        # Reddit posts are conversational — preset keywords are too narrow.
        # Supplement them with broad defaults so posts aren't missed.
        REDDIT_DEFAULTS = [
            "website","web","developer","designer","hire","hiring","need",
            "looking for","help","build","create","develop","design",
            "wordpress","ecommerce","shopify","freelance","contract",
            "project","coding","programming","full stack","frontend",
            "backend","react","nextjs","html","css","javascript","python",
            "landing page","web app","saas",
        ]
        preset_keywords = await self._get_keywords("website,web developer,web designer,hire,need,looking for")
        # Merge, dedupe, preserve order
        seen = set()
        keywords = []
        for kw in preset_keywords + REDDIT_DEFAULTS:
            k = kw.strip().lower()
            if k and k not in seen:
                seen.add(k)
                keywords.append(k)

        exclude = await self._get_exclude("free,cheap")
        preset = "websites"
        custom_subreddits = None

        if self.db:
            from utils.settings_loader import get_setting
            preset = await get_setting(self.db, "search_preset_active", "websites")
            custom_raw = await get_setting(self.db, "reddit_subreddits", "")
            if custom_raw.strip():
                custom_subreddits = [s.strip().lower() for s in custom_raw.split(",") if s.strip()]

        seed_subs = self._get_subreddits(preset, custom_subreddits)
        all_subs = await self._discover_subreddits(seed_subs)
        logger.info("Scraping %d subreddits: %s with %d keywords", len(all_subs), all_subs, len(keywords))

        return await self._scrape_multi_rss(all_subs, keywords, exclude)

    def _get_subreddits(self, preset: str, custom_subreddits=None) -> list[str]:
        if custom_subreddits:
            return custom_subreddits
        return PRESET_SUBREDDITS.get(preset, DEFAULT_SUBREDDITS)

    # ── Discovery ──────────────────────────────────────────────────

    async def _discover_subreddits(self, seed_subs: list[str]) -> list[str]:
        found: dict[str, int] = {s: 0 for s in seed_subs}

        sidebar_subs = await self._scrape_sidebars(seed_subs)
        for s in sidebar_subs:
            if s not in found:
                found[s] = 1

        if self.db:
            try:
                ai_subs = await self._ai_suggest_subreddits(seed_subs)
                for s in ai_subs:
                    if s not in found:
                        found[s] = 2
            except Exception:
                pass

        ordered = sorted(found.items(), key=lambda x: x[1])
        return [s for s, _ in ordered][:MAX_SUBREDDITS]

    # ── Sidebar Scraping ──────────────────────────────────────────

    async def _scrape_sidebars(self, subreddits: list[str]) -> set[str]:
        discovered: set[str] = set()
        sem = asyncio.Semaphore(3)

        async def fetch(sub: str) -> set[str]:
            async with sem:
                return await self._scrape_single_sidebar(sub)

        results = await asyncio.gather(*[fetch(s) for s in subreddits], return_exceptions=True)
        for r in results:
            if isinstance(r, set):
                discovered.update(r)
        return discovered

    async def _scrape_single_sidebar(self, sub: str) -> set[str]:
        cached = _SIDEBAR_CACHE.get(sub)
        if cached is not None:
            return cached

        try:
            async with httpx.AsyncClient(
                headers={"User-Agent": USER_AGENT},
                follow_redirects=True,
                timeout=10,
            ) as client:
                resp = await client.get(f"https://old.reddit.com/r/{sub}/")
                if resp.status_code != 200:
                    return set()

                soup = BeautifulSoup(resp.text, "html.parser")
                side = soup.find("div", class_="side")
                if not side:
                    return set()

                subs = set()
                for a in side.find_all("a"):
                    href = a.get("href", "")
                    m = re.match(r"/(?:r/)([a-zA-Z0-9_]+)", href)
                    if m:
                        name = m.group(1).lower()
                        if name != sub:
                            subs.add(name)
                subs = set(list(subs)[:5])
                _SIDEBAR_CACHE[sub] = subs
                if subs:
                    logger.debug("Sidebar /r/%s → %s", sub, subs)
                return subs
        except Exception as e:
            logger.debug("Sidebar /r/%s error: %s", sub, e)
            return set()

    # ── AI Suggestion ─────────────────────────────────────────────

    async def _ai_suggest_subreddits(self, seed_subs: list[str]) -> set[str]:
        from ai.fallback import query_with_fallback

        prompt = (
            "Suggest 5-10 subreddits where people post about needing tech services, "
            "hiring developers, or looking for freelance web help.\n\n"
            f"Seed subreddits: {', '.join(seed_subs)}\n\n"
            "Return ONLY a comma-separated list of subreddit names, no /r/ prefix. "
            "No explanations, no markdown."
        )

        result = await query_with_fallback(prompt, self.db)
        suggested = set()
        for name in result.split(","):
            name = re.sub(r"[^a-zA-Z0-9_]", "", name.strip().lower())
            if name and len(name) > 1:
                suggested.add(name)
        if suggested:
            logger.info("AI suggested: %s", suggested)
        return suggested

    # ── Multi-RSS Scrape ──────────────────────────────────────────

    async def _scrape_multi_rss(self, subreddits: list[str], keywords: list[str], exclude: list[str]) -> list[ScrapedLead]:
        """
        Scrape all subreddits in a SINGLE request using Reddit's multi-RSS
        format: /r/sub1+sub2+sub3/new/.rss?limit=100
        """
        if not subreddits:
            return []

        leads = []
        async with httpx.AsyncClient(headers={"User-Agent": USER_AGENT}) as client:
            subs_str = "+".join(subreddits)
            url = f"https://www.reddit.com/r/{subs_str}/new/.rss?limit=100"

            try:
                resp = await client.get(url, timeout=15)
                if resp.status_code != 200:
                    logger.warning("Multi-RSS returned %s", resp.status_code)
                    return []

                feed = feedparser.parse(resp.text)

                for entry in feed.entries:
                    title = entry.get("title", "")
                    content = self._get_entry_content(entry)
                    combined = (title + " " + content).lower()

                    if not any(kw in combined for kw in keywords):
                        continue
                    if any(ex in combined for ex in exclude):
                        continue

                    author = ""
                    if hasattr(entry, "author"):
                        author = entry.author
                    elif hasattr(entry, "source") and hasattr(entry.source, "author"):
                        author = entry.source.author

                    published = None
                    if hasattr(entry, "published_parsed") and entry.published_parsed:
                        published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)

                    leads.append(ScrapedLead(
                        title=title,
                        platform="Reddit",
                        url=entry.get("link", ""),
                        timestamp=published,
                        author=author,
                        description=(content or "")[:5000],
                    ))

            except Exception as e:
                logger.warning("Multi-RSS error: %s", e)

        return leads

    @staticmethod
    def _get_entry_content(entry) -> str:
        for key in ("summary", "description"):
            val = entry.get(key, "")
            if val:
                return val
        if hasattr(entry, "content") and entry.content:
            for c in entry.content:
                val = c.get("value", "")
                if val:
                    return val
        return ""
