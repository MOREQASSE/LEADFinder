import asyncio
import logging
import re
import urllib.parse
import os
import traceback
import threading
from datetime import datetime
from typing import List, Optional
from playwright.async_api import async_playwright
from scrapers.base import BaseScraper, ScrapedLead
from sqlalchemy import select
from models import Lead, Setting # Import models for DB check

logger = logging.getLogger(__name__)

class LinkedInScraper(BaseScraper):
    def __init__(self, db=None):
        super().__init__(db)
        self.platform_name = "LinkedIn"
        self.base_url = "https://www.linkedin.com/jobs/search"

    async def scrape(self) -> List[ScrapedLead]:
        import sys
        log_path = "linkedin_debug.log"
        def log_debug(msg):
            with open(log_path, "a") as f:
                f.write(f"[{datetime.now()}] {msg}\n")
        
        log_debug("--- SMART QUEUE SCRAPE START ---")
        
        # 1. Get existing URLs from DB to avoid re-scanning
        existing_urls = set()
        if self.db:
            try:
                # We need to run this in the main thread's loop before starting the worker thread
                result = await self.db.execute(select(Lead.url).where(Lead.platform == self.platform_name))
                existing_urls = {row[0] for row in result.all()}
                log_debug(f"Found {len(existing_urls)} existing leads in DB.")
            except Exception as db_e:
                log_debug(f"DB Fetch Error: {db_e}")

        leads_result = []
        error_result = [None]
        
        def run_in_thread(urls_to_exclude):
            try:
                if sys.platform == 'win32':
                    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
                
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                async def internal_scrape():
                    base_keywords = await self._get_keywords("website,web,developer,designer")
                    mode = await self._get_mode()
                    merged_keywords = await self._get_mode_keywords(base_keywords)
                    geo = await self._get_geo_context()
                    location = geo.get("location") or "United States"
                    if self.db:
                        pass
                    
                    target_keywords = merged_keywords[:3]
                    if mode == "internship_scout" and len(target_keywords) == 3:
                        target_keywords = merged_keywords[:4]
                    results = []
                    candidates = [] # All found on board
                    
                    try:
                        from playwright_stealth import stealth_async
                        use_stealth = True
                    except ImportError:
                        use_stealth = False
                        
                    async with async_playwright() as p:
                        browser = await p.chromium.launch(headless=True)
                        context = await browser.new_context(
                            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                            viewport={"width": 1280, "height": 800}
                        )
                        
                        for query in target_keywords:
                            page = await context.new_page()
                            if use_stealth: await stealth_async(page)
                            
                            q_enc = urllib.parse.quote(query)
                            loc_enc = urllib.parse.quote(location)
                            search_url = f"{self.base_url}?keywords={q_enc}&location={loc_enc}&f_TPR=r86400"
                            
                            log_debug(f"Searching board: {query}")
                            await page.goto(search_url, wait_until="networkidle", timeout=60000)
                            await asyncio.sleep(4)
                            
                            job_cards = await page.query_selector_all(".base-card, .job-search-card, .base-search-card, [data-entity-urn]")
                            for card in job_cards:
                                try:
                                    link_el = await card.query_selector("a[href*='/jobs/view/'], a.base-card__full-link")
                                    if not link_el: continue
                                    link = (await link_el.get_attribute("href")).split("?")[0]
                                    
                                    # SKIP if already in DB
                                    if link in urls_to_exclude:
                                        continue
                                        
                                    title_el = await card.query_selector(".base-search-card__title, .base-card__title, h3")
                                    company_el = await card.query_selector(".base-search-card__subtitle, .base-card__subtitle, h4")
                                    loc_el = await card.query_selector(".job-search-card__location, .base-search-card__metadata")
                                    
                                    candidates.append({
                                        'title': (await title_el.inner_text()).strip() if title_el else "Unknown Job",
                                        'company': (await company_el.inner_text()).strip() if company_el else "Unknown",
                                        'location': (await loc_el.inner_text()).strip() if loc_el else "Remote",
                                        'url': link
                                    })
                                except: continue
                            await page.close()

                        log_debug(f"Identified {len(candidates)} NEW candidate leads on the board.")
                        
                        # PICK TOP 10 NEW LEADS for DEEP SCAN
                        to_deep_scan = candidates[:10]
                        detail_page = await context.new_page()
                        if use_stealth: await stealth_async(detail_page)
                        
                        for item in to_deep_scan:
                            try:
                                log_debug(f"Deep scanning NEW lead: {item['title']}")
                                await detail_page.goto(item['url'], wait_until="domcontentloaded", timeout=30000)
                                await asyncio.sleep(3)
                                
                                desc_el = await detail_page.query_selector(".description__text, .show-more-less-html__markup, .job-description")
                                full_desc = (await desc_el.inner_text()).strip() if desc_el else "No description found."
                                
                                results.append(ScrapedLead(
                                    title=item['title'], platform=self.platform_name, url=item['url'],
                                    author=item['company'], description=f"Location: {item['location']}\n\n{full_desc}"
                                ))
                                await asyncio.sleep(2)
                            except: continue
                            
                        await detail_page.close()
                        await browser.close()
                    return results

                leads_result.extend(loop.run_until_complete(internal_scrape()))
                loop.close()
            except Exception as e:
                log_debug(f"Thread Error: {e}")
                error_result[0] = e

        thread = threading.Thread(target=run_in_thread, args=(existing_urls,))
        thread.start()
        while thread.is_alive(): await asyncio.sleep(0.5)
            
        return leads_result
