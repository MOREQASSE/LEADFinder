import re
import time
import random
import asyncio
import socket
from datetime import datetime
from urllib.parse import quote, unquote
from typing import Dict

from scrapers.base import BaseScraper, ScrapedLead

_MAX_RESULTS = 60
_active_browsers: Dict[int, int] = {}  # user_id -> CDP port number


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


class GoogleMapsScraper(BaseScraper):
    def __init__(self, db=None):
        super().__init__(db)
        self.platform_name = "Google Maps"

    async def scrape_businesses(self, business_type: str, city: str, country: str, on_progress: callable = None, stop_event=None, user_id: int = None) -> list[ScrapedLead]:
        leads = await self._run_playwright(business_type, city, country, on_progress, stop_event, user_id)
        no_website = [l for l in leads if "No website" in l.description]
        print(f"Google Maps: {len(leads)} total, {len(no_website)} without websites")
        return no_website

    async def _run_playwright(self, business_type, city, country, on_progress=None, stop_event=None, user_id=None) -> list[ScrapedLead]:
        def _sync_scrape():
            from playwright.sync_api import sync_playwright

            results = []
            seen_names = set()
            query = f"{business_type} in {city}, {country}"
            url = f"https://www.google.com/maps/search/{quote(query)}/"
            chrome_port = _find_free_port()

            with sync_playwright() as pw:
                browser = pw.chromium.launch(
                    headless=True,
                    args=[
                        "--disable-blink-features=AutomationControlled",
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        f"--remote-debugging-port={chrome_port}",
                    ],
                )
                if user_id is not None:
                    _active_browsers[user_id] = chrome_port
                context = browser.new_context(
                    viewport={"width": 1440, "height": 900},
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/125.0.0.0 Safari/537.36"
                    ),
                    locale="en-US",
                )
                page = context.new_page()
                page.goto(url, timeout=60000, wait_until="domcontentloaded")

                # Wait for the results feed to appear
                try:
                    page.wait_for_selector('div[role="feed"], .Nv2PK, div[role="article"]', timeout=15000)
                except Exception:
                    print("  No results container found, trying fallback")
                _random_delay(2, 4, stop_event)

                # --- Scroll the results panel to load all available results ---
                _scroll_results_panel(page, stop_event=stop_event)

                # --- Collect all result card elements ---
                cards = _collect_cards(page)
                if not cards:
                    print("  No cards found at all, aborting")
                    try:
                        browser.close()
                    except Exception:
                        pass
                    if user_id is not None:
                        _active_browsers.pop(user_id, None)
                    return []

                print(f"  Collected {len(cards)} cards, processing up to {_MAX_RESULTS}")

                # Reduce Playwright default timeout so extraction fails fast
                page.set_default_timeout(2000)

                # --- Process each card ---
                for idx, card in enumerate(cards):
                    if idx >= _MAX_RESULTS:
                        break
                    if stop_event and stop_event.is_set():
                        print(f"  Scrape stopped by user after {idx} cards")
                        break

                    try:
                        name, card_has_website, card_phone, card_rating, card_reviews, card_place_url = _extract_card_data(card)
                        if not name or len(name) < 2:
                            continue
                        name_lower = name.lower()
                        if name_lower in seen_names:
                            continue
                        seen_names.add(name_lower)

                        if on_progress:
                            on_progress(name, "scraping", idx + 1, min(len(cards), _MAX_RESULTS))

                        # Click card to open details panel
                        try:
                            card.click()
                            _random_delay(1.0, 2.0, stop_event)
                            if stop_event and stop_event.is_set():
                                break
                        except Exception:
                            if on_progress:
                                on_progress(name, "error", idx + 1, min(len(cards), _MAX_RESULTS))
                            continue

                        # Extract rich data from details panel
                        place_url = card_place_url
                        details = _extract_details_panel(page, stop_event=stop_event)

                        phone = details.get("phone") or card_phone
                        address = details.get("address", "")
                        category = details.get("category", "")
                        hours = details.get("hours", "")
                        website_url = details.get("website", "")
                        has_website = card_has_website or bool(website_url)
                        rating = details.get("rating") or card_rating
                        reviews = details.get("reviews") or card_reviews

                        desc_lines = [f"Business: {name}"]
                        if address:
                            desc_lines.append(f"Address: {address}")
                        desc_lines.append(f"Location: {city}, {country}")
                        desc_lines.append(f"Type: {category or business_type}")
                        if rating:
                            desc_lines.append(f"Rating: {rating}" + (f" ({reviews} reviews)" if reviews else ""))
                        if phone:
                            desc_lines.append(f"Phone: {phone}")
                        if hours:
                            desc_lines.append(f"Hours: {hours}")
                        if website_url:
                            desc_lines.append(f"Website: {website_url}")
                        if has_website:
                            desc_lines.append("Has website")
                            if on_progress:
                                on_progress(name, "has_website", idx + 1, min(len(cards), _MAX_RESULTS))
                        else:
                            desc_lines.append("REASON: No website found on Google Maps profile")
                            if on_progress:
                                on_progress(name, "found", idx + 1, min(len(cards), _MAX_RESULTS))

                            # --- Scrape reviews & about features for no-website businesses ---
                            try:
                                _random_delay(0.3, 0.6, stop_event)
                                if stop_event and stop_event.is_set():
                                    break
                                scraped_reviews = _extract_reviews(page, max_reviews=5, stop_event=stop_event)
                                if scraped_reviews:
                                    desc_lines.append("---REVIEWS---")
                                    desc_lines.extend(scraped_reviews)
                                    desc_lines.append("---REVIEWS_END---")
                            except Exception:
                                pass
                            try:
                                _random_delay(0.2, 0.4, stop_event)
                                if stop_event and stop_event.is_set():
                                    break
                                pros, cons = _extract_about_features(page, stop_event=stop_event)
                                if pros:
                                    desc_lines.append("---PROS---")
                                    desc_lines.extend(pros)
                                    desc_lines.append("---PROS_END---")
                                if cons:
                                    desc_lines.append("---CONS---")
                                    desc_lines.extend(cons)
                                    desc_lines.append("---CONS_END---")
                            except Exception:
                                pass

                        results.append(ScrapedLead(
                            title=name,
                            platform="Google Maps",
                            url=place_url or f"https://www.google.com/maps/search/{quote(name)}/{quote(city)}/",
                            description="\n".join(desc_lines),
                            author=phone or "No phone",
                            timestamp=datetime.utcnow(),
                        ))

                        if stop_event and stop_event.is_set():
                            print(f"  Scrape stopped by user after card {idx+1}")
                            break

                        _random_delay(0.8, 2.0, stop_event)

                    except Exception as e:
                        print(f"  Error processing card {idx}: {e}")
                        continue

                try:
                    browser.close()
                except Exception:
                    pass
                if user_id is not None:
                    _active_browsers.pop(user_id, None)
            return results

        try:
            print(f"  Starting Playwright scrape for '{business_type}' in {city}, {country}")
            leads = await asyncio.to_thread(_sync_scrape)
            return leads
        except Exception as e:
            print(f"  Playwright scrape failed: {e}")
            return []

    async def scrape(self) -> list[ScrapedLead]:
        return []


# ---------------------------------------------------------------------------
# Helper functions (called from within the sync thread)
# ---------------------------------------------------------------------------

def _random_delay(lo: float = 0.5, hi: float = 1.5, stop_event=None):
    if stop_event is None:
        time.sleep(random.uniform(lo, hi))
        return
    deadline = time.time() + random.uniform(lo, hi)
    while time.time() < deadline:
        if stop_event.is_set():
            return
        time.sleep(0.1)


def _scroll_results_panel(page, stop_event=None):
    """Scroll the scrollable results container until no new cards load."""
    try:
        feed = page.query_selector('div[role="feed"]')
        scroll_container = feed or page.query_selector('.Nv2PK') or page
    except Exception:
        scroll_container = page

    seen_count = 0
    stall_count = 0

    for attempt in range(30):
        if stop_event and stop_event.is_set():
            print("  Scrolling stopped by user")
            break
        prev_count = _card_count(page)
        if scroll_container == page:
            page.evaluate("window.scrollBy(0, 800)")
        else:
            scroll_container.evaluate("el => el.scrollBy(0, 600)")
        _random_delay(0.6, 1.2, stop_event)

        new_count = _card_count(page)
        if new_count > prev_count:
            stall_count = 0
        else:
            stall_count += 1

        if stall_count >= 4:
            print(f"  Scroll stopped: {new_count} cards loaded (stalled {stall_count}x)")
            break

    print(f"  Finished scrolling, final card count: {_card_count(page)}")


def _card_count(page) -> int:
    """Return the number of result cards currently in the DOM."""
    cards = page.query_selector_all(
        '.Nv2PK, div[role="article"], a[href*="/maps/place/"]'
    )
    return len(cards)


def _collect_cards(page):
    """Collect all result card elements using multiple selectors."""
    cards = page.query_selector_all(".Nv2PK, .THOPZb")
    if not cards:
        cards = page.query_selector_all('div[role="article"]')
    if not cards:
        cards = page.query_selector_all('a[href*="/maps/place/"]')
    # Remove duplicates (same element matched by multiple selectors)
    unique = []
    seen = set()
    for c in cards:
        try:
            h = c.inner_html()
            if h not in seen:
                seen.add(h)
                unique.append(c)
        except Exception:
            unique.append(c)
    return unique


def _extract_card_data(card):
    """Extract name, website-status, phone, rating, and place URL from a result card."""
    try:
        text = card.inner_text() or ""
        html = card.inner_html()
    except Exception:
        return "", False, "", "", "", ""

    if not text.strip():
        return "", False, "", "", "", ""

    lines = [l.strip() for l in text.split("\n") if l.strip()]
    name = lines[0] if lines else ""

    # Extract place URL directly from the card's anchor href (before any click)
    place_url = ""
    try:
        href = card.get_attribute("href") or ""
        if "maps/place/" in href:
            place_url = href
        else:
            # Card may be a div with an <a> child
            anchor = card.query_selector("a[href*='/maps/place/']")
            if anchor:
                place_url = anchor.get_attribute("href") or ""
    except Exception:
        pass

    # Check for external website link in the card
    has_website = False
    try:
        links = card.query_selector_all("a[href]")
        for link in links:
            href = link.get_attribute("href") or ""
            if href.startswith("http") and "google.com" not in href and "gstatic.com" not in href:
                has_website = True
                break
    except Exception:
        pass

    phone_m = re.search(
        r"(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4})",
        text,
    )
    phone = phone_m.group(0) if phone_m else ""

    rating_m = re.search(r"(\d[.,]\d)\s*[⭐★]?\s*\((\d[\d,]*)\)", text)
    rating = rating_m.group(1) if rating_m else ""
    reviews = rating_m.group(2).replace(",", "") if rating_m else ""

    return name, has_website, phone, rating, reviews, place_url


def _extract_details_panel(page, stop_event=None):
    """Extract rich data from the Google Maps details panel.

    Uses data-item-id attributes (locale-independent and stable across updates)
    plus content-based fallbacks. Returns dict with keys:
    phone, address, category, hours, website, rating, reviews.
    """
    data = {
        "phone": "",
        "address": "",
        "category": "",
        "hours": "",
        "website": "",
        "rating": "",
        "reviews": "",
    }

    if stop_event and stop_event.is_set():
        return data

    # ------------------------------------------------------------------
    # Phase 1: Collect & classify all button[data-item-id] elements
    # ------------------------------------------------------------------
    buttons = page.query_selector_all("button[data-item-id]")
    for btn in buttons:
        if stop_event and stop_event.is_set():
            return data
        try:
            item_id = (btn.get_attribute("data-item-id") or "").strip()
            aria = (btn.get_attribute("aria-label") or "").strip()
            text = btn.inner_text().strip()

            # --- Phone ---
            if item_id.startswith("phone"):
                val = text or aria
                for prefix in ("Phone", "Téléphone", "Telephone", "Tel", "Фото", "Tél"):
                    for sep in ("", ":", ": ", " :"):
                        if val.startswith(prefix + sep):
                            val = val[len(prefix + sep):].strip()
                            break
                if val and not data["phone"]:
                    data["phone"] = val

            # --- Address ---
            if item_id.startswith("address"):
                val = aria or text
                for prefix in ("Address", "Adresse", "Адрес"):
                    for sep in ("", ":", ": "):
                        if val.startswith(prefix + sep):
                            val = val[len(prefix + sep):].strip()
                            break
                if val and not data["address"]:
                    data["address"] = val

            # --- Hours marker (we'll expand after the loop) ---
            if item_id.startswith("oh") and not data["hours"]:
                data["_hours_btn"] = btn

            # --- Website ---
            if "authority" in item_id or "website" in item_id.lower():
                href = btn.get_attribute("href") or ""
                if href and not data["website"]:
                    data["website"] = href
                val = text or aria
                for prefix in ("Website", "Site", "Site Web", "Site internet"):
                    for sep in ("", ":", ": "):
                        if val.startswith(prefix + sep):
                            val = val[len(prefix + sep):].strip()
                            if val.startswith("http") and not data["website"]:
                                data["website"] = val
                            break
        except Exception:
            continue

    if stop_event and stop_event.is_set():
        return data

    # ------------------------------------------------------------------
    # Phase 2: Expand hours button if found
    # ------------------------------------------------------------------
    hours_btn = data.pop("_hours_btn", None)
    if hours_btn:
        try:
            hours_btn.click()
            _random_delay(0.3, 0.7, stop_event)
            if stop_event and stop_event.is_set():
                return data
            # Try multiple selectors for hours table content
            hour_rows = page.query_selector_all(
                "table tr, .OqCzi, [class*='hour'], [class*='Hour'], "
                '[class*="opening-hours"], div[role="dialog"] table tr'
            )
            parts = []
            for row in hour_rows[:14]:
                t = row.inner_text().strip()
                if t:
                    parts.append(t)
            if parts:
                data["hours"] = " | ".join(parts)[:300]
            # Close the hours popup if present
            try:
                close_btn = page.query_selector(
                    'button[aria-label*="close"], button[aria-label*="Close"]'
                )
                if close_btn:
                    close_btn.click()
                    _random_delay(0.2, 0.4, stop_event)
            except Exception:
                pass
        except Exception:
            pass

    if stop_event and stop_event.is_set():
        return data

    # ------------------------------------------------------------------
    # Phase 3: Category — look for a category link near the top
    # ------------------------------------------------------------------
    try:
        # Try dedicated category/type button
        cat_btn = page.query_selector(
            'button[data-item-id*="category"], '
            'button[jsaction*="category"]'
        )
        if cat_btn:
            t = cat_btn.inner_text().strip()
            if t and len(t) < 60:
                data["category"] = t
        else:
            # Fallback: find link to maps search with a short label
            cat_links = page.query_selector_all(
                'a[href*="/maps/search/"], '
                'a[data-item-id*="category"]'
            )
            for el in cat_links:
                t = el.inner_text().strip()
                if t and len(t) < 60 and not t.startswith("http"):
                    data["category"] = t
                    break
    except Exception:
        pass

    if stop_event and stop_event.is_set():
        return data

    # ------------------------------------------------------------------
    # Phase 4: Rating — find aria-label with star count
    # ------------------------------------------------------------------
    try:
        rating_el = page.query_selector(
            '[aria-label*="star"], [aria-label*="Star"], '
            '[aria-label*="étoile"], [aria-label*="estrela"], '
            '[aria-label*="sterne"]'
        )
        if rating_el:
            label = (rating_el.get_attribute("aria-label") or "").strip()
            # Extract rating number (e.g., "4.2")
            m = re.search(r"([\d,]+)\s*(?:star|étoile|rating)", label, re.IGNORECASE)
            if m:
                data["rating"] = m.group(1).replace(",", ".")
            # Extract review count (e.g., "(18 reviews)")
            m2 = re.search(r"(\d[\d,]*)\s*(?:review|avis|évaluation|évaluations)", label, re.IGNORECASE)
            if m2:
                data["reviews"] = m2.group(1).replace(",", "")
        else:
            # Last-resort: look for a div with role="img" containing rating text
            img_el = page.query_selector('div[role="img"][aria-label]')
            if img_el:
                label = img_el.get_attribute("aria-label") or ""
                m = re.search(r"([\d.]+)", label)
                if m:
                    data["rating"] = m.group(1)
    except Exception:
        pass

    if stop_event and stop_event.is_set():
        return data

    # ------------------------------------------------------------------
    # Phase 5: Phone fallback — look for tel: links anywhere
    # ------------------------------------------------------------------
    if not data["phone"]:
        try:
            tel_link = page.query_selector('a[href^="tel:"]')
            if tel_link:
                data["phone"] = tel_link.get_attribute("href") or ""
                if data["phone"].startswith("tel:"):
                    data["phone"] = data["phone"][4:]
                text = tel_link.inner_text().strip()
                if text:
                    data["phone"] = text
        except Exception:
            pass

    if stop_event and stop_event.is_set():
        return data

    return data


def _extract_reviews(page, max_reviews=5, stop_event=None) -> list[str]:
    """Extract up to max_reviews reviews from the detail panel.
    Returns list of "name|rating|text" strings.
    """
    reviews = []
    if stop_event and stop_event.is_set():
        return reviews

    try:
        # ---- Click the Reviews tab ----
        # Try multiple locale variants
        review_tab = page.query_selector(
            'button[aria-label*="review" i], '
            'button[aria-label*="avis" i], '
            'div[role="tab"]:has-text("Reviews"), '
            'div[role="tab"][aria-label*="review" i]'
        )
        if review_tab:
            review_tab.click()
            _random_delay(0.5, 1.0, stop_event)
        if stop_event and stop_event.is_set():
            return reviews

        # Scroll the reviews panel to trigger lazy loading
        scroll_target = page.query_selector('[role="tabpanel"], .m6QErb')
        if scroll_target:
            for _ in range(3):
                try:
                    scroll_target.evaluate("el => el.scrollBy(0, 500)")
                except Exception:
                    pass
                _random_delay(0.3, 0.5, stop_event)
                if stop_event and stop_event.is_set():
                    return reviews

        # ---- Collect review cards ----
        # Strategy 1: known class names (fast path)
        cards = page.query_selector_all(".jftiEf")
        # Strategy 2: any element containing a star rating and review text
        if not cards or len(cards) < 2:
            cards = page.query_selector_all(
                'div[role="article"]:has([aria-label*="star" i]), '
                'div[role="article"]:has([aria-label*="étoile" i])'
            )
        # Strategy 3: look for elements with star + text structure
        if not cards or len(cards) < 2:
            cards = page.query_selector_all("div.gws-localreviews__google-review, div.GCutH")
        # Strategy 4: broad scan for star elements in tabpanel
        if not cards or len(cards) < 2:
            tabpanel = page.query_selector('[role="tabpanel"]')
            if tabpanel:
                star_parents = tabpanel.query_selector_all('*:has(> * > [aria-label*="star" i])')
                cards = star_parents if star_parents else []

        for card in cards:
            if len(reviews) >= max_reviews or (stop_event and stop_event.is_set()):
                break
            try:
                # Name — try common selectors
                name_el = (
                    card.query_selector(".d4r55") or
                    card.query_selector('[class*="name" i]') or
                    card.query_selector("span:first-child")
                )
                name = name_el.inner_text().strip() if name_el else ""

                # Rating — find any element with aria-label containing star
                star_el = card.query_selector('[aria-label*="star" i], [aria-label*="étoile" i]')
                rating = ""
                if star_el:
                    aria = star_el.get_attribute("aria-label") or ""
                    m = re.search(r"([\d.]+)", aria)
                    rating = m.group(1) if m else ""

                # Text
                text_el = (
                    card.query_selector(".wiI7pd") or
                    card.query_selector('[class*="review" i]') or
                    card.query_selector('[class*="content" i]') or
                    card.query_selector("span:last-child")
                )
                text = text_el.inner_text().strip() if text_el else ""

                # Click "More" button to expand
                more_btn = card.query_selector("button")
                if more_btn and text and "..." in text:
                    try:
                        more_btn.click()
                        _random_delay(0.1, 0.3, stop_event)
                        text = text_el.inner_text().strip() if text_el else text
                    except Exception:
                        pass

                if name and rating and text:
                    reviews.append(f"{name}|{rating}|{text}")
            except Exception:
                continue
    except Exception:
        pass
    return reviews


def _extract_about_features(page, stop_event=None) -> tuple[list[str], list[str]]:
    """Extract pros/cons from the About section.
    Returns (pros, cons).
    """
    pros = []
    cons = []
    if stop_event and stop_event.is_set():
        return pros, cons

    try:
        # ---- Click About tab ----
        about_btn = page.query_selector(
            'button[aria-label*="about" i], '
            'div[role="tab"][aria-label*="about" i], '
            'div[role="tab"]:has-text("About"), '
            'div[role="tab"]:has-text("À propos")'
        )
        if about_btn:
            about_btn.click()
            _random_delay(0.4, 0.8, stop_event)
        if stop_event and stop_event.is_set():
            return pros, cons

        # ---- Extract attribute rows ----
        # Strategy 1: known amenity classes
        rows = page.query_selector_all(
            '[class*="feature" i], [class*="amenity" i], '
            '[class*="attribute" i]'
        )
        # Strategy 2: rows in the tabpanel with short text + icon
        if not rows:
            tabpanel = page.query_selector('[role="tabpanel"]')
            if tabpanel:
                rows = tabpanel.query_selector_all("div:not(:has(div)):not(:has(a)):not(:empty)")
                if not rows:
                    rows = tabpanel.query_selector_all("div > div > div")

        for row in rows:
            if stop_event and stop_event.is_set():
                break
            try:
                html = row.inner_html().lower()
                text = row.inner_text().strip()
                if not text or len(text) > 120:
                    continue
                # Checkmark = pro, cross = con
                has_check = "check" in html and ("M9 16.17L4.83 12" in html or "M5 12l5" in html)
                has_cross = ("M18 6L6 18" in html or "M6 6l12 12" in html or "M19 6.41" in html)
                if has_check:
                    pros.append(text)
                elif has_cross:
                    cons.append(text)
                # If no SVG match, treat as pro if no negative indicator
                elif not has_cross and (
                    "wifi" in text.lower() or
                    "parking" in text.lower() or
                    "air" in text.lower() or
                    "accessible" in text.lower()
                ):
                    pros.append(text)
            except Exception:
                continue
    except Exception:
        pass
    return pros, cons
