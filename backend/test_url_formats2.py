"""Test old-format Craigslist URLs with API posting IDs."""
import httpx

# Test: can we construct a valid URL using posting ID only?
# Old format: https://{site}.craigslist.org/{area}/{category}/{posting_id}.html
# New format: https://{site}.craigslist.org/{area}/{category}/d/{slug}/{posting_id}.html

api_url = "https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"
resp = httpx.get(api_url, timeout=30, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
})
data = resp.json()
items = data["data"]["items"]
locations = data["data"]["decode"]["locations"]

# Get a few items and try constructing URLs with different formats
for item in items[:5]:
    pid = item[0]
    slug = item[9][1] if isinstance(item[9], list) and len(item[9]) > 1 else ""
    geo = item[4].split("~")[0]
    area_idx = int(geo.split(":")[0])
    loc_entry = locations[area_idx] if area_idx < len(locations) else None
    area_code = loc_entry[2] if isinstance(loc_entry, list) and len(loc_entry) > 2 else ""
    site = loc_entry[1] if isinstance(loc_entry, list) and len(loc_entry) > 1 else "sfbay"
    category = "cps"
    title = item[10][:60]

    # Try different URL formats
    formats = [
        f"https://{site}.craigslist.org/{area_code}/{category}/{pid}.html",
        f"https://{site}.craigslist.org/{area_code}/{category}/d/{slug}/{pid}.html",
        f"https://{site}.craigslist.org/search/{category}?postingID={pid}",
        f"https://{site}.craigslist.org/{pid}.html",
    ]
    
    print(f"Title: {title}")
    for url in formats:
        try:
            r = httpx.get(url, follow_redirects=False, timeout=10, headers={
                "User-Agent": "Mozilla/5.0"
            })
            print(f"  [{r.status_code}] {url}")
        except Exception as e:
            print(f"  [ERR] {url}: {e}")
    print()
