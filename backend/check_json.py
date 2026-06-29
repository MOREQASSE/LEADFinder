"""Test Craigslist JSON format endpoint."""
import httpx
import json

api_url = "https://sfbay.craigslist.org/search/cps?query=website&format=json"
resp = httpx.get(
    api_url,
    follow_redirects=True,
    timeout=30,
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    }
)
print("Status:", resp.status_code)
print("Content-Type:", resp.headers.get("content-type"))
print("URL:", resp.url)
print()
print("Response preview (first 1000 chars):")
print(resp.text[:1000])
