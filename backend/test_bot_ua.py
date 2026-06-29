"""Try to get Craigslist search results without JS by pretending to be a bot."""
import httpx
import re

url = "https://sfbay.craigslist.org/search/cps?query=website"
headers_list = [
    # Googlebot
    {"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"},
    # Bingbot
    {"User-Agent": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"},
    # Facebook crawler
    {"User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"},
    # Old browser
    {"User-Agent": "curl/7.68.0"},
]

for headers in headers_list:
    try:
        resp = httpx.get(url, follow_redirects=True, timeout=15, headers=headers)
        body = resp.text
        has_results = bool(re.search(r'class="[^"]*result[^"]*"', body[:50000]))
        body_len = len(body)
        print(f"UA: {headers['User-Agent'][:60]}...")
        print(f"  Status: {resp.status_code}, Body len: {body_len}, Has results: {has_results}")
        if has_results:
            # Extract a sample
            for m in re.finditer(r'class="[^"]*result[^"]*"', body[:50000]):
                print(f"  Class: {m.group()}")
                break
    except Exception as e:
        print(f"UA: {headers['User-Agent'][:60]}... Error: {e}")
