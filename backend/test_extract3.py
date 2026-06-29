"""Stable Craigslist extraction with proper browser config."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        await page.goto(
            "https://sfbay.craigslist.org/search/cps?query=website",
            timeout=45000,
            wait_until="domcontentloaded"
        )
        # Wait for results to load via JS
        await page.wait_for_timeout(5000)

        # Extract unique postings
        data = await page.evaluate("""
            () => {
                const seen = new Set();
                const items = [];
                for (const el of document.querySelectorAll('[data-pid]')) {
                    const pid = el.getAttribute('data-pid');
                    if (!pid || seen.has(pid)) continue;
                    seen.add(pid);
                    const link = el.querySelector('a[href*="/d/"]');
                    items.push({
                        pid: pid,
                        url: link ? link.href : '',
                        title: (el.querySelector('.title') || el.querySelector('.titlestyle') || el)?.innerText?.trim()?.split('\\n')[0] || ''
                    });
                }
                return items;
            }
        """)

        print(f"Found {len(data)} unique postings")
        for item in data[:5]:
            print(f"  PID: {item['pid']}")
            print(f"  Title: {item['title'][:70]}")
            print(f"  URL: {item['url']}")
            print()

        await browser.close()

asyncio.run(main())
