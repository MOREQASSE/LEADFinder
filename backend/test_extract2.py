"""Clean extraction of Craigslist search results."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        await page.goto("https://sfbay.craigslist.org/search/cps?query=website", timeout=30000)
        await page.wait_for_timeout(5000)

        # Get all unique posting URLs with their data
        results = await page.evaluate("""
            () => {
                const seen = new Set();
                const items = [];
                const links = document.querySelectorAll('.cl-search-result a[href*="/d/"]');
                for (const a of links) {
                    const href = a.href;
                    if (!href || seen.has(href)) continue;
                    seen.add(href);
                    const container = a.closest('.cl-search-result') || a;
                    items.push({
                        url: href,
                        title: a.innerText?.trim() || container.innerText?.trim()?.split('\\n')[0] || '',
                    });
                }
                return items;
            }
        """)

        print(f"Found {len(results)} unique results")
        for r in results[:5]:
            print(f"  {r['title'][:70]}")
            print(f"  {r['url']}")
            print()

        await browser.close()

asyncio.run(main())
