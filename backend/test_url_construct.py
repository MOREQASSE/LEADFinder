"""Test constructing Craigslist URLs from posting IDs."""
import httpx

# Test if posting ID alone works as URL
posting_id = "7933656878"
test_urls = [
    f"https://sfbay.craigslist.org/{posting_id}.html",
    f"https://sfbay.craigslist.org/search/cps/{posting_id}.html",
]

for url in test_urls:
    resp = httpx.get(url, follow_redirects=True, timeout=15, headers={
        "User-Agent": "Mozilla/5.0"
    })
    print(f"URL: {url}")
    print(f"  Status: {resp.status_code}")
    print(f"  Final URL: {resp.url}")
    print()
