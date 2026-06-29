"""Debug Craigslist response."""
import httpx

resp = httpx.get(
    "https://sfbay.craigslist.org/search/cps?query=website",
    follow_redirects=True,
    timeout=30,
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    }
)
print("Status:", resp.status_code)
print("Final URL:", resp.url)
print()
# Check for JS redirect or captcha
body = resp.text
print("First 2000 chars:")
print(body[:2000])
print()
print("..." if len(body) > 2000 else "")
# Check for common anti-bot patterns
for pattern in ["captcha", "verify", "blocked", "automated", "cookie"]:
    if pattern in body[:5000].lower():
        print(f"Found '{pattern}' in response")
