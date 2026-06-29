"""Look for schema info in Craigslist API response and try to decode items."""
import httpx
import json

url = "https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"
resp = httpx.get(url, timeout=30, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
})
data = resp.json()
d = data["data"]

# Print all top-level keys and their types
for k, v in d.items():
    if isinstance(v, list):
        print(f"  {k}: list[{len(v)}] sample={str(v[:3])[:200]}")
    elif isinstance(v, dict):
        print(f"  {k}: dict with keys={list(v.keys())[:10]}")
    elif isinstance(v, str):
        print(f"  {k}: str = {v[:100]}")
    else:
        print(f"  {k}: {type(v).__name__} = {v}")
