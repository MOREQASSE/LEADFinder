"""Verify URL construction matches rendered URLs."""
import httpx

url = "https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"
resp = httpx.get(url, timeout=30, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
})
data = resp.json()
d = data["data"]
items = d["items"]
locations = d["decode"]["locations"]

# The search_path from the request was "cps"
category = "cps"

for item in items[:5]:
    post_id = item[0]
    slug = item[9][1] if isinstance(item[9], list) and len(item[9]) > 1 else ""
    geo = item[4].split("~")[0]
    area_idx = int(geo.split(":")[0])
    
    loc_entry = locations[area_idx] if area_idx < len(locations) else None
    area_code = loc_entry[2] if isinstance(loc_entry, list) and len(loc_entry) > 2 else ""
    site = loc_entry[1] if isinstance(loc_entry, list) and len(loc_entry) > 1 else "sfbay"
    
    # Construct URL
    constructed = f"https://{site}.craigslist.org/{area_code}/{category}/d/{slug}/{post_id}.html"
    
    # Verify by checking if it redirects
    verify = httpx.get(constructed, follow_redirects=False, timeout=10, headers={
        "User-Agent": "Mozilla/5.0"
    })
    
    print(f"Title: {item[10][:60]}")
    print(f"  area_code: {area_code}, slug: {slug}, post_id: {post_id}")
    print(f"  URL: {constructed}")
    print(f"  HTTP status: {verify.status_code}")
    print()
