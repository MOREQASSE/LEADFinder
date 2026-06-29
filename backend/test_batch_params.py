"""Try Craigslist API with different batch parameters."""
import httpx
import json

base = "https://sapi.craigslist.org/web/v8/postings/search/full"

# Different batch formats
params_list = [
    {"batch": "1-0-360-0-0", "query": "website", "searchPath": "cps", "lang": "en", "cc": "us"},
    {"batch": "1-0-120-0-0", "query": "website", "searchPath": "cps", "lang": "en", "cc": "us"},
    {"query": "website", "searchPath": "cps", "lang": "en", "cc": "us"},
    {"batch": "1-0-360-0-0", "query": "website", "searchPath": "cps"},
]

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

for params in params_list:
    try:
        resp = httpx.get(base, params=params, timeout=15, headers=headers)
        data = resp.json()
        items = data.get("data", {}).get("items", [])
        print(f"params={params}")
        print(f"  Status: {resp.status_code}, Items: {len(items)}")
        if items and isinstance(items[0], list):
            pid = items[0][0]
            title = items[0][10]
            print(f"  First: pid={pid}, title={title[:50]}")
    except Exception as e:
        print(f"params={params} -> Error: {e}")
    print()
