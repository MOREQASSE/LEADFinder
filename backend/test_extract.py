"""Extract Craigslist result links from fully rendered page."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        await page.goto("https://sfbay.craigslist.org/search/cps?query=website", timeout=30000)
        await page.wait_for_timeout(5000)

        # Get all result links
        links = await page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('a[href*="/d/"]'))
                    .filter(a => a.href.match(/craigslist\.org\/[^/]+\/[^/]+\/d\//))
                    .map(a => ({
                        href: a.href,
                        title: (a.querySelector('.title') || a).innerText?.trim() || '',
                        location: a.querySelector('.location')?.innerText?.trim() || '',
                        price: a.querySelector('.price')?.innerText?.trim() || '',
                        date: a.querySelector('.date')?.innerText?.trim() || ''
                    }));
            }
        """)

        print(f"Found {len(links)} links")
        for l in links[:5]:
            print(f"\n  Title: {l['title'][:70]}")
            print(f"  URL: {l['href']}")
            print(f"  Location: {l['location']}")
            print(f"  Price: {l['price']}")
            print(f"  Date: {l['date']}")

        await browser.close()

asyncio.run(main())
