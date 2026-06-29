"""Check API response format for different Craigslist categories."""
import httpx
import json

categories = ["cps", "cpg", "web", "sof"]

for cat in categories:
    url = f"https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath={cat}&lang=en&cc=us"
    resp = httpx.get(url, timeout=30, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    })
    
    if resp.status_code != 200:
        print(f"Category {cat}: HTTP {resp.status_code}")
        continue
    
    data = resp.json()
    items = data.get("data", {}).get("items", [])
    print(f"Category {cat}: {len(items)} items")
    
    if items and isinstance(items[0], list):
        item = items[0]
        print(f"  Length: {len(item)}")
        for i, v in enumerate(item):
            print(f"  [{i}]: {type(v).__name__} = {str(v)[:80]}")
    elif items:
        print(f"  First item type: {type(items[0])}")
        print(f"  First item: {str(items[0])[:200]}")
    else:
        decode = data.get("data", {}).get("decode", {})
        print(f"  No items. decode keys: {list(decode.keys()) if isinstance(decode, dict) else type(decode)}")
        print(f"  data type: {type(data.get('data'))}")
    print()
