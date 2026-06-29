"""Debug the Playwright extraction - check what's rendered."""
import sys
import asyncio
sys.path.insert(0, ".")

async def test():
    from playwright.sync_api import sync_playwright

    def run():
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
            )
            context = browser.new_context(
                viewport={"width": 1280, "height": 900},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"
            )
            page = context.new_page()
            page.goto("https://sfbay.craigslist.org/search/cps?query=website", timeout=60000, wait_until="domcontentloaded")
            page.wait_for_timeout(5000)

            # Debug: check what elements exist
            info = page.evaluate("""
                () => {
                    const info = {};
                    info.title = document.title;
                    info.body_len = document.body?.innerText?.length || 0;
                    info.all_elements = document.querySelectorAll('*').length;
                    
                    // Check specific selectors
                    info.selectors = {};
                    for (const sel of ['[data-pid]', 'a[href*="/d/"]', '.cl-search-result', '.result-row', '.posting-title', '.titlestyle', '.title']) {
                        info.selectors[sel] = document.querySelectorAll(sel).length;
                    }
                    
                    // Check for any links to craigslist postings
                    const links = Array.from(document.querySelectorAll('a[href*="craigslist"]'));
                    info.sample_links = links.slice(0, 5).map(a => a.href);
                    
                    return info;
                }
            """)
            
            for k, v in info.items():
                print(f"{k}: {v}")
            
            browser.close()
    
    await asyncio.to_thread(run)

asyncio.run(test())
