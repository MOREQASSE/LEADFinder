"""Quick test for the new craigslist scraper."""
import sys
import asyncio

sys.path.insert(0, ".")  # noqa

from scrapers.craigslist import _fetch_category, _text_matches_keywords, _text_matches_exclude

async def test():
    print("=== Test 1: _fetch_category sfbay cps ===")
    results = await asyncio.to_thread(_fetch_category, "sfbay", None, "cps", {"query": "website"}, 5)
    print(f"Got {len(results)} results")
    for r in results[:3]:
        print(f'  name={r.get("name","?")[:60]}  where={r.get("where","")}  url={r.get("url","")}')

    print()
    print("=== Test 2: _fetch_category sfbay sof ===")
    results2 = await asyncio.to_thread(_fetch_category, "sfbay", None, "sof", {"query": "website"}, 5)
    print(f"Got {len(results2)} results")
    for r in results2[:3]:
        print(f'  name={r.get("name","?")[:60]}  where={r.get("where","")}  url={r.get("url","")}')

    print()
    print("=== Test 3: keyword matching ===")
    combined = "website developer needed for project"
    kws = ["website", "web", "developer"]
    print(f"Matches keywords {kws}: {_text_matches_keywords(combined, kws)}")
    exc = ["free", "cheap"]
    print(f"Matches exclude {exc}: {_text_matches_exclude(combined, exc)}")

if __name__ == "__main__":
    asyncio.run(test())
