"""Look for embedded JSON data in Craigslist search page."""
import httpx
import re
import json

resp = httpx.get(
    "https://sfbay.craigslist.org/search/cps?query=website",
    follow_redirects=True, timeout=30,
    headers={"User-Agent": "Mozilla/5.0"}
)
body = resp.text

# Look for JSON-like data in script tags
for m in re.finditer(r'<script[^>]*>(.*?)</script>', body, re.DOTALL):
    content = m.group(1).strip()
    if not content:
        continue
    # Look for data that contains "sapi" or "apiVersion"
    if "apiVersion" in content or "postings" in content or "sapi" in content:
        print(f"Found script ({len(content)} chars)")
        print(content[:1000])
        print("---")
