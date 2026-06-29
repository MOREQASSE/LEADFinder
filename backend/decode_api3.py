"""Decode Craigslist API response to get usable data."""
import httpx
import json

url = "https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"
resp = httpx.get(url, timeout=30, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
})
data = resp.json()
d = data["data"]

# Check decode data
decode = d.get("decode", {})
print("decode keys:", list(decode.keys()))

# locations might map area IDs
locations = decode.get("locations")
if locations:
    print(f"locations type: {type(locations)}")
    if isinstance(locations, list):
        print(f"locations sample: {locations[:5]}")

# Check if there's an area-to-slug mapping
# The areas dict has numeric keys
areas = d.get("areas", {})
for area_id, area_info in areas.items():
    print(f"Area {area_id}: {area_info}")

# Now let's try to build items by decoding the compressed format
# Item[4] looks like "area:neighborhood:subarea~lat~lon"
# Splitting on ~ gives location data, splitting on : gives area codes
items = d.get("items", [])
print(f"\nDecoding {len(items)} items...")

# Let's look at the first few items' geo strings and what they might mean
for item in items[:3]:
    geo = item[4]
    parts = geo.split("~")
    location_ref = parts[0]
    lat = parts[1] if len(parts) > 1 else ""
    lon = parts[2] if len(parts) > 2 else ""
    
    # The location_ref seems like "area_id:subarea:something"
    loc_parts = location_ref.split(":")
    print(f"\n  Title: {item[10][:60]}")
    print(f"  geo: {geo}")
    print(f"  loc_parts: {loc_parts}")
    print(f"    area_idx: {locations[0] if locations else 'no locations'}")
    
    # item[2] = category ID
    # Let me also try constructing URL from category and posting ID
    post_id = item[0]
    slug = item[9][1] if len(item[9]) > 1 else ""
    print(f"  post_id: {post_id}, slug: {slug}")
    
    # The URL from rendered page used area codes like 'nby', 'sfc', 'eby'
    # These might map to location IDs in the decode data
