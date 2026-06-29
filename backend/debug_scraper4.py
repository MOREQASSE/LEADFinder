"""Copy of _fetch_site_category with debug prints"""
import sys
import asyncio
sys.path.insert(0, ".")

from playwright.sync_api import sync_playwright

def _debug_fetch(site, category, query, max_scrolls):
    print(f"[debug] starting: site={site}, cat={category}, query={query}, scrolls={max_scrolls}")
    results = []
    seen_urls = set()
    
    url = f"https://{site}.craigslist.org/search/{category}?query={query}"
    print(f"[debug] url={url}")
    
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            page.goto(url, timeout=60000, wait_until="domcontentloaded")
            print(f"[debug] goto OK, title={page.title()}")
        except Exception as e:
            print(f"[debug] first goto failed: {e}")
            try:
                page.goto(url, timeout=60000, wait_until="load")
                print(f"[debug] second goto OK")
            except Exception as e2:
                print(f"[debug] second goto also failed: {e2}")
                browser.close()
                return []
        
        page.wait_for_timeout(3000)
        initial = page.evaluate("document.querySelectorAll('[data-pid]').length")
        print(f"[debug] after 3s wait, pid_count={initial}")
        
        for i in range(max_scrolls):
            before = page.evaluate("document.querySelectorAll('[data-pid]').length")
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(2000)
            after = page.evaluate("document.querySelectorAll('[data-pid]').length")
            print(f"[debug] scroll {i}: before={before}, after={after}")
            if after == before:
                print(f"[debug] no new results, break")
                break
        
        print(f"[debug] extracting links...")
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
        print(f"[debug] extracted {len(links)} links")
        
        for item in links:
            u = item.get("url", "")
            t = item.get("title", "")
            loc = item.get("location", "")
            if u and t and u not in seen_urls:
                seen_urls.add(u)
                results.append({"title": t, "url": u, "location": loc})
            else:
                print(f"[debug] skipped: url={bool(u)}, title={bool(t)}, seen={u in seen_urls}")
        
        browser.close()
    
    print(f"[debug] returning {len(results)} results")
    return results

async def test():
    results = await asyncio.to_thread(_debug_fetch, "sfbay", "cps", "website", 5)
    print(f"\nTotal: {len(results)}")
    for r in results[:3]:
        print(f"  {r['title'][:60]} | {r['url']}")

asyncio.run(test())
