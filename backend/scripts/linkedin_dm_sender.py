import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright


async def main():
    if len(sys.argv) < 4:
        print("Usage: linkedin_dm_sender.py <contact_url> <profile_dir> <dm_file>")
        sys.exit(1)

    contact_url = sys.argv[1]
    profile_dir = sys.argv[2]
    dm_file = sys.argv[3]

    dm_text = Path(dm_file).read_text(encoding="utf-8")
    Path(dm_file).unlink(missing_ok=True)

    profile_path = Path(profile_dir) / "profile"

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=str(profile_path),
            headless=False,
            args=["--start-maximized"],
            viewport=None,
        )
        page = await browser.new_page()

        await page.goto(contact_url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)

        try:
            msg_btn = await page.wait_for_selector(
                'button:has-text("Message"), a:has-text("Message")',
                timeout=8000,
            )
            if msg_btn:
                await msg_btn.click()
                await page.wait_for_timeout(2000)
        except Exception:
            pass

        try:
            msg_input = await page.wait_for_selector(
                'div[role="textbox"][contenteditable="true"]',
                timeout=5000,
            )
            if msg_input:
                await msg_input.fill(dm_text)
        except Exception:
            pass

        print("DM text pasted. Review and click Send.")
        await page.pause()
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
