"""Look at decode fields and try to understand the posting ID."""
import httpx
import json

api_url = "https://sapi.craigslist.org/web/v8/postings/search/full?batch=1-0-360-0-0&query=website&searchPath=cps&lang=en&cc=us"
resp = httpx.get(api_url, timeout=30, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
})
data = resp.json()
d = data["data"]
decode = d["decode"]

print("decode fields:")
for k, v in decode.items():
    if isinstance(v, list):
        print(f"  {k}: list len={len(v)}, sample={v[:3]}")
    elif isinstance(v, dict):
        print(f"  {k}: dict keys={list(v.keys())[:5]}")
    elif isinstance(v, (int, float)):
        print(f"  {k}: {v}")
    else:
        print(f"  {k}: {str(v)[:100]}")

print()

# Check item[1] — could it be a timestamp?
import datetime
for item in d["items"][:3]:
    pid = item[0]  # 6425127
    second = item[1]  # 2531278
    print(f"item[0]={pid}, item[1]={second}")
    # Try treating item[1] as unix timestamp
    try:
        dt = datetime.datetime.fromtimestamp(second)
        print(f"  as timestamp: {dt}")
    except:
        print(f"  not a timestamp")
    
    # Check the URL from the HTML attribute 'data-pid'
    # This was 7933656878 in the rendered page
    # Maybe item[0] is a different kind of ID
    
    # What if the actual posting ID is a combination of item[0] and item[1]?
    combined = int(f"{item[0]}{item[1]}")
    print(f"  combined: {combined}")

    # Check the batch param: batch=1-0-360-0-0
    # Maybe item[0] needs an offset
    batch_offset = 0  # from batch=1-0-360-0-0, second part is 0
    actual_pid = pid + batch_offset
    print(f"  pid + offset: {actual_pid}")
    print()
