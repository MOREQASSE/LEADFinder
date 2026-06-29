"""Test the new Playwright-based Craigslist scraper."""
import sys
import asyncio
sys.path.insert(0, ".")

from scrapers.craigslist import _fetch_site_category

async def test():
    print("Fetching sfbay/cps with query=website...")
    results = await asyncio.to_thread(
        _fetch_site_category, "sfbay", "cps", "website", 5
    )
    print(f"Got {len(results)} results")
    for r in results[:5]:
        print(f"  {r['title'][:70]}")
        print(f"  {r['url']}")
        print()

if __name__ == "__main__":
    asyncio.run(test())
