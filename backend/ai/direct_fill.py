import logging
import re
from playwright.async_api import async_playwright
from models import ResumeData

logger = logging.getLogger(__name__)


def _parse_name(name: str) -> tuple[str, str]:
    parts = name.strip().split(" ", 1)
    return parts[0] if parts else "", parts[1] if len(parts) > 1 else ""


def _parse_phone(phone: str) -> tuple[str, str]:
    m = re.match(r'^\+(\d{1,3})(.+)$', phone.strip())
    if m:
        return f"+{m.group(1)}", m.group(2).strip()
    return "", phone.strip()


def _extract_city(location: str) -> str:
    if not location:
        return ""
    cleaned = re.sub(r'^\d+\s+[^,]+,\s*', '', location)
    parts = re.split(r'[,.\n]+', cleaned)
    countries = {"morocco", "usa", "united states", "uk", "united kingdom",
                 "canada", "australia", "france", "germany", "spain", "italy"}
    candidates = [p.strip() for p in parts
                  if p.strip() and p.strip().lower() not in countries]
    return candidates[0] if candidates else (parts[0].strip() if parts else "")


_COUNTRY_CODE_MAP = {
    "+212": "morocco", "+1": "usa", "+44": "uk", "+33": "france",
    "+49": "germany", "+34": "spain", "+39": "italy", "+61": "australia",
    "+81": "japan", "+86": "china", "+91": "india", "+55": "brazil",
    "+7": "russia", "+82": "south korea", "+31": "netherlands",
    "+46": "sweden", "+47": "norway", "+45": "denmark", "+358": "finland",
    "+353": "ireland", "+351": "portugal", "+41": "switzerland",
    "+43": "austria", "+32": "belgium", "+48": "poland", "+420": "czech",
    "+36": "hungary", "+40": "romania", "+30": "greece", "+90": "turkey",
    "+966": "saudi arabia", "+971": "uae", "+972": "israel",
    "+852": "hong kong", "+65": "singapore", "+60": "malaysia",
    "+63": "philippines", "+62": "indonesia", "+84": "vietnam",
    "+66": "thailand", "+92": "pakistan", "+880": "bangladesh",
    "+20": "egypt", "+27": "south africa", "+234": "nigeria",
    "+254": "kenya", "+233": "ghana",
}


async def fill_contact_page(cdp_url: str, resume: ResumeData) -> bool:
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.connect_over_cdp(cdp_url)

            page = None
            for ctx in browser.contexts:
                for pg in ctx.pages:
                    url = pg.url
                    if "linkedin.com" in url and ("jobs" in url or "job" in url):
                        page = pg
                        break
                if page:
                    break
            if not page:
                for ctx in browser.contexts:
                    if ctx.pages:
                        page = ctx.pages[-1]
                        break
            if not page:
                return False

            easy_apply_btn = page.get_by_role(
                "button", name=re.compile(r"Easy Apply", re.IGNORECASE))
            try:
                await easy_apply_btn.wait_for(timeout=5000)
                await easy_apply_btn.click()
                await page.wait_for_timeout(1500)
            except Exception:
                pass

            first_name, last_name = _parse_name(resume.name or "")
            country_code, local_number = _parse_phone(resume.phone or "")
            city = _extract_city(resume.location or "")

            filled = 0

            if first_name:
                try:
                    inp = page.get_by_role(
                        "textbox", name=re.compile(r"First name", re.IGNORECASE))
                    if await inp.is_visible(timeout=800):
                        await inp.fill(first_name)
                        filled += 1
                except Exception:
                    pass

            if last_name:
                try:
                    inp = page.get_by_role(
                        "textbox", name=re.compile(r"Last name", re.IGNORECASE))
                    if await inp.is_visible(timeout=800):
                        await inp.fill(last_name)
                        filled += 1
                except Exception:
                    pass

            if local_number:
                try:
                    inp = page.get_by_role(
                        "textbox", name=re.compile(r"Phone|Mobile", re.IGNORECASE))
                    if await inp.is_visible(timeout=800):
                        await inp.fill(local_number)
                        filled += 1
                except Exception:
                    pass

            if country_code:
                try:
                    country_label = _COUNTRY_CODE_MAP.get(country_code, "")
                    if country_label:
                        dd = page.get_by_role(
                            "combobox", name=re.compile(
                                r"country|code|dial", re.IGNORECASE))
                        if await dd.is_visible(timeout=800):
                            await dd.select_option(
                                re.compile(re.escape(country_label), re.IGNORECASE))
                            filled += 1
                        else:
                            dd = page.locator(
                                "select").filter(has_text=re.compile(
                                    re.escape(country_code), re.IGNORECASE))
                            if await dd.is_visible(timeout=500):
                                await dd.select_option(
                                    re.compile(
                                        re.escape(country_label), re.IGNORECASE))
                                filled += 1
                except Exception:
                    pass

            if city:
                try:
                    inp = page.get_by_test_id("typeahead-input")
                    if await inp.is_visible(timeout=800):
                        await inp.click()
                        await inp.fill(city)
                        await page.wait_for_timeout(800)
                        try:
                            suggestion = page.get_by_role(
                                "button").filter(
                                has_text=re.compile(
                                    re.escape(city), re.IGNORECASE)).first
                            await suggestion.click(timeout=3000)
                            filled += 1
                        except Exception:
                            filled += 1
                except Exception:
                    pass

            if filled == 0:
                return False

            try:
                next_btn = page.get_by_role(
                    "button", name=re.compile(r"Next", re.IGNORECASE))
                await next_btn.click(timeout=5000)
                await page.wait_for_timeout(1500)
            except Exception:
                pass

            logger.info(
                "direct_fill: filled %d fields and clicked Next", filled)
            return True

    except Exception as e:
        logger.warning("direct_fill failed: %s", e)
        return False
