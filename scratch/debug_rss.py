import feedparser
import requests

url = "https://craigslist.org/search/web?format=rss"
print(f"Testing URL: {url}")

# Try with requests first to see headers/status
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
try:
    resp = requests.get(url, headers=headers)
    print(f"Status Code: {resp.status_code}")
    print(f"Content Length: {len(resp.content)}")
    if resp.status_code == 200:
        feed = feedparser.parse(resp.content)
        print(f"Entries found: {len(feed.entries)}")
        if feed.entries:
            print(f"First entry: {feed.entries[0].title}")
    else:
        print("Response content (first 200 chars):")
        print(resp.text[:200])
except Exception as e:
    print(f"Error: {e}")
