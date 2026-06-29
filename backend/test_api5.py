"""Try Craigslist search/summary endpoint."""
import httpx
import json

url = "https://sapi.craigslist.org/web/v8/postings/search/summary?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"
resp = httpx.get(url, timeout=30, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
})
print("Status:", resp.status_code)
if resp.status_code == 200:
    data = resp.json()
    items = data.get("data", {}).get("items", [])
    print(f"Total items: {len(items)}")
    if items:
        print("First item type:", type(items[0]))
        print(json.dumps(items[0], indent=2)[:2000] if isinstance(items[0], dict) else items[0])
else:
    print("Response:", resp.text[:500])
