import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from scrapers.linkedin import LinkedInScraper

async def test_integrated_scraper():
    print("Initializing LinkedInScraper...")
    scraper = LinkedInScraper(db=None) # No DB, will use defaults
    print("Calling scrape()...")
    leads = await scraper.scrape()
    print(f"Scrape complete. Found {len(leads)} leads.")
    if len(leads) > 0:
        for i, lead in enumerate(leads[:3]):
            print(f"Lead {i}: {lead.title} at {lead.author}")
    else:
        print("No leads found. Checking linkedin_debug.log...")
        if os.path.exists("linkedin_debug.log"):
            with open("linkedin_debug.log", "r") as f:
                print(f.read())

if __name__ == "__main__":
    asyncio.run(test_integrated_scraper())
