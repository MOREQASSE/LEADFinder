import asyncio
import json
import re
import sys
import traceback
from pathlib import Path
from playwright.async_api import async_playwright

# Must match within job title OR job description to qualify as a decision-maker
TITLE_PATTERNS = [
    r"(?i)\brecruiter\b",
    r"(?i)\brecruiting\b",
    r"(?i)\brecruitment\b",
    r"(?i)\bhead\s*of\s*recruit",
    r"(?i)\bhiring\s*manager\b",
    r"(?i)\bhiring\b",
    r"(?i)\btalent\s*acquisition\b",
    r"(?i)\btalent\s*partner\b",
    r"(?i)\btalent\s*sourc",
    r"(?i)\btalent\b",
    r"(?i)\bpeople\s*operations\b",
    r"(?i)\bpeople\s*partner\b",
    r"(?i)\bpeople\s*ops\b",
    r"(?i)\bhr\b",
    r"(?i)\bhuman\s*resources\b",
    r"(?i)\bhrbp\b",
    r"(?i)\bhr\s*business\s*partner\b",
    r"(?i)\bpeople\b",
    r"(?i)\bsourcer\b",
    r"(?i)\bsourcing\b",
    r"(?i)\bstaffing\b",
    r"(?i)\bheadhunter\b",
    r"(?i)\btalent\s*management\b",
]

SEARCH_QUERIES = [
    "recruiter",
    "hiring manager",
    "talent acquisition",
    "recruiting",
    "talent partner",
    "HR",
    "people operations",
    "sourcer",
    "staffing",
    "headhunter",
    "",
]

CONNECTION_LVL_RE = re.compile(r"^\s*•?\s*\d+(st|nd|rd)\+?\s*$")
ACTION_WORDS = {"message", "follow", "connect", "more", "···", "...", "view my services", "current", "past"}


def log(msg):
    print(f"[linkedin_dm_finder] {msg}", file=sys.stderr)


def build_company_regex(name):
    """Build a case-insensitive word-boundary regex for company name matching.

    Handles multi-word companies (e.g. 'Northrop Grumman') by allowing
    flexible whitespace between words. Escapes special regex characters.
    """
    escaped = re.escape(name.strip())
    relaxed = escaped.replace(r"\ ", r"\s+")
    return re.compile(relaxed, re.IGNORECASE)


def parse_clean_name_title(raw_text):
    """Parse raw link inner-text into (clean_name, clean_title, raw_text).

    Handles patterns like:
      "Ricky Ng \\n • 3rd+\\n\\nRecruiter at Tesla\\n\\nAustralia\\n\\nMessage"
      "Ethan Solberg \\n • 3rd+\\n\\nHardware Recruiter @ Tesla\\n\\n...\\n\\nCurrent: Technical Recruiter at Tesla"
    """
    if not raw_text:
        return ("", "", "")
    lines = [ln.strip() for ln in raw_text.split("\n")]
    non_empty = [ln for ln in lines if ln]

    name = ""
    title = ""
    for i, ln in enumerate(non_empty):
        if CONNECTION_LVL_RE.match(ln):
            continue
        if ln.lower() in ACTION_WORDS:
            continue
        if ln.lower().startswith("current:") or ln.lower().startswith("past:"):
            candidate = ln.split(":", 1)[1].strip()
            if candidate and ("recruit" in candidate.lower() or "talent" in candidate.lower() or "hiring" in candidate.lower() or "hr" in candidate.lower() or "people" in candidate.lower() or "sourc" in candidate.lower() or "staff" in candidate.lower()):
                title = candidate
            continue
        if not name:
            name = ln
        elif not title:
            title = ln
        else:
            break

    return (name, title, raw_text)


def title_matches(title):
    if not title:
        return False
    for pat in TITLE_PATTERNS:
        if re.search(pat, title):
            return True
    return False


def company_matches(context, company_re):
    """Return True if the company name appears in the text context.

    Used to verify a candidate actually works at the target company
    rather than just having a keyword match from past experience.
    """
    if not context:
        return False
    return bool(company_re.search(context))


async def check_login_wall(page):
    try:
        text = await page.inner_text("body")
        if not text:
            return False
        low = text.lower()
        triggers = ["sign in", "join now", "agree & join", "sign up"]
        for t in triggers:
            if t in low[:1200]:
                return True
        return False
    except Exception:
        return False


async def scrape_all_profiles(page):
    """Scrape ALL profile links visible on the page.

    Collects every a[href*='/in/'], deduplicates by URL,
    extracts name + title + full card context for company verification.
    """
    links = await page.query_selector_all("a[href*='/in/']")
    seen = set()
    results = []
    for el in links:
        try:
            href = await el.get_attribute("href")
            if not href:
                continue
            full_url = href.split("?")[0]
            if not full_url or full_url in seen:
                continue
            seen.add(full_url)
            raw = (await el.inner_text()).strip()
            name, title, _ = parse_clean_name_title(raw)
            if not name:
                continue

            # Grab full card context for company verification
            context = raw
            try:
                card = await el.evaluate_handle(
                    "el => el.closest('li, article, div.entity-result, div.search-result, "
                    "div.org-people__card, div[data-view-name], section')"
                )
                if card:
                    card_text = await card.as_element().inner_text() if card.as_element() else ""
                    context = f"{raw} {card_text}"
            except Exception:
                pass

            results.append({
                "name": name,
                "title": title,
                "context": context,
                "profile_url": full_url if full_url.startswith("http") else f"https://www.linkedin.com{full_url}",
                "source": "page_scrape",
            })
        except Exception:
            continue
    return results


async def scrape_search_results(page):
    """Scrape structured search result cards. Falls back to scrape_all_profiles."""
    cards = await page.query_selector_all(
        "li.reusable-search__result-container, "
        "div.entity-result, "
        "article.search-result, "
        "div[data-view-name='search-entity-result'], "
        "[data-chameleon-result-urn]"
    )
    if not cards:
        log("No structured cards — scraping all visible profile links")
        return await scrape_all_profiles(page)

    seen = set()
    results = []
    for card in cards[:20]:
        try:
            link_el = await card.query_selector("a[href*='/in/']")
            if not link_el:
                continue
            href = await link_el.get_attribute("href") or ""
            p_url = href.split("?")[0]
            if not p_url or p_url in seen:
                continue
            seen.add(p_url)
            full_url = p_url if p_url.startswith("http") else f"https://www.linkedin.com{p_url}"

            # Full card text for company verification
            card_text = (await card.inner_text()).strip()

            # Try dedicated name/title elements
            name_el = await card.query_selector(
                ".entity-result__title-text a span, "
                "a[href*='/in/'] span:first-child, "
                ".actor-name"
            )
            name = ""
            title = ""
            if name_el:
                name = (await name_el.inner_text()).strip()
            title_el = await card.query_selector(
                ".entity-result__primary-subtitle, "
                ".search-result__occupation, "
                ".subline-level-1, "
                "div[data-anonymize='headline'], "
                ".artdeco-entity-lockup__subtitle"
            )
            if title_el:
                title = (await title_el.inner_text()).strip()

            # Fallback to parsing from link text
            if not name or not title:
                raw = (await link_el.inner_text()).strip()
                parsed_name, parsed_title, _ = parse_clean_name_title(raw)
                if not name:
                    name = parsed_name
                if not title:
                    title = parsed_title

            if not name:
                continue
            results.append({
                "name": name,
                "title": title,
                "context": f"{card_text} {name} {title}",
                "profile_url": full_url,
                "source": "search",
            })
        except Exception:
            continue
    return results


async def main():
    if len(sys.argv) < 4:
        log("Missing arguments")
        print(json.dumps({"error": "Usage: linkedin_dm_finder.py <job_url> <company_name> <profile_dir>"}))
        sys.exit(1)

    job_url = sys.argv[1]
    company_name = sys.argv[2]
    profile_dir = sys.argv[3]

    log(f"Job URL: {job_url}")
    log(f"Company: {company_name}")
    log(f"Profile dir: {profile_dir}")

    profile_path = Path(profile_dir) / "profile"
    output = {"candidates": [], "error": None}

    try:
        async with async_playwright() as p:
            log("Launching browser...")
            browser = await p.chromium.launch_persistent_context(
                user_data_dir=str(profile_path),
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-web-security",
                ],
                viewport={"width": 1280, "height": 800},
            )
            page = await browser.new_page()
            page.set_default_timeout(30000)

            # ── Step 1: Visit job page, look for job poster ──
            try:
                log(f"Navigating to job page: {job_url}")
                await page.goto(job_url, wait_until="domcontentloaded", timeout=35000)
                await page.wait_for_timeout(3000)

                if await check_login_wall(page):
                    log("Login wall detected on job page")
                    output["error"] = "LinkedIn requires login. Sign in through your browser first, then try again."
                else:
                    poster_links = await scrape_all_profiles(page)
                    for p in poster_links:
                        p["source"] = "job_poster"
                        if not any(c["profile_url"] == p["profile_url"] for c in output["candidates"]):
                            output["candidates"].append(p)
                    log(f"Job page yielded {len(poster_links)} profile link(s)")
            except Exception as e:
                log(f"Job page error: {str(e)}")
                if not output["error"]:
                    output["error"] = f"Job page: {str(e)[:100]}"

            # ── Step 2: People search with targeted queries ──
            if company_name and not output["error"]:
                for query in SEARCH_QUERIES:
                    if output.get("error"):
                        break
                    keywords = f"{company_name} {query}".strip()
                    try:
                        encoded = keywords.replace(" ", "%20")
                        search_url = f"https://www.linkedin.com/search/results/people/?keywords={encoded}"
                        log(f"Searching: {keywords}")
                        await page.goto(search_url, wait_until="domcontentloaded", timeout=35000)
                        await page.wait_for_timeout(3000)

                        if await check_login_wall(page):
                            log("Login wall detected on search page")
                            output["error"] = "LinkedIn requires login. Sign in through your browser first."
                            break

                        cards = await scrape_search_results(page)
                        log(f"Query '{query}' returned {len(cards)} raw results")

                        for c in cards:
                            if not any(existing["profile_url"] == c["profile_url"] for existing in output["candidates"]):
                                output["candidates"].append(c)

                        if len(output["candidates"]) >= 25:
                            log("Got enough raw candidates, stopping search")
                            break

                    except Exception as e:
                        log(f"Search query '{query}' failed: {str(e)}")
                        continue

            # ── Step 3: Company people page as fallback ──
            if company_name and not output["candidates"] and not output["error"]:
                company_slug = company_name.lower().replace(" ", "-").replace("'", "").replace(".", "")
                company_url = f"https://www.linkedin.com/company/{company_slug}/people/"
                try:
                    log(f"Trying company page: {company_url}")
                    await page.goto(company_url, wait_until="domcontentloaded", timeout=35000)
                    await page.wait_for_timeout(3000)
                    if await check_login_wall(page):
                        log("Login wall on company page")
                    else:
                        company_profiles = await scrape_all_profiles(page)
                        log(f"Company people page yielded {len(company_profiles)} profile(s)")
                        for p in company_profiles:
                            p["source"] = "company_page"
                            if not any(existing["profile_url"] == p["profile_url"] for existing in output["candidates"]):
                                output["candidates"].append(p)
                except Exception as e:
                    log(f"Company page failed: {str(e)}")

            await browser.close()

            # ── Step 4: Verify candidates belong to the target company ──
            if company_name and output["candidates"]:
                company_re = build_company_regex(company_name)
                before = len(output["candidates"])
                verified = []
                for c in output["candidates"]:
                    context = c.pop("context", "")  # remove internal field
                    if company_matches(context, company_re):
                        verified.append(c)
                log(f"After company-verify: {len(verified)}/{before} candidates match '{company_name}'")

                if verified:
                    output["candidates"] = verified
                else:
                    log("Company verification removed ALL candidates — using pre-filter results")
                    for c in output["candidates"]:
                        c.pop("context", None)
                    output["note"] = f"Could not verify company '{company_name}' in search results. Candidates shown may not be current employees."

            # ── Step 5: Filter candidates by title keywords ──
            if output["candidates"]:
                all_raw = output["candidates"]
                matched = [c for c in all_raw if title_matches(c["title"])]
                log(f"After title-filter: {len(matched)}/{len(all_raw)} candidates match hiring keywords")

                if matched:
                    output["candidates"] = matched
                elif all_raw:
                    log("No title-matched candidates — returning raw profiles with parsed titles")
                    output["note"] = "Showing candidates found — titles may be generic. Select one and proceed."

            log(f"Final candidate count: {len(output['candidates'])}")

    except Exception as e:
        log(f"Fatal error: {traceback.format_exc()}")
        output["error"] = str(e)[:200]

    print(json.dumps(output))


if __name__ == "__main__":
    asyncio.run(main())
