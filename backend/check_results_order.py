"""Check resultsOrder/detailsOrder for different categories."""
import httpx

categories = ["cps", "cpg", "web", "sof"]

for cat in categories:
    url = f"https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath={cat}&lang=en&cc=us"
    resp = httpx.get(url, timeout=30, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    })
    if resp.status_code != 200:
        print(f"{cat}: HTTP {resp.status_code}")
        continue
    
    data = resp.json()
    d = data.get("data", {})
    print(f"{cat}: resultsOrder={d.get('resultsOrder')}")
    print(f"     detailsOrder={d.get('detailsOrder')}")
    
    # Check if decode is a dict
    decode = d.get("decode")
    print(f"     decode type={type(decode).__name__}")
    if isinstance(decode, dict):
        print(f"     decode keys={list(decode.keys())}")
    print()
