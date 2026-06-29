"""
Craigslist scraper using the Craigslist internal JSON search API
(``sapi.craigslist.org``).  No Playwright / browser required.

The API returns results in a compressed array format.  We decode what we
need (title, location, area code) and use the category search URL as the
lead link, since the compressed format does not expose the actual posting
URL directly.

Supports:
  * single / multiple sites from DB settings
  * US hub presets
  * keyword / exclude filters
  * dedup by (normalised title + area)
"""
import asyncio
import logging
import re
from datetime import datetime

logger = logging.getLogger(__name__)

from scrapers.base import BaseScraper, ScrapedLead

DEFAULT_SITE = "sfbay"
# Expanded categories to cover Gigs, Services, and Jobs comprehensively
CATEGORIES = (
    "cps", "cpg", # Computer Services & Gigs
    "web", "sof", # Web Design & Software Jobs
    "crs", "wrg", # Creative Services & Writing Gigs
    "mar", "sls", # Marketing & Sales Jobs
    "med", "bus", # Art/Media & Business/Mgmt Jobs
    "rts"         # Real Estate Services (often need tech)
)

MODE_CATEGORIES = {
    "job_hunter": ("sof", "web", "mar", "sls", "med", "bus"),
    "internship_scout": ("sof", "web", "mar", "edu"),
    "clients_excavator": ("cps", "cpg", "web", "crs", "wrg", "bus"),
}

US_HUB_SITES = (
    "sfbay", "newyork", "losangeles", "chicago", "seattle",
    "austin", "boston", "denver", "atlanta", "dallas",
    "miami", "philadelphia", "portland", "toronto", "london",
)

BASE_API = "https://sapi.craigslist.org/web/v8/postings/search/full"


def _slugify_site(raw: str) -> str:
    # Remove everything except letters and numbers
    s = re.sub(r"[^a-z0-9]", "", raw.strip().lower())
    # Special cases for common hubs that don't follow simple slugification
    mappings = {
        "newyorkcity": "newyork",
        "sanfranciscobayarea": "sfbay",
        "stlouis": "stlouis",
        "washdc": "washingtondc",
        "virginislandsus": "virgin",
    }
    return mappings.get(s, s)


def _valid_site_slug(raw: str) -> str | None:
    s = _slugify_site(raw)
    if s and re.fullmatch(r"[a-z][a-z0-9]*", s):
        return s
    return None


def _sanitize_segment(seg: str, fallback: str) -> str:
    return _valid_site_slug(seg) or fallback


def _text_matches_exclude(combined_lower: str, excludes: list[str]) -> bool:
    for ex in excludes:
        term = ex.strip().lower()
        if not term:
            continue
        if " " in term:
            if term in combined_lower:
                return True
        elif re.search(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", combined_lower):
            return True
    return False


def _normalize_for_keyword_match(text: str) -> str:
    s = text.lower()
    s = re.sub(r"\bdevelop(er|ment|ing|ed)?\b", " develop ", s)
    s = re.sub(r"\bdesign(er|ing)?\b", " design ", s)
    s = re.sub(r"\bweb(sites?)?\b", " web ", s)
    return s


def _token_present(haystack: str, token: str) -> bool:
    if not token:
        return False
    return re.search(r"(?<![a-z0-9])" + re.escape(token) + r"(?![a-z0-9])", haystack) is not None


def _text_matches_keywords(combined_lower: str, keyword_phrases: list[str]) -> bool:
    norm_combined = _normalize_for_keyword_match(combined_lower)
    for phrase in keyword_phrases:
        raw = phrase.strip().lower()
        if not raw:
            continue
        if " " in raw:
            if raw in combined_lower:
                return True
        elif _token_present(combined_lower, raw):
            return True
        norm_phrase = _normalize_for_keyword_match(raw)
        parts = [p for p in norm_phrase.split() if p]
        if parts and all(_token_present(norm_combined, p) for p in parts):
            return True
    return False


def _int_setting(raw: str, default: int, lo: int, hi: int) -> int:
    try:
        v = int(str(raw).strip())
    except ValueError:
        return default
    return max(lo, min(hi, v))


# ---------------------------------------------------------------------------
# API fetching  (blocking, run via asyncio.to_thread)
# ---------------------------------------------------------------------------

def _api_category(site: str, category: str, query: str) -> list[dict]:
    """Fetch one site + category combination from the Craigslist JSON API.

    Returns list of dicts with keys: title, url, location.
    ``url`` here is the search-page URL (not the individual posting URL)
    because the compressed API format does not expose actual posting IDs.
    """
    import httpx

    results: list[dict] = []
    seen_keys: set[str] = set()

    params = {
        "batch": "1-0-360-0-0",
        "searchPath": category,
        "lang": "en",
        "hostname": f"{site}.craigslist.org",
    }
    if query:
        params["query"] = query

    try:
        resp = httpx.get(
            BASE_API,
            params=params,
            timeout=30,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/125.0.0.0 Safari/537.36"
                ),
            },
        )
        if resp.status_code != 200:
            logger.warning("Craigslist API %s/%s returned %d", site, category, resp.status_code)
            return []

        data = resp.json()
        d = data.get("data", {})
        items = d.get("items", [])
        if not items:
            return []

        decode = d.get("decode", {})
        if not isinstance(decode, dict):
            decode = {}
        locations = decode.get("locations", [])
        location_descs = decode.get("locationDescriptions", [])

        search_url = f"https://{site}.craigslist.org/search/{category}"
        if query:
            search_url += f"?query={query}"

        for item in items:
            if not isinstance(item, list) or len(item) < 5:
                continue

            # Title is the last string element
            title = ""
            for val in reversed(item):
                if isinstance(val, str) and val.strip() and "~" not in val and ":" not in val[:3]:
                    title = val.strip()
                    break
            if not title:
                continue

            # Geo string is at index [4]
            geo = ""
            if len(item) > 4 and isinstance(item[4], str):
                geo = item[4].split("~")[0]

            # Decode area code
            area_idx = 0
            if geo and ":" in geo:
                try:
                    area_idx = int(geo.split(":")[0])
                except ValueError:
                    pass

            loc_entry = locations[area_idx] if 0 < area_idx < len(locations) else None
            area_code = loc_entry[2] if isinstance(loc_entry, list) and len(loc_entry) > 2 else ""
            site_name = loc_entry[1] if isinstance(loc_entry, list) and len(loc_entry) > 1 else site

            # Use area-specific search URL when possible
            # Extract the unique posting ID (index 0 in v8 format)
            posting_id = item[0] if len(item) > 0 else None

            if posting_id:
                # Direct post URL is much better than a search query
                item_url = f"https://{site_name}.craigslist.org/{category}/{posting_id}.html"
            elif area_code and site_name:
                item_url = f"https://{site_name}.craigslist.org/search/{area_code}/{category}"
                if query:
                    item_url += f"?query={query}"
            else:
                item_url = search_url

            # Location description from geo sub-parts
            location_desc = ""
            if geo and ":" in geo:
                geo_parts = geo.split(":")
                for p in geo_parts[1:]:
                    try:
                        loc_idx = int(p)
                        if 0 < loc_idx < len(location_descs):
                            desc = location_descs[loc_idx] or ""
                            if desc and desc not in location_desc:
                                location_desc = (location_desc + ", " + desc) if location_desc else desc
                    except ValueError:
                        pass

            # Dedup key (title + area_code)
            dedup_key = f"{title.lower()}|{area_code}"
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)

            results.append({
                "title": title,
                "url": item_url,
                "location": location_desc,
            })

    except Exception as e:
        logger.exception("Craigslist API fetch error %s/%s: %s", site, category, e)

    return results


# ---------------------------------------------------------------------------
# scraper class
# ---------------------------------------------------------------------------

class CraigslistScraper(BaseScraper):
    def __init__(self, db=None):
        super().__init__(db)
        self.platform_name = "Craigslist"

    async def _resolve_sites(self) -> list[str]:
        if not self.db:
            return [DEFAULT_SITE]
        from utils.settings_loader import get_setting

        max_sites = _int_setting(
            await get_setting(self.db, "craigslist_max_sites", "10"), 10, 1, 999,
        )

        raw_csv = (await get_setting(self.db, "craigslist_sites", "")).strip().lower()
        sites: list[str] = []
        if raw_csv:
            for part in raw_csv.split(","):
                slug = _valid_site_slug(part)
                if slug and slug not in sites:
                    sites.append(slug)
        else:
            one = (await get_setting(self.db, "craigslist_site", "")).strip().lower()
            if one:
                sites.append(_sanitize_segment(one, DEFAULT_SITE))
            else:
                rss = await get_setting(self.db, "craigslist_rss_url", "")
                m = re.search(r"https?://([a-z0-9]+)\.craigslist\.org", rss, re.I)
                if m:
                    sites.append(_sanitize_segment(m.group(1), DEFAULT_SITE))
                else:
                    sites.append(DEFAULT_SITE)

        primary = (await get_setting(self.db, "craigslist_site", "")).strip().lower()
        if primary:
            p = _sanitize_segment(primary, DEFAULT_SITE)
            if p not in sites:
                sites.insert(0, p)

        use_hubs = (await get_setting(self.db, "craigslist_use_us_hubs", "0")).strip() in (
            "1", "true", "yes",
        )
        # ONLY add hubs if the user hasn't specified any sites manually
        if use_hubs and not raw_csv:
            for h in US_HUB_SITES:
                if h not in sites:
                    sites.append(h)

        out: list[str] = []
        for s in sites:
            if s not in out:
                out.append(s)
        
        # Final fallback: only use default if we have absolutely nothing
        if not out:
            out = [DEFAULT_SITE]
        return out[:max_sites]

    async def _resolve_area(self) -> str | None:
        if not self.db:
            return None
        from utils.settings_loader import get_setting
        raw = (await get_setting(self.db, "craigslist_area", "")).strip().lower()
        if not raw:
            return None
        return raw if re.fullmatch(r"[a-z][a-z0-9]*", raw) else None

    async def scrape(self) -> list[ScrapedLead]:
        from utils.settings_loader import get_setting

        kw_default = "website,web,developer,designer"
        base_keywords = await self._get_keywords(kw_default)
        keywords = await self._get_mode_keywords(base_keywords)
        if not keywords:
            keywords = [k.strip().lower() for k in kw_default.split(",") if k.strip()]
        base_exclude = await self._get_exclude("free,cheap,no pay")
        exclude = await self._get_mode_exclude(base_exclude)

        mode = await self._get_mode()
        active_categories = MODE_CATEGORIES.get(mode, CATEGORIES)

        sites = await self._resolve_sites()
        area = await self._resolve_area()
        if len(sites) > 1 and area:
            logger.warning(
                "Craigslist: ignoring craigslist_area=%r when using multiple sites", area,
            )
            area = None

        if self.db:
            parallel = _int_setting(
                await get_setting(self.db, "craigslist_parallel_tabs", "4"), 4, 1, 16,
            )
        else:
            parallel = 4

        # GRAND LEVEL QUERY: Use the OR operator (|) and group with parentheses
        # This tells Craigslist to find ANY of these terms, not ALL of them.
        query = f"({'|'.join(keywords[:12])})" if keywords else "(website|web|developer|design)"

        # Build list of (site, category, query) tuples
        combos = [(s, cat, query) for s in sites for cat in active_categories]
        
        # SAFETY CAP: Limit total requests to 300 to prevent server timeouts
        if len(combos) > 300:
            logger.warning("Craigslist: Too many combinations (%d), capping at 300", len(combos))
            combos = combos[:300]

        all_raw: list[dict] = []
        seen_urls: set[str] = set()

        try:
            # Wrap the entire batch loop in a timeout
            async def run_batches():
                for i in range(0, len(combos), parallel):
                    batch = combos[i : i + parallel]
                    batch_lists = await asyncio.gather(
                        *[asyncio.to_thread(_api_category, *c) for c in batch],
                        return_exceptions=True,
                    )
                    for part in batch_lists:
                        if isinstance(part, Exception):
                            continue
                        for row in part:
                            u = row.get("url", "")
                            if not u or u in seen_urls:
                                continue
                            seen_urls.add(u)
                            all_raw.append(row)
            
            # 60 second hard limit for the entire platform scan
            await asyncio.wait_for(run_batches(), timeout=60.0)
            
        except asyncio.TimeoutError:
            logger.warning("Craigslist: Scrape timed out after 60s, returning partial results (%d leads)", len(all_raw))
        except Exception as e:
            logger.error("Craigslist: Unexpected error during batch processing: %s", e)

        leads: list[ScrapedLead] = []
        for row in all_raw:
            title = row.get("title", "")
            title_lower = title.lower()
            location = row.get("location", "")
            combined = f"{title_lower} {location.lower()}"

            if not _text_matches_keywords(combined, keywords):
                continue
            if _text_matches_exclude(combined, exclude):
                continue

            description = f"Craigslist — {location}" if location else "Craigslist"
            leads.append(
                ScrapedLead(
                    title=title,
                    platform="Craigslist",
                    url=row.get("url", ""),
                    timestamp=datetime.utcnow(),
                    description=description,
                )
            )

        if all_raw and not leads:
            logger.warning(
                "Craigslist: %d raw listings but 0 after keyword/exclude filters — "
                "check search_keywords / search_exclude in Settings",
                len(all_raw),
            )

        return leads
