"""Detailed debug of _fetch_site_category with prints inside the function."""
import sys
import asyncio
sys.path.insert(0, ".")

from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        url = "https://sfbay.craigslist.org/search/cps?query=website"
        
        print("1. goto")
        page.goto(url, timeout=60000, wait_until="domcontentloaded")
        print("2. after goto, pid_count =", page.evaluate("document.querySelectorAll('[data-pid]').length"))
        
        page.wait_for_timeout(3000)
        print("3. after 3s wait, pid_count =", page.evaluate("document.querySelectorAll('[data-pid]').length"))
        
        for i in range(5):
            before = page.evaluate("document.querySelectorAll('[data-pid]').length")
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(2000)
            after = page.evaluate("document.querySelectorAll('[data-pid]').length")
            print(f"4.{i}  before={before}  after={after}")
            if after == before:
                print("     -> no new results, break")
                break
        
        links = page.evaluate("""
            () => {
                const seen = new Set();
                const items = [];
                for (const a of document.querySelectorAll('a.posting-title')) {
                    const href = a.href;
                    if (!href || seen.has(href)) continue;
                    seen.add(href);
                    const label = a.querySelector('.label');
                    const title = (label ? label.innerText.trim() : a.innerText.trim());
                    const pid = a.closest('[data-pid]');
                    const loc = pid ? pid.querySelector('.result-location') : null;
                    const location = loc ? loc.innerText.trim() : '';
                    items.push({ url: href, title: title, location: location });
                }
                return items;
            }
        """)
        print(f"5. extracted {len(links)} links")
        for l in links[:3]:
            print(f"   title={l['title'][:60]}  url={l['url']}  loc={l['location']}")
        
        browser.close()

async def main():
    await asyncio.to_thread(run)

asyncio.run(main())
