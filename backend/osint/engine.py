import asyncio
import time
from dataclasses import dataclass, field

from osint.email_generator import generate_email_patterns, extract_domain
from osint.email_verifier import verify_emails_batch, EmailVerification
from osint.google_dork import google_dork, GoogleFinding
from osint.social_crossref import cross_reference, SocialResult
from osint.website_scraper import scrape_website, scrape_with_playwright, scrape_urls_with_playwright, ScrapedContact
from osint.llm_extract import extract_with_llm, LLMContact
from osint.domain_checker import domain_can_receive_email


def _filter_invalid_domains(findings: list[dict]) -> list[dict]:
    """Remove email findings whose domain can't receive email (no MX/A/AAAA records)."""
    filtered = []
    for f in findings:
        if f.get("type") == "email" and f.get("value"):
            domain = f["value"].split("@")[1].lower() if "@" in f["value"] else ""
            if domain and not domain_can_receive_email(domain):
                continue
        filtered.append(f)
    return filtered


@dataclass
class OSINTResult:
    email: str | None = None
    phone: str | None = None
    confidence: float = 0.0
    source: str = ""
    verified: bool = False
    all_findings: list = field(default_factory=list)
    method_breakdown: dict = field(default_factory=dict)
    elapsed_seconds: float = 0.0


async def _run_google_dork(author, company):
    """Google dorking with timeout. Returns (findings, count, result_urls)."""
    try:
        findings, result_urls = await asyncio.wait_for(google_dork(author, company), timeout=12)
        results = []
        for f in findings:
            results.append({
                "type": "email" if f.email else "phone",
                "value": f.email or f.phone,
                "source": "google",
                "source_url": f.source_url,
                "confidence": f.confidence,
            })
        return results, len(findings), result_urls
    except Exception:
        return [], 0, []


async def _run_email_patterns(author, company_url, company):
    """Email pattern generation + SMTP verification with timeout."""
    domain = extract_domain(company_url) if company_url else None
    if company and not domain:
        domain = company.lower().replace(" ", "") + ".com"
    if not domain:
        return [], 0, 0

    patterns = generate_email_patterns(author, domain)
    if not patterns:
        return [], 0, 0

    patterns = patterns[:6]

    try:
        verifications = await asyncio.wait_for(verify_emails_batch(patterns), timeout=25)
        results = []
        valid_count = 0
        for v in verifications:
            if v.valid and not v.catch_all:
                valid_count += 1
                conf = 0.8
            elif v.catch_all:
                conf = 0.4
            else:
                conf = 0.1
            results.append({
                "type": "email",
                "value": v.email,
                "source": "email_pattern",
                "confidence": conf,
                "verified": v.valid,
                "catch_all": v.catch_all,
            })
        return results, len(patterns), valid_count
    except Exception:
        return [], 0, 0


async def _run_social_crossref(author):
    """Social cross-reference with timeout."""
    try:
        social_results = await asyncio.wait_for(cross_reference(author), timeout=10)
        results = []
        for r in social_results:
            if r.email:
                results.append({
                    "type": "email",
                    "value": r.email,
                    "source": r.platform,
                    "source_url": r.url,
                    "confidence": 0.75,
                })
        return results, len(social_results)
    except Exception:
        return [], 0


async def _run_website_scraper(company_url):
    """Website scraping with timeout."""
    if not company_url:
        return [], 0

    try:
        scraped = await asyncio.wait_for(scrape_website(company_url), timeout=10)
        results = []
        for s in scraped:
            if s.email:
                results.append({
                    "type": "email",
                    "value": s.email,
                    "source": "website",
                    "source_url": s.source_url,
                    "confidence": s.confidence,
                })
            elif s.phone:
                results.append({
                    "type": "phone",
                    "value": s.phone,
                    "source": "website",
                    "source_url": s.source_url,
                    "confidence": s.confidence,
                })
        return results, len(scraped)
    except Exception:
        return [], 0


async def _run_deep_scrape(google_urls: list[str], company_url: str | None) -> list[dict]:
    """Deep-scrape Google result URLs with Playwright JS rendering.
    Catches contacts from JS-heavy pages that static HTML misses."""
    findings = []

    urls = list(google_urls)
    if company_url and company_url not in urls:
        urls.insert(0, company_url)

    if not urls:
        return []

    try:
        scraped = await asyncio.wait_for(
            scrape_urls_with_playwright(urls, max_urls=5), timeout=30
        )
        for s in scraped:
            if s.email:
                findings.append({
                    "type": "email",
                    "value": s.email,
                    "source": "deep_scrape",
                    "source_url": s.source_url,
                    "confidence": min(s.confidence + 0.1, 1.0),
                })
            elif s.phone:
                findings.append({
                    "type": "phone",
                    "value": s.phone,
                    "source": "deep_scrape",
                    "source_url": s.source_url,
                    "confidence": min(s.confidence + 0.1, 1.0),
                })
    except Exception:
        pass

    return findings


async def run_osint_cascade(
    author: str,
    company: str = None,
    company_url: str = None,
    page_text: str = None,
    skip_llm: bool = False,
) -> OSINTResult:
    """
    Run the full OSINT cascade in parallel:
    1. Google dorking (DuckDuckGo/Bing fallback)
    2. Email pattern generation + SMTP verification
    3. Social cross-reference (GitHub, Keybase, Twitter)
    4. Website scraping
    5. LLM fallback (only if no high-confidence email found)
    """
    start = time.time()
    all_findings = []
    breakdown = {}
    google_urls = []

    # Run methods 1-4 in parallel
    tasks = [
        _run_google_dork(author, company),
        _run_email_patterns(author, company_url, company),
        _run_social_crossref(author),
        _run_website_scraper(company_url),
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    for i, result in enumerate(results):
        if isinstance(result, Exception):
            continue
        findings, *stats = result
        all_findings.extend(findings)
        if i == 0:
            breakdown["google"] = stats[0] if stats else 0
            google_urls = stats[1] if len(stats) > 1 else []
        elif i == 1:
            breakdown["email_pattern"] = stats[0] if stats else 0
            breakdown["email_verified"] = stats[1] if len(stats) > 1 else 0
        elif i == 2:
            breakdown["social"] = stats[0] if stats else 0
        elif i == 3:
            breakdown["website"] = stats[0] if stats else 0

    # Deep scrape phase: visit Google result URLs with JS rendering
    # Triggers when we found URLs but have few contacts (JS-heavy pages may need rendering)
    email_findings_count = sum(1 for f in all_findings if f["type"] == "email")
    if google_urls and email_findings_count < 3:
        deep_findings = await _run_deep_scrape(google_urls, company_url)
        if deep_findings:
            all_findings.extend(deep_findings)
            breakdown["deep_scrape"] = len(deep_findings)

    # Method 5: LLM fallback (only if no high-confidence email found)
    has_high_conf_email = any(
        f["confidence"] >= 0.7 for f in all_findings if f["type"] == "email"
    )
    if not skip_llm and not has_high_conf_email and page_text:
        try:
            llm_results = await asyncio.wait_for(
                extract_with_llm(page_text, author, company or ""), timeout=10
            )
            for r in llm_results:
                if r.email:
                    all_findings.append({
                        "type": "email",
                        "value": r.email,
                        "source": "llm",
                        "confidence": r.confidence,
                    })
                elif r.phone:
                    all_findings.append({
                        "type": "phone",
                        "value": r.phone,
                        "source": "llm",
                        "confidence": r.confidence,
                    })
            breakdown["llm"] = len(llm_results)
        except Exception:
            breakdown["llm"] = 0

    # Filter out emails from domains that can't receive email
    all_findings = _filter_invalid_domains(all_findings)

    # Pick the best result
    best_email = None
    best_phone = None
    best_email_conf = 0
    best_phone_conf = 0

    for f in all_findings:
        conf = f.get("confidence", 0)
        if f["type"] == "email" and conf > best_email_conf:
            best_email = f["value"]
            best_email_conf = conf
        elif f["type"] == "phone" and conf > best_phone_conf:
            best_phone = f["value"]
            best_phone_conf = conf

    # Deduplicate findings
    seen = set()
    deduped = []
    for f in all_findings:
        key = (f["type"], f["value"])
        if key not in seen:
            seen.add(key)
            deduped.append(f)

    elapsed = round(time.time() - start, 2)

    return OSINTResult(
        email=best_email,
        phone=best_phone,
        confidence=max(best_email_conf, best_phone_conf),
        source=next((f["source"] for f in deduped if f["value"] == best_email or f["value"] == best_phone), ""),
        verified=any(f.get("verified") for f in deduped if f["value"] == best_email),
        all_findings=deduped,
        method_breakdown=breakdown,
        elapsed_seconds=elapsed,
    )
