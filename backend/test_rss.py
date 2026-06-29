"""Try Craigslist RSS feed for search results."""
import httpx
import feedparser

url = "https://sfbay.craigslist.org/search/cps?query=website&format=rss"
resp = httpx.get(url, follow_redirects=True, timeout=30, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
})
print("Status:", resp.status_code)
print("Content-Type:", resp.headers.get("content-type"))
print("URL:", resp.url)
print()
# Try parsing as RSS
feed = feedparser.parse(resp.text)
print(f"Feed entries: {len(feed.entries)}")
if feed.entries:
    for e in feed.entries[:3]:
        print(f"  title: {e.get('title', '?')[:80]}")
        print(f"  link: {e.get('link', '?')}")
        print(f"  summary: {e.get('summary', '')[:120]}")
        print()
