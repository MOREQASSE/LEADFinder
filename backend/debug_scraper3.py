"""Test the actual _fetch_site_category from the scraper module."""
import sys
import asyncio
sys.path.insert(0, ".")

from scrapers.craigslist import _fetch_site_category

async def test():
    print("Calling _fetch_site_category('sfbay', 'cps', 'website', 5)")
    try:
        results = await asyncio.to_thread(_fetch_site_category, "sfbay", "cps", "website", 5)
        print(f"Got {len(results)} results")
        if results:
            for r in results[:3]:
                print(f"  {r['title'][:60]} | {r['url']}")
        else:
            print("NO RESULTS - something is wrong")
    except Exception as e:
        import traceback
        print(f"ERROR: {e}")
        traceback.print_exc()

asyncio.run(test())
