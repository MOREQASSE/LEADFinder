"""Use Playwright to find Craigslist's search API endpoint."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        api_requests = []

        def on_request(request):
            url = request.url
            if "search" in url.lower() and "craigslist" in url:
                api_requests.append(url)

        page.on("request", on_request)

        await page.goto("https://sfbay.craigslist.org/search/cps?query=website", timeout=30000)
        await page.wait_for_timeout(5000)

        print("API requests found:")
        for url in api_requests:
            print(f"  {url}")

        await browser.close()

asyncio.run(main())
