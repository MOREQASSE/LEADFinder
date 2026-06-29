"""Debug the python-craigslist error."""
import sys
import traceback
sys.path.insert(0, ".")

from craigslist import CraigslistServices

try:
    cl = CraigslistServices(site="sfbay", category="cps", filters={"query": "website"})
    print("URL:", cl.url)
    print("Filters:", cl.filters)
    results = list(cl.get_results(limit=5))
    print(f"Results: {len(results)}")
    for r in results:
        print(r)
except Exception:
    traceback.print_exc()
