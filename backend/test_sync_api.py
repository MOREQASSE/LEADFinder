"""Test Playwright sync API exactly as the working async test."""
import sys
import asyncio
sys.path.insert(0, ".")

async def test():
    def run():
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto("https://sfbay.craigslist.org/search/cps?query=website", timeout=45000)
            page.wait_for_timeout(4000)
            
            info = page.evaluate("""
                () => ({
                    title: document.title,
                    body_len: document.body?.innerText?.length || 0,
                    pid_count: document.querySelectorAll('[data-pid]').length,
                    link_count: document.querySelectorAll('a[href*="/d/"]').length,
                })
            """)
            print(info)
            browser.close()
    
    await asyncio.to_thread(run)

asyncio.run(test())
