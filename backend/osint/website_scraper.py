import re
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from dataclasses import dataclass

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}")
MAILTO_RE = re.compile(r"mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})")
TEL_RE = re.compile(r"tel:([\d+\-().\s]+)")

CONTACT_PATHS = [
    "/contact", "/contact-us", "/contactus", "/contactus.html",
    "/about", "/about-us", "/aboutus", "/about/team",
    "/team", "/our-team", "/staff", "/people",
    "/imprint", "/impressum", "/legal",
]


@dataclass
class ScrapedContact:
    email: str | None = None
    phone: str | None = None
    source_url: str = ""
    confidence: float = 0.5


def _is_valid_email(email: str) -> bool:
    junk = [
        "example.com", "sentry.io", "wixpress.com", "w3.org",
        "schema.org", "googleusercontent.com", "gstatic.com",
        "facebook.com", "twitter.com", "instagram.com",
        "gravatar.com", "wordpress.org", ".png", ".jpg",
        "noreply", "no-reply", "mailer-daemon",
        "you@", "user@", "email@", "name@", "test@",
        "placeholder", "sample", "domain.com",
    ]
    mastodon_instances = {
        "mastodon.social", "mastodon.world", "mastodon.online", "mastodon.art",
        "fosstodon.org", "infosec.exchange", "hachyderm.io",
        "norden.social", "toot.cafe", "mas.to", "mastodon.cloud",
        "mstdn.social", "social.coop", "universeodon.com",
        "kolektiva.social", "pawoo.net", "pleroma.site",
        "akkoma.social", "gotosocial.social", "gnulinux.social",
    }
    lower = email.lower()
    for j in junk:
        if j in lower:
            return False
    local = lower.split("@")[0]
    domain = lower.split("@")[1] if "@" in lower else ""
    if len(local) < 2 or local in ["abuse", "postmaster", "webmaster", "hostmaster"]:
        return False
    if domain in mastodon_instances:
        return False
    return True


def _find_contact_links(soup: BeautifulSoup, base_url: str) -> list[str]:
    """Find links to contact/about/team pages."""
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"].lower().strip()
        text = a.get_text(strip=True).lower()
        if any(p in href for p in CONTACT_PATHS) or any(p in text for p in ["contact", "about", "team", "imprint"]):
            full_url = urljoin(base_url, a["href"])
            if urlparse(full_url).netloc == urlparse(base_url).netloc:
                links.append(full_url)
    return list(dict.fromkeys(links))[:5]


def _extract_contacts(html: str, url: str) -> list[ScrapedContact]:
    """Extract emails and phones from HTML."""
    contacts = []
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup.find_all(["a", "span", "p", "div", "li", "td"]):
        text = tag.get_text(" ", strip=True)
        for email in EMAIL_RE.findall(text):
            if _is_valid_email(email):
                contacts.append(ScrapedContact(
                    email=email.lower(),
                    source_url=url,
                    confidence=0.7,
                ))
        for phone in PHONE_RE.findall(text):
            digits = re.sub(r"\D", "", phone)
            if 7 <= len(digits) <= 15:
                contacts.append(ScrapedContact(
                    phone=phone.strip(),
                    source_url=url,
                    confidence=0.4,
                ))

    for a in soup.find_all("a", href=True):
        href = a["href"]
        for email in MAILTO_RE.findall(href):
            if _is_valid_email(email):
                contacts.append(ScrapedContact(
                    email=email.lower(),
                    source_url=url,
                    confidence=0.9,
                ))
        for phone in TEL_RE.findall(href):
            digits = re.sub(r"\D", "", phone)
            if 7 <= len(digits) <= 15:
                contacts.append(ScrapedContact(
                    phone=phone.strip(),
                    source_url=url,
                    confidence=0.8,
                ))

    script_tags = soup.find_all("script", type="application/ld+json")
    for script in script_tags:
        content = script.string or ""
        for email in EMAIL_RE.findall(content):
            if _is_valid_email(email):
                contacts.append(ScrapedContact(
                    email=email.lower(),
                    source_url=url,
                    confidence=0.9,
                ))

    return contacts


async def scrape_website(url: str) -> list[ScrapedContact]:
    """Scrape the main page and known contact pages for contact info."""
    if not url:
        return []

    base = url.rstrip("/")
    urls_to_scrape = [base]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    }

    all_contacts = []

    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        try:
            resp = await client.get(base, headers=headers)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                contact_links = _find_contact_links(soup, base)
                urls_to_scrape.extend(contact_links)
        except Exception:
            pass

        for scrape_url in urls_to_scrape[:5]:
            try:
                if scrape_url != base:
                    resp = await client.get(scrape_url, headers=headers)
                if scrape_url == base and all_contacts:
                    continue
                if resp.status_code == 200:
                    contacts = _extract_contacts(resp.text, scrape_url)
                    all_contacts.extend(contacts)
            except Exception:
                continue

    seen = set()
    unique = []
    for c in all_contacts:
        key = (c.email, c.phone, c.source_url)
        if key not in seen:
            seen.add(key)
            unique.append(c)

    return unique


async def scrape_with_playwright(url: str) -> list[ScrapedContact]:
    """Scrape a single URL using Playwright with JS rendering.
    Catches emails from JS-rendered content that static HTML misses."""
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="networkidle", timeout=15000)
            html = await page.content()
            await browser.close()

        return _extract_contacts(html, url)
    except Exception:
        return []


async def scrape_urls_with_playwright(urls: list[str], max_urls: int = 5) -> list[ScrapedContact]:
    """Scrape multiple URLs (from Google results) using Playwright.
    Renders JS on each page before extracting contacts."""
    if not urls:
        return []

    all_contacts = []
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            for url in urls[:max_urls]:
                try:
                    page = await browser.new_page()
                    await page.goto(url, wait_until="domcontentloaded", timeout=10000)
                    await page.wait_for_timeout(2000)
                    html = await page.content()
                    contacts = _extract_contacts(html, url)
                    all_contacts.extend(contacts)
                    await page.close()
                except Exception:
                    continue
            await browser.close()
    except Exception:
        pass

    seen = set()
    unique = []
    for c in all_contacts:
        key = (c.email, c.phone)
        if key not in seen:
            seen.add(key)
            unique.append(c)

    return unique
