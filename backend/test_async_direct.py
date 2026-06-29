"""Test async Playwright API directly."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto("https://sfbay.craigslist.org/search/cps?query=website", timeout=60000)
            await page.wait_for_timeout(5000)
            pid = await page.evaluate("document.querySelectorAll('[data-pid]').length")
            print(f"pid_count: {pid}")
            
            if pid > 0:
                links = await page.evaluate("""
                    () => {
                        const items = [];
                        for (const a of document.querySelectorAll('a.posting-title')) {
                            const label = a.querySelector('.label');
                            const title = (label ? label.innerText.trim() : a.innerText.trim());
                            items.push({ url: a.href, title: title });
                        }
                        return items;
                    }
                """)
                print(f"Links: {len(links)}")
                for l in links[:3]:
                    print(f"  {l['title'][:60]} -> {l['url']}")
            else:
                print("No data-pid elements found")
        except Exception as e:
            print(f"Error: {e}")
        await browser.close()

asyncio.run(main())
