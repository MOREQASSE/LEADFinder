"""Check Craigslist search result HTML structure in detail."""
import httpx
from bs4 import BeautifulSoup

resp = httpx.get("https://sfbay.craigslist.org/search/cps?query=website", follow_redirects=True, timeout=30)
soup = BeautifulSoup(resp.text, "html.parser")

# Find the results container
container = soup.find("div", class_="cl-static-search-results")
if container:
    results = container.find_all("div", class_="cl-static-search-result")
    print(f"Found {len(results)} results")
    for r in results[:3]:
        print("---")
        print(r.prettify()[:800])
else:
    print("No cl-static-search-results container found")
    # Try alternate patterns
    print("Searching for any result-like divs...")
    for div in soup.find_all("div", class_=True):
        classes = " ".join(div.get("class", []))
        if "result" in classes.lower():
            print("  Found class:", classes)
            print(div.prettify()[:500])
            print("...")
