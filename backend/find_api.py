"""Find Craigslist's JSON API endpoint for search results."""
import httpx
import re

resp = httpx.get(
    "https://sfbay.craigslist.org/search/cps?query=website",
    follow_redirects=True,
    timeout=30,
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    }
)
body = resp.text

# Look for API URLs or JSON data
# Check for data URL patterns
for m in re.finditer(r'(https?://[^"\']+(?:json|api|search)[^"\']*)', body[:20000]):
    print("API-like URL:", m.group())

# Look for any script with JSON data
for m in re.finditer(r'<script[^>]*>(.*?)</script>', body, re.DOTALL):
    content = m.group(1).strip()
    if content and ('search' in content.lower() or 'result' in content.lower() or 'json' in content.lower()):
        print("Script content (first 500 chars):", content[:500])
        print()

# Check for fetch/XHR calls
for m in re.finditer(r'(?:fetch|axios|\.get)\s*\(\s*["\']([^"\']+)["\']', body[:50000]):
    print("XHR URL:", m.group(1))

# Check if there's a graphql or api subdomain
for m in re.finditer(r'(craigslist\.org[^"\']*(?:api|json|graphql)[^"\']*)', body):
    print("API path:", m.group())
