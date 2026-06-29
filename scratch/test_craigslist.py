from craigslist import CraigslistHousing
import time
import json

def test_scrape():
    print("Testing python-craigslist library...")
    try:
        # Using a reliable site like 'sfbay' (San Francisco Bay Area)
        cl = CraigslistHousing(site='sfbay', area='sfc', filters={'max_price': 2000})
        
        print(f"Fetching approximate results count...")
        count = cl.get_results_approx_count()
        print(f"Approximate count: {count}")
        
        print(f"Fetching first 5 results...")
        results = []
        # Removed geotag=True because it caused TypeError
        for result in cl.get_results(limit=5, sort_by='newest'):
            results.append(result)
            print(f"Found: {result.get('name')} - {result.get('price')}")
            time.sleep(0.5) # Be polite
            
        if results:
            print("\nSUCCESS: Library is still working in 2026!")
            # Save results for inspection
            with open('craigslist_test_results.json', 'w') as f:
                json.dump(results, f, indent=2)
        else:
            print("\nWARNING: No results found. This could mean no matches or the library is broken.")
            
    except Exception as e:
        print(f"\nFAILURE: An error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_scrape()
