"""Explore Craigslist API items - list format."""
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
decode = data.get("data", {}).get("decode", {})

print(f"decode keys: {list(decode.keys())}")
print()

# Show first 3 items with their structure
for idx, item in enumerate(items[:3]):
    print(f"Item {idx}: length={len(item)}")
    for i, val in enumerate(item):
        print(f"  [{i}]: {type(val).__name__} = {str(val)[:100]}")
    print()
