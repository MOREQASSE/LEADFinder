"""Decode Craigslist compressed format using detailsOrder/resultsOrder."""
import httpx
import json

url = "https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"
resp = httpx.get(url, timeout=30, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
})
data = resp.json()
d = data["data"]
print("detailsOrder:", d.get("detailsOrder"))
print("resultsOrder:", d.get("resultsOrder"))
print()

# The items are arrays. Let me check if the order matches detailsOrder or resultsOrder
items = d.get("items", [])
if items:
    item = items[0]
    print(f"Item length: {len(item)}, detailsOrder length: {len(d.get('detailsOrder', []))}")
    print(f"resultsOrder: {d.get('resultsOrder')}")
    
    # Check if there's a mapping
    for order_key in ["detailsOrder", "resultsOrder"]:
        order = d.get(order_key)
        if order and len(order) == len(item):
            print(f"\nMapping using {order_key}:")
            for i, (key, val) in enumerate(zip(order, item)):
                print(f"  {key}: {str(val)[:120]}")
