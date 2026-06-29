"""Debug the fetch function step by step."""
import sys
import asyncio
sys.path.insert(0, ".")

async def test():
    from playwright.sync_api import sync_playwright
    
    def run():
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page = browser.new_page()
            url = "https://sfbay.craigslist.org/search/cps?query=website"
            print(f"Navigating to {url}")
            page.goto(url, timeout=60000, wait_until="domcontentloaded")
            print(f"Loaded, title={page.title()}")
            page.wait_for_timeout(3000)
            
            pid_count = page.evaluate("document.querySelectorAll('[data-pid]').length")
            print(f"pid_count before scroll: {pid_count}")
            
            for i in range(3):
                before = page.evaluate("document.querySelectorAll('[data-pid]').length")
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(2000)
                after = page.evaluate("document.querySelectorAll('[data-pid]').length")
                print(f"scroll {i}: before={before}, after={after}")
            
            # Try the extraction
            links = page.evaluate("""
                () => {
                    const seen = new Set();
                    const items = [];
                    for (const a of document.querySelectorAll('[data-pid] a[href*="/d/"]')) {
                        const href = a.href;
                        if (!href || seen.has(href)) continue;
                        seen.add(href);
                        const container = a.closest('[data-pid]') || a.parentElement;
                        const titleEl = container.querySelector('.title, .titlestyle');
                        const title = (titleEl ? titleEl.innerText.trim() : a.innerText.trim())
                                      .split('\\n')[0];
                        items.push({ url: href, title: title });
                    }
                    return items;
                }
            """)
            print(f"Extracted {len(links)} links")
            for l in links[:3]:
                print(f"  {l['title'][:60]} -> {l['url']}")
            
            browser.close()
    
    await asyncio.to_thread(run)

asyncio.run(test())
