"""Test Craigslist JSON search API directly."""
import httpx
import json

url = "https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"

resp = httpx.get(
    url,
    timeout=30,
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Origin": "https://sfbay.craigslist.org",
        "Referer": "https://sfbay.craigslist.org/",
    }
)
print("Status:", resp.status_code)
print("Content-Type:", resp.headers.get("content-type"))
data = resp.json()
print("Top-level keys:", list(data.keys()))
print()

# Explore the structure
if "data" in data:
    print("Data keys:", list(data["data"].keys()) if isinstance(data["data"], dict) else type(data["data"]))
    
# Find postings
postings = data.get("data", {}).get("postings", []) if isinstance(data.get("data"), dict) else []
# Actually let's dump the structure
print(json.dumps(data, indent=2)[:3000])
