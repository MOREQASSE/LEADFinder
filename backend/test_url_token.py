"""Try posting ID and token as URL components."""
import httpx

api_url = "https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"
resp = httpx.get(api_url, timeout=30, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
})
data = resp.json()
items = data["data"]["items"]
locations = data["data"]["decode"]["locations"]

for item in items[:5]:
    pid = item[0]
    token = item[7][1] if isinstance(item[7], list) and len(item[7]) > 1 else ""
    slug = item[9][1] if isinstance(item[9], list) and len(item[9]) > 1 else ""
    geo = item[4].split("~")[0]
    area_idx = int(geo.split(":")[0])
    loc_entry = locations[area_idx] if area_idx < len(locations) else None
    area_code = loc_entry[2] if isinstance(loc_entry, list) and len(loc_entry) > 2 else ""
    site = loc_entry[1] if isinstance(loc_entry, list) and len(loc_entry) > 1 else "sfbay"

    # Try token instead of posting ID in URL
    test_urls = [
        f"https://{site}.craigslist.org/{area_code}/cps/d/{slug}/{pid}.html",
        f"https://{site}.craigslist.org/{area_code}/cps/{pid}.html",
        f"https://{site}.craigslist.org/cps/d/{pid}.html",
    ]

    for url in test_urls:
        try:
            r = httpx.get(url, follow_redirects=False, timeout=10, headers={
                "User-Agent": "Mozilla/5.0"
            })
            if r.status_code != 404:
                print(f"  [{r.status_code}] {url}")
        except:
            pass
    print(f"  (all 404 for pid={pid}, slug={slug}, area={area_code})")
    print()
