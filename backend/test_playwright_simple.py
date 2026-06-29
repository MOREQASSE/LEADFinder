"""Test Playwright-based approach for Craigslist search."""
import asyncio
from playwright.async_api import async_playwright
import json

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        # Intercept API responses
        results = []

        def on_response(response):
            if "sapi.craigslist.org" in response.url and "postings/search/full" in response.url:
                results.append(response.url)

        page.on("response", on_response)

        await page.goto("https://sfbay.craigslist.org/search/cps?query=website", timeout=30000)
        await page.wait_for_timeout(4000)

        # Try extracting result cards text
        cards = await page.locator(".cl-static-search-result").all()
        print(f"Found {len(cards)} result cards")
        for card in cards[:3]:
            title_el = card.locator(".title")
            title = await title_el.inner_text() if await title_el.count() > 0 else "?"
            print(f"  Title: {title.strip()[:80]}")

        print()
        print(f"Intercepted {len(results)} API URLs")
        for url in results:
            print(f"  {url}")

        # Now try to get the API response content directly
        if results:
            resp = await page.evaluate(f"fetch('{results[0]}').then(r => r.json())")
            items = resp.get("data", {}).get("items", [])
            print(f"\nAPI returned {len(items)} items")
            if items:
                item = items[0]
                print(f"Item type: {type(item)}")
                if isinstance(item, list):
                    print(f"Item length: {len(item)}")
                    for i, v in enumerate(item):
                        print(f"  [{i}]: {type(v).__name__} = {str(v)[:100]}")

        await browser.close()

asyncio.run(main())
