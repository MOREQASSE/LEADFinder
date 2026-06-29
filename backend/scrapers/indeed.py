import asyncio
import random
import re
import sys
import threading
from datetime import datetime
from urllib.parse import urlencode, urlparse, urlunparse, parse_qs, urljoin

from scrapers.base import BaseScraper, ScrapedLead
from sqlalchemy import select

# Optional stealth support
try:
    from playwright_stealth import stealth_async
    _STEALTH_AVAILABLE = True
except ImportError:
    _STEALTH_AVAILABLE = False


_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
_VIEWPORT = {"width": 1280, "height": 800}

# Salary-like pattern: $xx / £xx / numeric ranges
_SALARY_RE = re.compile(
    r"[\$£€][\d,]+(?:\s*[-–]\s*[\$£€]?[\d,]+)?(?:\s*(?:a year|/yr|/hr|per hour|per year|annually))?",
    re.IGNORECASE,
)
_NUMBER_RE = re.compile(r"[\$£€,]")


def _parse_salary(text: str) -> tuple[float | None, float | None]:
    """Extract budget_min / budget_max from a salary string."""
    if not text:
        return None, None
    numbers = re.findall(r"[\d,]+", text)
    cleaned = [float(n.replace(",", "")) for n in numbers if n]
    if not cleaned:
        return None, None
    if len(cleaned) == 1:
        return cleaned[0], None
    return cleaned[0], cleaned[-1]


def _add_utm(url: str) -> str:
    """Append utm_source=leadfinder to a URL."""
    parsed = urlparse(url)
    qs = parse_qs(parsed.query, keep_blank_values=True)
    qs["utm_source"] = ["leadfinder"]
    new_query = urlencode({k: v[0] for k, v in qs.items()})
    return urlunparse(parsed._replace(query=new_query))


async def _random_delay(lo: float = 1.0, hi: float = 3.0) -> None:
    await asyncio.sleep(random.uniform(lo, hi))


class IndeedScraper(BaseScraper):
    def __init__(self, db=None):
        super().__init__(db)
        self.platform_name = "Indeed"

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _existing_urls(self) -> set[str]:
        """Return the set of Indeed URLs already stored in the DB."""
        if not self.db:
            return set()
        try:
            from models import Lead
            result = await self.db.execute(
                select(Lead.url).where(Lead.platform == "Indeed")
            )
            return {row[0] for row in result.fetchall()}
        except Exception as e:
            print(f"Indeed: could not query existing URLs: {e}")
            return set()

    async def _build_search_urls(self) -> list[str]:
        """Build Indeed search URLs from settings + geo context."""
        base_keywords = await self._get_keywords()
        if not base_keywords:
            base_keywords = [
                "web developer",
                "software engineer",
                "frontend developer",
            ]
        keywords = await self._get_mode_keywords(base_keywords)

        geo = await self._get_geo_context()
        location = geo.get("location", "")

        urls = []
        for kw in keywords[:3]:
            params = {"q": kw, "fromage": "14"}
            if location:
                params["l"] = location
            urls.append(
                f"https://www.indeed.com/jobs?{urlencode(params)}"
            )
        return urls

    # ------------------------------------------------------------------
    # Card extraction helpers (runs inside Playwright page context)
    # ------------------------------------------------------------------

    @staticmethod
    async def _extract_cards(page) -> list[dict]:
        """Pull raw job-card data from the current search results page."""
        cards = await page.query_selector_all("div.job_seen_beacon")
        if not cards:
            # Fallback: try td.resultContent (older Indeed layout)
            cards = await page.query_selector_all("td.resultContent")

        results = []
        for card in cards:
            try:
                # Title + link — Indeed 2025/2026 uses a.jcs-JobTitle with id="job_XXXX"
                title_el = await card.query_selector(
                    "a.jcs-JobTitle, a[id^='job_'], a[role='button']"
                )
                if not title_el:
                    continue

                # Title text is inside a <span> child
                title_span = await title_el.query_selector("span")
                title = (
                    (await title_span.inner_text()).strip()
                    if title_span
                    else (await title_el.inner_text()).strip()
                )

                # Extract the redirect URL from href for clean linking
                href = await title_el.get_attribute("href") or ""

                # Company
                company_el = await card.query_selector(
                    "[data-testid='company-name']"
                )
                company = (
                    (await company_el.inner_text()).strip()
                    if company_el
                    else ""
                )

                # Location
                loc_el = await card.query_selector(
                    "[data-testid='text-location']"
                )
                location = (
                    (await loc_el.inner_text()).strip() if loc_el else ""
                )

                # Salary
                salary_el = await card.query_selector(
                    "[data-testid='attribute_snippet'], "
                    "[data-testid='attribute_snippet_text'], "
                    "div.salary-snippet, "
                    "div.metadata"
                )
                salary_text = (
                    (await salary_el.inner_text()).strip()
                    if salary_el
                    else ""
                )

                results.append(
                    {
                        "title": title,
                        "href": href,
                        "company": company,
                        "location": location,
                        "salary_text": salary_text,
                    }
                )
            except Exception:
                continue

        return results

    # ------------------------------------------------------------------
    # Detail page fetcher
    # ------------------------------------------------------------------

    @staticmethod
    async def _fetch_description(page, url: str) -> str:
        """Navigate to a job detail page and return the description text."""
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=20_000)
            await _random_delay(2, 4)

            # Indeed description selectors (various versions)
            desc_selectors = [
                "#jobDescriptionText",
                "[data-testid='jobDescriptionText']",
                "div.jobsearch-jobDescriptionText",
                "div.job-description",
                "div#JobDescription",
            ]
            for sel in desc_selectors:
                desc_el = await page.query_selector(sel)
                if desc_el:
                    text = (await desc_el.inner_text()).strip()
                    if text and len(text) > 30:
                        return text

            # Fallback: grab largest text block on page
            body_text = await page.inner_text("body")
            if body_text:
                # Return first 2000 chars
                return body_text[:2000]
        except Exception as e:
            print(f"Indeed: description fetch error for {url}: {e}")
        return ""

    # ------------------------------------------------------------------
    # Core scrape
    # ------------------------------------------------------------------

    async def scrape(self) -> list[ScrapedLead]:
        leads_result: list[ScrapedLead] = []
        error_result: list[Exception | None] = [None]

        base_exclude = await self._get_exclude()
        exclude_terms = await self._get_mode_exclude(base_exclude)
        search_urls = await self._build_search_urls()
        existing_urls = await self._existing_urls()

        def run_in_thread():
            try:
                if sys.platform == "win32":
                    asyncio.set_event_loop_policy(
                        asyncio.WindowsProactorEventLoopPolicy()
                    )

                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

                async def internal_scrape() -> list[ScrapedLead]:
                    leads: list[ScrapedLead] = []

                    from playwright.async_api import async_playwright

                    async with async_playwright() as p:
                        browser = await p.chromium.launch(headless=True)
                        context = await browser.new_context(
                            user_agent=_USER_AGENT,
                            viewport=_VIEWPORT,
                        )
                        page = await context.new_page()

                        if _STEALTH_AVAILABLE:
                            await stealth_async(page)

                        all_cards: list[dict] = []

                        for search_url in search_urls:
                            try:
                                await page.goto(
                                    search_url,
                                    wait_until="domcontentloaded",
                                    timeout=20_000,
                                )
                                await _random_delay()

                                try:
                                    await page.wait_for_selector(
                                        "div.job_seen_beacon, "
                                        "div[data-testid='job-card'], "
                                        "li[data-testid='job-card-listitem']",
                                        timeout=10_000,
                                    )
                                except Exception:
                                    pass

                                cards = await self._extract_cards(page)
                                all_cards.extend(cards)

                            except Exception as e:
                                print(
                                    f"Indeed scrape error (search {search_url}): {e}"
                                )
                                continue

                        seen_hrefs: set[str] = set()
                        candidates: list[dict] = []

                        for card in all_cards:
                            href = card.get("href", "")
                            if not href or not href.startswith("/"):
                                continue
                            job_url = f"https://www.indeed.com{href}"
                            utm_url = _add_utm(job_url)

                            if (
                                job_url in existing_urls
                                or utm_url in existing_urls
                            ):
                                continue
                            if job_url in seen_hrefs:
                                continue
                            seen_hrefs.add(job_url)

                            if any(
                                ex in card["title"].lower()
                                for ex in exclude_terms
                            ):
                                continue

                            card["job_url"] = job_url
                            card["utm_url"] = utm_url
                            candidates.append(card)

                        for card in candidates[:10]:
                            try:
                                description = await self._fetch_description(
                                    page, card["job_url"]
                                )
                                await _random_delay()

                                combined = (
                                    card["title"].lower()
                                    + " "
                                    + description.lower()
                                )
                                if any(ex in combined for ex in exclude_terms):
                                    continue

                                salary_text = card["salary_text"]
                                budget_min, budget_max = _parse_salary(
                                    salary_text
                                )

                                full_description = (
                                    f"Location: {card['location']}\n\n{description}"
                                    if card["location"]
                                    else description
                                )

                                leads.append(
                                    ScrapedLead(
                                        title=card["title"],
                                        platform="Indeed",
                                        url=card["utm_url"],
                                        timestamp=datetime.utcnow(),
                                        author=card["company"],
                                        description=full_description,
                                        budget_raw=salary_text or None,
                                        budget_min=budget_min,
                                        budget_max=budget_max,
                                    )
                                )
                            except Exception as e:
                                print(
                                    f"Indeed scrape error (detail): {e}"
                                )
                                continue

                        await browser.close()

                    return leads

                leads_result.extend(loop.run_until_complete(internal_scrape()))
                loop.close()
            except Exception as e:
                print(f"Indeed scrape error: {e}")
                error_result[0] = e

        thread = threading.Thread(target=run_in_thread)
        thread.start()
        while thread.is_alive():
            await asyncio.sleep(0.5)

        return leads_result
