import asyncio
import sys
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright

# ── Multi-language selector helpers ────────────────────────────────

CONNECT_PATTERNS = [
    'button:has-text("Connect"):visible',
    'button:has-text("connecter"):visible',
    'button:has-text("تواصل"):visible',
    'span:has-text("Connect"):visible',
    'span:has-text("connecter"):visible',
    'span:has-text("تواصل"):visible',
    'a:has-text("Connect"):visible',
    'a:has-text("connecter"):visible',
    'a:has-text("تواصل"):visible',
    '[aria-label*="connect" i]:visible',
    '[data-control-name="connect"]:visible',
]

INVITE_CONNECT_PATTERNS = [
    '[role="menuitem"]:has-text("Invite"):visible',
    '[role="menuitem"]:has-text("Inviter"):visible',
    '[role="menu"] button:has-text("Invite"):visible',
    'button:has-text("Invite"):visible',
    # Arabic: "دعوة" = Invite (in menuitem context)
    '[role="menuitem"]:has-text("دعوة"):visible',
    'button:has-text("دعوة"):visible',
]

MORE_PATTERNS = [
    'button:has-text("More"):visible',
    'button:has-text("Plus"):visible',
    'button:has-text("المزيد"):visible',
    'button[aria-label*="More" i]:visible',
    'button[aria-label*="Plus" i]:visible',
    'button[aria-label*="المزيد"]:visible',
]

FOLLOWING_PATTERNS = [
    'button:has-text("Following"):visible',
    'button:has-text("Suivi"):visible',
    'button:has-text("يتابع"):visible',
]

CONNECT_IN_MENU_PATTERNS = [
    '[role="menu"] button:has-text("Connect"):visible',
    '[role="menu"] button:has-text("connecter"):visible',
    '[role="menu"] button:has-text("تواصل"):visible',
    '[role="menuitem"]:has-text("Connect"):visible',
    '[role="menuitem"]:has-text("connecter"):visible',
    '[role="menuitem"]:has-text("تواصل"):visible',
    # Arabic: "دعوة للتواصل" or just "دعوة" in menuitem
    '[role="menuitem"]:has-text("دعوة"):visible',
    '[role="menu"] button:has-text("دعوة"):visible',
]

NOTE_TEXTAREA_PATTERNS = [
    'textarea[name="message"]:visible',
    'textarea[id="connect-cta"]:visible',
    'textarea[placeholder*="note" i]:visible',
    'textarea[placeholder*="Add" i]:visible',
    'textarea[placeholder*="ajouter" i]:visible',
    'textarea[placeholder*="إضافة" i]:visible',
    'textarea[placeholder*="Message" i]:visible',
    'div[role="textbox"][contenteditable="true"]:visible',
]

ADD_NOTE_PATTERNS = [
    'button:has-text("Add a note"):visible',
    'button:has-text("Ajouter"):visible',
    'button:has-text("إضافة"):visible',
    'button[aria-label*="note" i]:visible',
    '[aria-label*="Add a note" i]:visible',
]

SEND_PATTERNS = [
    'button:has-text("Send"):visible',
    'button:has-text("Envoyer"):visible',
    'button:has-text("إرسال"):visible',
    'button[aria-label*="Send" i]:visible',
    'button[aria-label*="Envoyer" i]:visible',
    '[data-control-name="invite"]:visible',
]

SEND_WITHOUT_NOTE_PATTERNS = [
    'button:has-text("Send without a note"):visible',
    'button[aria-label*="Send without a note" i]:visible',
    # Arabic: "إرسال بدون ملاحظة"
    'button:has-text("بدون ملاحظة"):visible',
    'button[aria-label*="بدون ملاحظة" i]:visible',
]

DISMISS_PATTERNS = [
    'button:has-text("Dismiss"):visible',
    'button:has-text("Ignorer"):visible',
    'button:has-text("تجاهل"):visible',
    'button[aria-label*="Dismiss" i]:visible',
]

PREMIUM_UPSELL_PATTERNS = [
    # "Try Premium" upsell modal that blocks interaction
    'a:has-text("Try now for MAD"):visible',
    'a:has-text("Try Premium"):visible',
    'a:has-text("Try now"):visible',
    'button:has-text("Try now"):visible',
    # Generic close/maybe-later buttons inside premium modals
    'button[aria-label*="Dismiss" i]:visible',
    'button:has-text("Not now"):visible',
    'button:has-text("Maybe later"):visible',
    # Arabic: "جرب الآن" = Try now, "جرب بريميوم" = Try Premium
    'a:has-text("جرب الآن"):visible',
    'a:has-text("جرب بريميوم"):visible',
    'button:has-text("جرب"):visible',
    # Arabic: "ليس الآن" = Not now, "ربما لاحقاً" = Maybe later
    'button:has-text("ليس الآن"):visible',
    'button:has-text("ربما لاحقاً"):visible',
]

# Shadow DOM / notification popovers that interfere with clicks
SHADOW_POPOVER_PATTERNS = [
    '[data-testid*="interop-shadowdom"] button:visible',
    '[data-testid*="shadow"] button:visible',
    'div[data-testid*="notification"] button:visible',
    'div[role="dialog"] button:has-text("Dismiss"):visible',
    'div[role="alert"] button:visible',
    # Arabic: dialog with تجاهل (Dismiss)
    'div[role="dialog"] button:has-text("تجاهل"):visible',
]


async def find_element(page, patterns, timeout_ms=3000):
    """Try each selector pattern with a short timeout, return first match."""
    for pat in patterns:
        try:
            el = await page.wait_for_selector(pat, timeout=timeout_ms)
            if el and await el.is_visible():
                return el
        except Exception:
            continue
    return None


async def click_via_js(page, element):
    """Click an element via JavaScript as a robust fallback."""
    try:
        await element.scroll_into_view_if_needed()
        await element.click()
    except Exception:
        try:
            await page.evaluate("el => el.click()", element)
        except Exception:
            pass


async def dismiss_blockers(page):
    """Dismiss any modals, popups, premium upsells, or shadow DOM popovers."""
    dismissed_any = True
    attempts = 0
    while dismissed_any and attempts < 5:
        dismissed_any = False
        attempts += 1

        # Check premium upsell first
        upsell = await find_element(page, PREMIUM_UPSELL_PATTERNS, timeout_ms=1500)
        if upsell:
            await click_via_js(page, upsell)
            await page.wait_for_timeout(500)
            dismissed_any = True

        # Check shadow DOM popovers
        popover = await find_element(page, SHADOW_POPOVER_PATTERNS, timeout_ms=1000)
        if popover:
            await click_via_js(page, popover)
            await page.wait_for_timeout(500)
            dismissed_any = True

        # General dismiss buttons
        dismiss_btn = await find_element(page, DISMISS_PATTERNS, timeout_ms=1000)
        if dismiss_btn:
            await click_via_js(page, dismiss_btn)
            await page.wait_for_timeout(500)
            dismissed_any = True


async def find_connect_button(page):
    """Try all strategies to find a Connect button on a LinkedIn profile."""
    # 1. Direct Connect button
    btn = await find_element(page, CONNECT_PATTERNS, timeout_ms=3000)
    if btn:
        return btn, "direct"

    # 2. "Following" dropdown
    following = await find_element(page, FOLLOWING_PATTERNS)
    if following:
        await click_via_js(page, following)
        await page.wait_for_timeout(1500)
        btn = await find_element(page, CONNECT_IN_MENU_PATTERNS, timeout_ms=2000)
        if btn:
            return btn, "following_dropdown"
        # Also try "Invite" pattern
        btn = await find_element(page, INVITE_CONNECT_PATTERNS, timeout_ms=2000)
        if btn:
            return btn, "following_dropdown_invite"

    # 3. "More" dropdown
    more = await find_element(page, MORE_PATTERNS)
    if more:
        await click_via_js(page, more)
        await page.wait_for_timeout(1500)
        btn = await find_element(page, CONNECT_IN_MENU_PATTERNS, timeout_ms=2000)
        if btn:
            return btn, "more_dropdown"
        btn = await find_element(page, INVITE_CONNECT_PATTERNS, timeout_ms=2000)
        if btn:
            return btn, "more_dropdown_invite"

    return None, None


async def diagnose(page) -> str:
    """Check common states and return a diagnostic message."""
    page_text = await page.inner_text("body")
    lowtext = page_text.lower()

    if ("message" in lowtext and "block" not in lowtext) or "رسالة" in lowtext:
        return "Already connected (Message button visible)"
    if "following" in lowtext or "suivi" in lowtext or "يتابع" in lowtext:
        return "Following but no Connect found in dropdown"
    if "pending" in lowtext or "en attente" in lowtext or "قيد الانتظار" in lowtext:
        return "Connection request already pending"
    if "sign in" in lowtext or "join now" in lowtext[:800] or "تسجيل الدخول" in lowtext[:800]:
        return "LinkedIn requires login — sign in through the browser first"
    return "Connect button not found on profile page"


async def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": 'Usage: linkedin_connect_sender.py <contact_url> <profile_dir> <dm_file>'}))
        sys.exit(1)

    contact_url = sys.argv[1]
    profile_dir = sys.argv[2]
    dm_file = sys.argv[3]

    dm_text = Path(dm_file).read_text(encoding="utf-8")
    Path(dm_file).unlink(missing_ok=True)

    dm_text = dm_text[:200]

    profile_path = Path(profile_dir) / "profile"

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=str(profile_path),
            headless=False,
            locale="en-US",
            timezone_id="America/New_York",
            args=["--start-maximized", "--lang=en-US"],
            viewport=None,
            extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
        )
        page = await browser.new_page()
        page.set_default_timeout(15000)

        # ── 1. Navigate to profile ──
        await page.goto(contact_url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)

        # ── 2. Dismiss any blockers before interacting ──
        await dismiss_blockers(page)
        await page.wait_for_timeout(1000)

        # ── 3. Find the Connect button ──
        connect_btn, method = await find_connect_button(page)

        if not connect_btn:
            # Try once more after dismissing blockers + small wait
            await dismiss_blockers(page)
            await page.wait_for_timeout(1500)
            connect_btn, method = await find_connect_button(page)

        if not connect_btn:
            note = await diagnose(page)
            print(json.dumps({"error": note}))
            await page.wait_for_timeout(2000)
            await browser.close()
            return

        await click_via_js(page, connect_btn)
        await page.wait_for_timeout(2000)

        # ── 4. Dismiss any popup that appeared after clicking Connect ──
        await dismiss_blockers(page)
        await page.wait_for_timeout(500)

        # ── 5. Fill in the note ──
        note_input = await find_element(page, NOTE_TEXTAREA_PATTERNS, timeout_ms=3000)

        if not note_input:
            add_note_btn = await find_element(page, ADD_NOTE_PATTERNS, timeout_ms=3000)
            if add_note_btn:
                await click_via_js(page, add_note_btn)
                await page.wait_for_timeout(1000)
                note_input = await find_element(page, NOTE_TEXTAREA_PATTERNS, timeout_ms=3000)

        if note_input:
            # Focus the input first (may need multiple attempts on slow UIs)
            for attempt in range(3):
                try:
                    await note_input.click()
                    await page.wait_for_timeout(200)
                    await note_input.fill("")
                    await page.wait_for_timeout(100)
                    await note_input.fill(dm_text)
                    await page.wait_for_timeout(300)
                    current_val = await note_input.input_value()
                    # contenteditable divs use textContent instead
                    if not current_val:
                        current_val = await page.evaluate("el => el.textContent", note_input)
                    if current_val and len(current_val) > 5:
                        break
                except Exception:
                    # Try locating the element again (might have been detached)
                    note_input = await find_element(page, NOTE_TEXTAREA_PATTERNS, timeout_ms=2000)
                    if not note_input:
                        break

            await page.wait_for_timeout(500)

            # ── 6. Dismiss any popover that appeared after filling note ──
            await dismiss_blockers(page)
            await page.wait_for_timeout(500)

            # ── 7. Click Send ──
            send_btn = await find_element(page, SEND_PATTERNS, timeout_ms=3000)
            if send_btn:
                await click_via_js(page, send_btn)
                await page.wait_for_timeout(2000)
                print(json.dumps({"status": "sent", "message": "Connection request sent successfully."}))
                await browser.close()
                return

            # ── 8. Fallback: try "Send without a note" ──
            send_fallback = await find_element(page, SEND_WITHOUT_NOTE_PATTERNS, timeout_ms=2000)
            if send_fallback:
                await click_via_js(page, send_fallback)
                await page.wait_for_timeout(2000)
                print(json.dumps({"status": "sent", "message": "Connection request sent (without note)."}))
                await browser.close()
                return

            # ── 9. Retry: dismiss blockers and try again ──
            await dismiss_blockers(page)
            await page.wait_for_timeout(1000)
            send_btn = await find_element(page, SEND_PATTERNS, timeout_ms=3000)
            if send_btn:
                await click_via_js(page, send_btn)
                await page.wait_for_timeout(2000)
                print(json.dumps({"status": "sent", "message": "Connection request sent (retry)."}))
                await browser.close()
                return

            send_fallback = await find_element(page, SEND_WITHOUT_NOTE_PATTERNS, timeout_ms=2000)
            if send_fallback:
                await click_via_js(page, send_fallback)
                await page.wait_for_timeout(2000)
                print(json.dumps({"status": "sent", "message": "Connection request sent (without note, retry)."}))
                await browser.close()
                return

            print(json.dumps({"error": "Send button not found in connection modal"}))
        else:
            # No note textarea found — try "Send without a note" directly
            await dismiss_blockers(page)
            send_fallback = await find_element(page, SEND_WITHOUT_NOTE_PATTERNS, timeout_ms=3000)
            if send_fallback:
                await click_via_js(page, send_fallback)
                await page.wait_for_timeout(2000)
                print(json.dumps({"status": "sent", "message": "Connection request sent (without note)."}))
                await browser.close()
                return

            send_btn = await find_element(page, SEND_PATTERNS, timeout_ms=3000)
            if send_btn:
                await click_via_js(page, send_btn)
                await page.wait_for_timeout(2000)
                print(json.dumps({"status": "sent", "message": "Connection request sent successfully."}))
                await browser.close()
                return

            print(json.dumps({"error": "Note textarea not found in connection modal"}))

        await page.wait_for_timeout(2000)
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
