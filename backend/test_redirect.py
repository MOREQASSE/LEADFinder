"""Follow Craigslist postingID redirects and check data-pid."""
import httpx

api_url = "https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"
resp = httpx.get(api_url, timeout=30, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
})
data = resp.json()
items = data["data"]["items"]
locations = data["data"]["decode"]["locations"]

# Test following postingID redirect
item = items[0]
pid = item[0]
url = f"https://sfbay.craigslist.org/search/cps?postingID={pid}"
r = httpx.get(url, follow_redirects=True, timeout=15, headers={
    "User-Agent": "Mozilla/5.0"
})
print(f"postingID={pid}")
print(f"  Status: {r.status_code}")
print(f"  Final URL: {r.url}")
print(f"  Content-Type: {r.headers.get('content-type')}")
print()

# Also try checking if item[7] has something URL-related
# item[7] = [13, token] where 13 might be a type code
for item in items[:3]:
    token_type = item[7][0]
    token_val = item[7][1]
    print(f"PID: {item[0]}, Token type: {token_type}, Token value: {token_val}")
    print(f"  Title: {item[10][:60]}")
    print(f"  Slug: {item[9][1]}")
    print()
