"""Explore Craigslist API items structure."""
import httpx
import json

url = "https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"

resp = httpx.get(
    url, timeout=30,
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Origin": "https://sfbay.craigslist.org",
        "Referer": "https://sfbay.craigslist.org/",
    }
)
data = resp.json()
items = data.get("data", {}).get("items", [])
print(f"Total items: {len(items)}")
print(f"Total result count: {data.get('data', {}).get('totalResultCount')}")
print()

if items:
    # Print first item keys
    print("First item keys:", list(items[0].keys()))
    print()
    print("First item (pretty):")
    print(json.dumps(items[0], indent=2)[:1500])
