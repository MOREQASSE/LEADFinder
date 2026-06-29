"""Check the HTML structure of a Craigslist result card."""
import sys
import asyncio
sys.path.insert(0, ".")

async def test():
    from playwright.sync_api import sync_playwright
    
    def run():
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto("https://sfbay.craigslist.org/search/cps?query=website", timeout=60000, wait_until="domcontentloaded")
            page.wait_for_timeout(3000)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(3000)
            
            # Get HTML of the first result card
            html = page.evaluate("""
                () => {
                    const el = document.querySelector('[data-pid]');
                    if (!el) return 'NO ELEMENT';
                    return el.outerHTML;
                }
            """)
            print("First result card HTML:")
            print(html[:2000])
            
            browser.close()
    
    await asyncio.to_thread(run)

asyncio.run(test())
