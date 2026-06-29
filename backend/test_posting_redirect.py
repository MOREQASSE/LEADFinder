"""Follow postingID redirect to see where it leads."""
import httpx

# Get a posting ID from the API
api_url = "https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"
resp = httpx.get(api_url, timeout=30, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
})
data = resp.json()
items = data["data"]["items"]

# Try with different posting ID formats
for item in items[:2]:
    pid = item[0]
    slug = item[9][1]
    print(f"\nPostingID={pid}, slug={slug}")
    print(f"Title: {item[10][:60]}")
    
    # Follow the postingID redirect
    url = f"https://sfbay.craigslist.org/search/cps?postingID={pid}"
    r = httpx.get(url, follow_redirects=True, timeout=15, headers={
        "User-Agent": "Mozilla/5.0"
    })
    print(f"  postingID=  -> {r.status_code} {r.url}")
    
    # Try without postingID param
    url2 = f"https://sfbay.craigslist.org/search/cps?query=website"
    r2 = httpx.get(url2, follow_redirects=True, timeout=15, headers={
        "User-Agent": "Mozilla/5.0"
    })
    print(f"  no postingID -> {r2.status_code} {r2.url}")
    print(f"  same? {r.url == r2.url}")
