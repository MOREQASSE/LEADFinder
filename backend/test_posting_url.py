"""Check if we can use Craigslist postingID as a lead URL."""
import httpx

api_url = "https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"
resp = httpx.get(api_url, timeout=30, headers={
    "User-Agent": "Mozilla/5.0"
})
data = resp.json()
items = data["data"]["items"]
locations = data["data"]["decode"]["locations"]

# Try: for each item, construct a URL using the actual posting ID from the URL pattern
# The actual posting IDs are near minPostingId: 7927231751
# Let me try URL patterns with different ID interpretations

for idx, item in enumerate(items[:10]):
    pid0 = item[0]
    pid1 = item[1]
    slug = item[9][1] if isinstance(item[9], list) and len(item[9]) > 1 else ""
    title = item[10][:50]
    
    # Get area code
    geo = item[4].split("~")[0]
    area_idx = int(geo.split(":")[0])
    loc_entry = locations[area_idx] if area_idx < len(locations) else None
    area_code = loc_entry[2] if isinstance(loc_entry, list) and len(loc_entry) > 2 else ""
    
    # Try the search URL with postingID param
    test_url = f"https://sfbay.craigslist.org/search/cps?postingID={pid0}"
    r = httpx.get(test_url, follow_redirects=True, timeout=10, headers={
        "User-Agent": "Mozilla/5.0"
    })
    
    # Check if the redirect leads to a specific posting or the search page
    print(f"PID: {pid0}, Final URL: {r.url}")
    if idx == 0:
        break  # Just check first one
