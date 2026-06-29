"""Explore Craigslist API items nested structure."""
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
print(f"Type of items: {type(items)}")
if isinstance(items, list):
    print(f"Type of items[0]: {type(items[0])}")
    if isinstance(items[0], list):
        print(f"items[0] length: {len(items[0])}")
        print(f"Type of items[0][0]: {type(items[0][0])}")
        if isinstance(items[0][0], dict):
            print("First item keys:", list(items[0][0].keys()))
            print()
            print(json.dumps(items[0][0], indent=2)[:2000])
    elif isinstance(items[0], dict):
        print("First item keys:", list(items[0].keys()))
        print(json.dumps(items[0], indent=2)[:2000])
