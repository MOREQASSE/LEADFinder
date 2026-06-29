"""Check Craigslist search page HTML structure."""
import re
import httpx

resp = httpx.get("http://sfbay.craigslist.org/search/cps?query=website", follow_redirects=True, timeout=30)
print("Status:", resp.status_code)
print("URL:", resp.url)
body = resp.text
print("Body length:", len(body))

rows_match = re.search(r'class="rows"', body)
print("Has ul class=rows:", bool(rows_match))

# Look for any result-like patterns
for m in re.finditer(r'class="[^"]*(?:result|listing)[^"]*"', body[:50000]):
    print("  class:", m.group())
