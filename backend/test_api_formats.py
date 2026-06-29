"""Try different Craigslist API endpoints."""
import httpx
import json

base_url = "https://sfbay.craigslist.org/search/cps"

# Try various API formats
endpoints = [
    f"{base_url}?query=website&format=json",
    f"{base_url}?query=website&s=0&format=json",
    f"{base_url}/json?query=website",
]

for url in endpoints:
    try:
        resp = httpx.get(url, follow_redirects=True, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        print(f"URL: {url}")
        print(f"  Status: {resp.status_code}")
        print(f"  Content-Type: {resp.headers.get('content-type', 'N/A')}")
        body = resp.text[:500].replace('\n', '\\n')
        print(f"  Body preview: {body[:200]}")
        print()
    except Exception as e:
        print(f"URL: {url} -> Error: {e}")
        print()
