"""Try Craigslist single posting API."""
import httpx
import json

# Get a batch first to get some item tokens
api_url = "https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"
resp = httpx.get(api_url, timeout=30, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
})
print(f"API status: {resp.status_code}")
data = resp.json()
items = data["data"]["items"]
print(f"Got {len(items)} items")

if items and isinstance(items[0], list):
    item = items[0]
    token = item[7][1] if len(item) > 7 and isinstance(item[7], list) and len(item[7]) > 1 else ""
    pid = item[0]
    print(f"Token: {token}, PID: {pid}")
    
    # Try single posting API
    detail_urls = [
        f"https://sapi.craigslist.org/web/v8/postings/detail?postingToken={token}&lang=en&cc=us",
        f"https://sapi.craigslist.org/web/v8/postings/detail?id={pid}&lang=en&cc=us",
        f"https://sapi.craigslist.org/web/v8/postings/detail?postingID={pid}&lang=en&cc=us",
    ]
    
    for url in detail_urls:
        try:
            r = httpx.get(url, timeout=15, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            })
            if r.status_code == 200:
                d = r.json()
                print(f"\nURL: {url}")
                print(f"  Status: 200")
                print(f"  Keys: {list(d.keys())}")
                print(f"  Data keys: {list(d.get('data', {}).keys()) if isinstance(d.get('data'), dict) else 'N/A'}")
                if isinstance(d.get("data"), dict) and "posting" in d["data"]:
                    posting = d["data"]["posting"]
                    print(f"  posting url: {posting.get('url', 'N/A')}")
                    print(f"  posting id: {posting.get('id', 'N/A')}")
                    print(f"  posting keys: {list(posting.keys())[:15]}")
            elif r.status_code == 404:
                print(f"\nURL: {url}")
                print(f"  Status: 404")
            else:
                print(f"\nURL: {url}")
                print(f"  Status: {r.status_code}, body: {r.text[:200]}")
        except Exception as e:
            print(f"\nURL: {url} -> Error: {e}")
