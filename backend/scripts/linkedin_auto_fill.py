import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright


async def main():
    if len(sys.argv) < 4:
        print("Usage: linkedin_auto_fill.py <job_url> <profile_dir> <resume_path>")
        sys.exit(1)

    job_url = sys.argv[1]
    profile_dir = sys.argv[2]
    resume_path = sys.argv[3] if sys.argv[3] != "None" else None

    profile_path = Path(profile_dir) / "profile"

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=str(profile_path),
            headless=False,
            args=["--start-maximized"],
            viewport=None,
        )
        page = await browser.new_page()
        page.set_default_timeout(60000)

        await page.goto(job_url, wait_until="load", timeout=60000)

        try:
            login_link = await page.wait_for_selector('a[href*="login"], a[href*="signup"]', timeout=5000)
            if login_link:
                await page.goto("https://www.linkedin.com/login", wait_until="load")
                await page.wait_for_timeout(1000)
                print("Login required. Log in through the browser window, then press Enter to continue.")
                await page.pause()
                await page.goto(job_url, wait_until="load", timeout=60000)
        except Exception:
            pass

        try:
            easy_apply = await page.wait_for_selector(
                'button:has-text("Easy Apply"), button:has-text("Candidature simple")',
                timeout=10000,
            )
            if easy_apply:
                await easy_apply.click()
                await page.wait_for_timeout(2000)
        except Exception:
            pass

        print("Browser open. Form pre-filled if possible. Review and submit manually.")
        await page.pause()
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
