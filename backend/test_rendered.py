"""Extract Craigslist results from rendered page using Playwright JS evaluation."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        results = []

        def on_response(response):
            if "sapi.craigslist.org" in response.url and "postings/search/full" in response.url:
                nonlocal results
                import json
                try:
                    results = asyncio.get_event_loop().run_until_complete(response.json())
                except:
                    pass

        page.on("response", on_response)

        await page.goto("https://sfbay.craigslist.org/search/cps?query=website", timeout=30000)
        await page.wait_for_timeout(5000)

        # Get all result links from the rendered page
        links = await page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('a[href*="craigslist"]'))
                    .filter(a => a.href.includes('/cps/') || a.href.includes('/d/'))
                    .slice(0, 10)
                    .map(a => ({ href: a.href, text: a.innerText.trim() }));
            }
        """)
        print(f"Found {len(links)} links:")
        for l in links:
            print(f"  {l['text'][:60]} -> {l['href']}")

        # Get all result items
        items = await page.evaluate("""
            () => {
                const cards = document.querySelectorAll('[class*="result"]');
                return Array.from(cards).slice(0, 5).map(el => ({
                    tag: el.tagName,
                    classes: el.className,
                    text: el.innerText?.trim()?.substring(0, 80)
                }));
            }
        """)
        print(f"\nFound {len(items)} result elements:")
        for item in items:
            print(f"  <{item['tag']} class='{item['classes']}'> {item['text']}")

        await browser.close()

asyncio.run(main())
