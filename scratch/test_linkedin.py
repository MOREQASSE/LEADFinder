import asyncio
from playwright.async_api import async_playwright

async def test_linkedin():
    print("Launching browser...")
    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(headless=True)
            print("Browser launched.")
            page = await browser.new_page()
            url = "https://www.linkedin.com/jobs/search?keywords=website&location=United%20States"
            print(f"Navigating to {url}...")
            await page.goto(url, wait_until="networkidle", timeout=30000)
            print("Page loaded.")
            
            cards = await page.query_selector_all(".base-card, .job-search-card, .base-search-card")
            print(f"Found {len(cards)} cards.")
            
            for i, card in enumerate(cards[:5]):
                title = await card.query_selector(".base-search-card__title")
                if title:
                    print(f"Card {i}: {await title.inner_text()}")
                else:
                    print(f"Card {i}: Title not found")
                    
            await browser.close()
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_linkedin())
