"""Test the API-based Craigslist scraper."""
import sys
import asyncio
sys.path.insert(0, ".")

from scrapers.craigslist import _api_category

async def test():
    results = await asyncio.to_thread(_api_category, "sfbay", "cps", "website")
    print(f"Got {len(results)} results")
    for r in results[:5]:
        print(f"  {r['title'][:60]}")
        print(f"  URL: {r['url']}")
        print(f"  Location: {r['location']}")
        print()

asyncio.run(test())
