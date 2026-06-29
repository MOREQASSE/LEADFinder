"""Test the full CraigslistScraper class."""
import sys
import asyncio
sys.path.insert(0, ".")

from scrapers.craigslist import CraigslistScraper

async def test():
    scraper = CraigslistScraper(db=None)
    results = await scraper.scrape()
    print(f"Got {len(results)} leads total")
    for r in results[:5]:
        print(f"  {r.title[:60]}")
        print(f"  URL: {r.url}")
        print(f"  Desc: {r.description[:60]}")
        print()

asyncio.run(test())
