import asyncio
import random
import re
import sys
import threading
from datetime import datetime
from urllib.parse import urljoin

from scrapers.base import BaseScraper, ScrapedLead

try:
    from playwright_stealth import stealth_async
    _STEALTH_AVAILABLE = True
except ImportError:
    _STEALTH_AVAILABLE = False

_BASE_URL = "https://lionbridge.darwinbox.com/ms/candidatev2/main/careers"
_ALL_JOBS_URL = f"{_BASE_URL}/allJobs"
_JOB_DETAIL_URL = f"{_BASE_URL}/jobDetails"

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
_VIEWPORT = {"width": 1280, "height": 800}


async def _random_delay(lo: float = 1.0, hi: float = 3.0) -> None:
    await asyncio.sleep(random.uniform(lo, hi))


class LionbridgeScraper(BaseScraper):
    def __init__(self, db=None):
        super().__init__(db)
        self.platform_name = "Lionbridge"

    async def scrape(self) -> list[ScrapedLead]:
        leads_result: list[ScrapedLead] = []
        error_result: list[Exception | None] = [None]

        base_keywords = await self._get_keywords()
        if not base_keywords:
            base_keywords = ["web developer"]
        keywords = await self._get_mode_keywords(base_keywords)
        search_keyword = keywords[0] if keywords else "web developer"

        remote_only = False
        if self.db:
            try:
                from utils.settings_loader import get_setting
                val = await get_setting(self.db, "lionbridge_remote_only", "")
                remote_only = val == "1"
            except Exception:
                pass

        def run_in_thread(remote=remote_only):
            try:
                if sys.platform == "win32":
                    asyncio.set_event_loop_policy(
                        asyncio.WindowsProactorEventLoopPolicy()
                    )

                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

                async def internal_scrape() -> list[ScrapedLead]:
                    from playwright.async_api import async_playwright

                    leads: list[ScrapedLead] = []

                    async with async_playwright() as p:
                        browser = await p.chromium.launch(headless=True)
                        context = await browser.new_context(
                            user_agent=_USER_AGENT,
                            viewport=_VIEWPORT,
                        )
                        page = await context.new_page()

                        if _STEALTH_AVAILABLE:
                            await stealth_async(page)

                        try:
                            await page.goto(
                                _ALL_JOBS_URL,
                                wait_until="domcontentloaded",
                                timeout=30_000,
                            )
                            await _random_delay(2, 4)

                            try:
                                await page.wait_for_selector(
                                    ".job-tile, ui-job-tile",
                                    timeout=15_000,
                                )
                            except Exception:
                                print("Lionbridge: no job tiles found")
                                await browser.close()
                                return []

                            search_box = page.get_by_role("textbox").or_(
                                page.locator("input[placeholder*='Search']")
                            )
                            try:
                                await search_box.wait_for(timeout=5_000)
                                await search_box.click()
                                await _random_delay(0.5, 1)
                                await search_box.fill(search_keyword)
                                await _random_delay(1.5, 3)
                            except Exception:
                                print("Lionbridge: search box not found, scraping all")

                            if remote:
                                try:
                                    loc_btn = page.get_by_role("button", name="Location")
                                    await loc_btn.wait_for(timeout=5_000)
                                    await loc_btn.click()
                                    await _random_delay(0.5, 1)

                                    more_btn = page.get_by_text(re.compile(r"^\+(\d+ )?More$"))
                                    try:
                                        await more_btn.wait_for(timeout=3_000)
                                        await more_btn.click()
                                        await _random_delay(0.5, 1)
                                    except Exception:
                                        pass

                                    remote_cb = page.locator("ui-modal").get_by_role("checkbox", name="Remote")
                                    await remote_cb.wait_for(timeout=3_000)
                                    await remote_cb.check()
                                    await _random_delay(0.5, 1)

                                    close_btn = page.locator("ui-modal").get_by_role("button").filter(has_text=re.compile(r"^$"))
                                    try:
                                        await close_btn.first.click()
                                    except Exception:
                                        pass
                                    await _random_delay(1.5, 3)
                                except Exception as e:
                                    print(f"Lionbridge: remote filter error: {e}")

                            await _random_delay(1, 2)

                            job_tiles = await page.query_selector_all(
                                ".job-tile, ui-job-tile"
                            )
                            if not job_tiles:
                                print("Lionbridge: no job tiles after search")
                                await browser.close()
                                return []

                            job_links = []
                            for tile in job_tiles:
                                try:
                                    link_el = await tile.query_selector("a[href*='jobDetails']")
                                    if not link_el:
                                        link_el = await tile.query_selector("a")
                                    if not link_el:
                                        continue

                                    href = await link_el.get_attribute("href") or ""
                                    job_url = urljoin(_ALL_JOBS_URL, href)

                                    title_el = await tile.query_selector(
                                        ".job-title, h3, h4, [class*='title'], span"
                                    )
                                    title = (
                                        (await title_el.inner_text()).strip()
                                        if title_el else ""
                                    )

                                    loc_el = await tile.query_selector(
                                        ".job-location, [class*='location'], .location"
                                    )
                                    location = (
                                        (await loc_el.inner_text()).strip()
                                        if loc_el else ""
                                    )

                                    dept_el = await tile.query_selector(
                                        ".job-department, [class*='department'], .department"
                                    )
                                    department = (
                                        (await dept_el.inner_text()).strip()
                                        if dept_el else ""
                                    )

                                    if title and job_url:
                                        job_links.append({
                                            "title": title,
                                            "url": job_url,
                                            "location": location,
                                            "department": department,
                                        })
                                except Exception:
                                    continue

                            print(f"Lionbridge: found {len(job_links)} jobs")

                            for job in job_links[:10]:
                                try:
                                    await page.goto(
                                        job["url"],
                                        wait_until="domcontentloaded",
                                        timeout=25_000,
                                    )
                                    await _random_delay(2, 4)

                                    description_parts = []

                                    desc_sections = await page.query_selector_all(
                                        ".job-description p, "
                                        ".job-description li, "
                                        "[class*='description'] p, "
                                        "[class*='description'] li, "
                                        "ui-job-detail p, "
                                        "ui-job-detail li, "
                                        "p, li"
                                    )

                                    for el in desc_sections:
                                        try:
                                            text = (await el.inner_text()).strip()
                                            if text and len(text) > 10:
                                                description_parts.append(text)
                                        except Exception:
                                            continue

                                    heading_els = await page.query_selector_all(
                                        "h1, h2, h3, h4, strong, b, [class*='heading'], [class*='title']"
                                    )
                                    headings = []
                                    for el in heading_els:
                                        try:
                                            text = (await el.inner_text()).strip()
                                            if text and len(text) > 3:
                                                headings.append(text)
                                        except Exception:
                                            continue

                                    full_description = ""
                                    if headings:
                                        full_description += " | ".join(headings[:5]) + "\n\n"
                                    if description_parts:
                                        full_description += "\n".join(description_parts)

                                    if not full_description:
                                        body_text = await page.inner_text("body")
                                        full_description = body_text[:2500] if body_text else ""

                                    title_el = await page.query_selector(
                                        "h1, h2, [class*='job-title'], [class*='position'], .title"
                                    )
                                    detail_title = (
                                        (await title_el.inner_text()).strip()
                                        if title_el else job["title"]
                                    )

                                    loc_detail_el = await page.query_selector(
                                        "[class*='location'], .location, [class*='place']"
                                    )
                                    detail_location = (
                                        (await loc_detail_el.inner_text()).strip()
                                        if loc_detail_el else job["location"]
                                    )

                                    combined_location = detail_location or job["location"] or ""
                                    if combined_location:
                                        full_description = f"Location: {combined_location}\n\n{full_description}"

                                    leads.append(
                                        ScrapedLead(
                                            title=detail_title,
                                            platform="Lionbridge",
                                            url=job["url"],
                                            timestamp=datetime.utcnow(),
                                            author=job.get("department", "Lionbridge"),
                                            description=full_description.strip(),
                                        )
                                    )
                                except Exception as e:
                                    print(f"Lionbridge: detail error for {job['url']}: {e}")
                                    continue

                        except Exception as e:
                            print(f"Lionbridge: scrape error: {e}")
                        finally:
                            await browser.close()

                    return leads

                leads_result.extend(loop.run_until_complete(internal_scrape()))
                loop.close()
            except Exception as e:
                print(f"Lionbridge: thread error: {e}")
                error_result[0] = e

        thread = threading.Thread(target=run_in_thread)
        thread.start()
        while thread.is_alive():
            await asyncio.sleep(0.5)

        return leads_result
