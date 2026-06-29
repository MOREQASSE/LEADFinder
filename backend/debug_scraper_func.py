"""Debug the _fetch_site_category function."""
import sys
import asyncio
sys.path.insert(0, ".")

from scrapers.craigslist import _fetch_site_category

async def test():
    results = await asyncio.to_thread(
        _fetch_site_category, "sfbay", "cps", "website", 5
    )
    print(f"Got {len(results)} results")
    for r in results[:3]:
        print(f"  {r}")

asyncio.run(test())
