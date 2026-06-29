import re
import asyncio
import random
import httpx
from bs4 import BeautifulSoup
from dataclasses import dataclass, field

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:126.0) Gecko/20100101 Firefox/126.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
]


@dataclass
class GoogleFinding:
    email: str | None = None
    phone: str | None = None
    source_url: str = ""
    snippet: str = ""
    confidence: float = 0.5


def _build_queries(author: str, company: str = None) -> list[str]:
    """Build Google dork queries for email/phone discovery."""
    name = author.strip()
    queries = [
        f'"{name}" email "@" contact',
        f'"{name}" site:github.com email',
        f'"{name}" site:twitter.com OR site:x.com contact email',
        f'"{name}" email site:linkedin.com',
        f'"{name}" contact phone email -site:linkedin.com',
    ]
    if company:
        queries.append(f'"{name}" email site:{company.lower().replace(" ", "")}.com')
        queries.append(f'"{company}" "{name}" email contact')
        queries.append(f'inurl:"{company}" AND intext:"@{company}"')
        domain = company.lower().replace(" ", "").replace("https://", "").replace("http://", "").split("/")[0]
        if "." in domain and not domain.endswith(".com"):
            domain_base = domain.split(".")[0]
            queries.append(f'email "@{domain}" contact')
            queries.append(f'"{domain_base}" email "@{domain}"')
    return queries


def _parse_google_results(html: str) -> list[dict]:
    """Parse Google search results page for snippets and URLs."""
    soup = BeautifulSoup(html, "html.parser")
    results = []

    for g in soup.select("div.g"):
        title_el = g.select_one("h3")
        snippet_el = g.select_one("div[data-sncf], div.VwiC3b, span.aCOpRe")
        link_el = g.select_one("a[href]")

        if not link_el:
            continue

        url = link_el.get("href", "")
        title = title_el.get_text(strip=True) if title_el else ""
        snippet = snippet_el.get_text(strip=True) if snippet_el else ""

        if url.startswith("/url?"):
            import urllib.parse
            parsed = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
            url = parsed.get("q", [""])[0]

        if url and snippet:
            results.append({"url": url, "title": title, "snippet": snippet})

    for div in soup.select("div[class*='result'], div[class*='g '], div[data-sokoban-container]"):
        text = div.get_text(" ", strip=True)
        if text and len(text) > 20:
            emails_found = EMAIL_RE.findall(text)
            phones_found = PHONE_RE.findall(text)
            if emails_found or phones_found:
                results.append({"url": "", "title": "", "snippet": text[:500]})

    text = soup.get_text(" ")
    all_emails = EMAIL_RE.findall(text)
    all_phones = PHONE_RE.findall(text)
    if all_emails or all_phones:
        results.append({"url": "", "title": "", "snippet": text[:1000]})

    return results


def _extract_findings(results: list[dict]) -> list[GoogleFinding]:
    """Extract email/phone findings from parsed Google results."""
    findings = []
    seen_emails = set()
    seen_phones = set()

    for r in results:
        text = f"{r.get('snippet', '')} {r.get('title', '')}"

        for email in EMAIL_RE.findall(text):
            email = email.lower().strip()
            if email not in seen_emails and _looks_like_real_email(email):
                seen_emails.add(email)
                findings.append(GoogleFinding(
                    email=email,
                    source_url=r.get("url", ""),
                    snippet=r.get("snippet", "")[:200],
                    confidence=0.7 if r.get("url") else 0.5,
                ))

        for phone in PHONE_RE.findall(text):
            phone = phone.strip()
            digits = re.sub(r"\D", "", phone)
            if 7 <= len(digits) <= 15 and phone not in seen_phones:
                seen_phones.add(phone)
                findings.append(GoogleFinding(
                    phone=phone,
                    source_url=r.get("url", ""),
                    snippet=r.get("snippet", "")[:200],
                    confidence=0.4,
                ))

    return findings


def _looks_like_real_email(email: str) -> bool:
    """Filter out image/file/placeholder emails."""
    junk = [
        "example.com", "sentry.io", "wixpress.com", "w3.org",
        "schema.org", "googleusercontent.com", "gstatic.com",
        "facebook.com", "twitter.com", "instagram.com",
        "gravatar.com", "wordpress.org", "wp.com",
        ".png", ".jpg", ".gif", ".svg", ".css", ".js",
        "noreply", "no-reply", "donotreply", "mailer-daemon",
        "postmaster", "webmaster", "abuse@",
        "you@", "user@", "email@", "name@", "test@",
        "placeholder", "sample", "domain.com",
        "john@doe", "jane@doe", "info@company",
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
    local, domain = lower.rsplit("@", 1)
    if len(local) > 64 or len(domain) > 253:
        return False
    if len(local) < 2:
        return False
    if domain in mastodon_instances:
        return False
    return True


async def _search_duckduckgo(query: str, client: httpx.AsyncClient) -> list[dict]:
    """Search DuckDuckGo as a fallback when Google blocks us."""
    results = []
    try:
        resp = await client.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            headers={"User-Agent": random.choice(USER_AGENTS)},
        )
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            for result in soup.select(".result"):
                title_el = result.select_one(".result__title")
                snippet_el = result.select_one(".result__snippet")
                link_el = result.select_one(".result__url")
                if title_el and snippet_el:
                    results.append({
                        "url": link_el.get_text(strip=True) if link_el else "",
                        "title": title_el.get_text(strip=True),
                        "snippet": snippet_el.get_text(strip=True),
                    })
    except Exception:
        pass
    return results


async def _search_bing(query: str, client: httpx.AsyncClient) -> list[dict]:
    """Search Bing as a fallback."""
    results = []
    try:
        resp = await client.get(
            "https://www.bing.com/search",
            params={"q": query, "count": 10},
            headers={"User-Agent": random.choice(USER_AGENTS)},
        )
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            for li in soup.select("li.b_algo"):
                title_el = li.select_one("h2")
                snippet_el = li.select_one(".b_caption p")
                link_el = li.select_one("a")
                if title_el and link_el:
                    results.append({
                        "url": link_el.get("href", ""),
                        "title": title_el.get_text(strip=True),
                        "snippet": snippet_el.get_text(strip=True) if snippet_el else "",
                    })
    except Exception:
        pass
    return results


async def google_dork(author: str, company: str = None) -> tuple[list[GoogleFinding], list[str]]:
    """Run dork queries across Google, DuckDuckGo, and Bing.
    Returns (findings, result_urls) — result URLs are for deep scraping."""
    queries = _build_queries(author, company)
    random.shuffle(queries)
    queries = queries[:3]

    all_findings = []
    all_urls = []
    seen_urls = set()
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        for i, query in enumerate(queries):
            if i > 0:
                await asyncio.sleep(2 + random.random())

            try:
                resp = await client.get(
                    "https://www.google.com/search",
                    params={"q": query, "num": 10, "hl": "en", "gl": "us"},
                    headers={"User-Agent": random.choice(USER_AGENTS)},
                )

                blocked = ("sorry" in resp.text.lower() or "captcha" in resp.text.lower()
                           or resp.status_code == 429)

                if not blocked and resp.status_code == 200:
                    results = _parse_google_results(resp.text)
                    for r in results:
                        url = r.get("url", "")
                        if url and url not in seen_urls and "google.com" not in url:
                            seen_urls.add(url)
                            all_urls.append(url)
                    findings = _extract_findings(results)
                    all_findings.extend(findings)
                else:
                    ddg_results = await _search_duckduckgo(query, client)
                    for r in ddg_results:
                        url = r.get("url", "")
                        if url and url not in seen_urls:
                            seen_urls.add(url)
                            all_urls.append(url)
                    findings = _extract_findings(ddg_results)
                    all_findings.extend(findings)

                    bing_results = await _search_bing(query, client)
                    for r in bing_results:
                        url = r.get("url", "")
                        if url and url not in seen_urls:
                            seen_urls.add(url)
                            all_urls.append(url)
                    findings = _extract_findings(bing_results)
                    all_findings.extend(findings)

            except Exception:
                continue

    return all_findings, all_urls
