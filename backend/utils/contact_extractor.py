import re
import httpx
from bs4 import BeautifulSoup

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}")
URL_RE = re.compile(r"https?://[^\s<>\"']+")

async def extract_reddit_contact(author: str, url: str) -> tuple[str | None, str | None, str | None]:
    if not author:
        return None, None, None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"https://www.reddit.com/user/{author}/about.json", headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code == 200:
                data = resp.json()
                about = data.get("data", {}).get("subreddit", {}).get("public_description", "") or ""
                combined = about
                emails = EMAIL_RE.findall(combined)
                if emails:
                    return emails[0], None, "reddit_profile"
                urls = URL_RE.findall(combined)
                if urls:
                    return None, None, "reddit_profile_link"
            resp2 = await client.get(f"https://www.reddit.com/user/{author}/", headers={"User-Agent": "Mozilla/5.0"})
            if resp2.status_code == 200:
                soup = BeautifulSoup(resp2.text, "html.parser")
                text = soup.get_text()
                emails = EMAIL_RE.findall(text)
                if emails:
                    return emails[0], None, "reddit_profile"
        if url:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    text = soup.get_text()
                    body = text[:5000]
                    emails = EMAIL_RE.findall(body)
                    phones = PHONE_RE.findall(body)
                    email = emails[0] if emails else None
                    phone = phones[0] if phones else None
                    source = "reddit_post"
                    if email or phone:
                        return email, phone, source
    except Exception:
        pass
    return None, None, None

MASTODON_INSTANCE = "https://mastodon.social"

MASTODON_DOMAINS = {
    "mastodon.social", "mastodon.world", "mastodon.online", "mastodon.art",
    "fosstodon.org", "infosec.exchange", "hachyderm.io", "fosstodon.org",
    "norden.social", "toot.cafe", "bird.trom.tf", "mas.to",
    "mastodon.cloud", "mastodon.green", "mastodon.me.uk", "mastodon.technology",
    "mastodon.xyz", "mstdn.social", "social.coop", "wreckage.systems",
    "bsd.network", "climatejustice.social", "counter.social", "c.im",
    "fedi.tokyo", "glammr.us", "igmoid.com", "handels.gq",
    "kolektiva.social", "lgbtqia.space", "likviditas.com",
    "merveilles.town", "mouse.services", "musicfans.social",
    "otter.social", "pawoo.net", "plush.city", "queer.party",
    "radiation.party", "rayboy.com", "roleplay.chat", "social.density.im",
    "spells根.io", "tail.co", "thatastuteostrich.com", "toot.wales",
    "treekz.net", "universeodon.com", "vgb.social", "wandering.shop",
    "xoxo.zone", "gnulinux.social",
}


def _is_mastodon_fake_email(email: str, account: dict = None) -> bool:
    """Check if an email is a Mastodon acct-style address, not a real email."""
    if not email or "@" not in email:
        return False
    local, domain = email.lower().rsplit("@", 1)
    if domain in MASTODON_DOMAINS:
        return True
    if account:
        acct = (account.get("acct") or "").lower()
        username = acct.split("@")[0]
        if local == username and domain in MASTODON_DOMAINS:
            return True
    if "." not in domain:
        return True
    return False

async def _fetch_mastodon_account(username: str, access_token: str = None) -> dict:
    if not username:
        return {}
    try:
        headers = {}
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{MASTODON_INSTANCE}/api/v1/accounts/lookup?acct={username}",
                headers=headers,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data
    except Exception:
        pass
    return {}

async def extract_mastodon_contact(author: str, access_token: str = None) -> tuple[str | None, str | None, str | None]:
    account = await _fetch_mastodon_account(author, access_token)
    if not account:
        return None, None, None
    note = (account.get("note") or "")
    fields = (account.get("fields") or [])
    email = None
    phone = None
    for field in fields:
        val = (field.get("value") or "")
        name = (field.get("name") or "").lower()
        if "email" in name:
            found = EMAIL_RE.findall(val)
            if found and not _is_mastodon_fake_email(found[0], account):
                email = found[0]
        elif "phone" in name or "tel" in name:
            found = PHONE_RE.findall(val)
            if found:
                phone = found[0]
        if not email:
            found = EMAIL_RE.findall(val)
            if found and not _is_mastodon_fake_email(found[0], account):
                email = found[0]
    if not email:
        found = EMAIL_RE.findall(note)
        if found:
            for e in found:
                if not _is_mastodon_fake_email(e, account):
                    email = e
                    break
    if not phone:
        found = PHONE_RE.findall(note)
        if found:
            phone = found[0]
    source = "mastodon_bio" if (email or phone) else None
    return email, phone, source

async def extract_craigslist_contact(url: str) -> tuple[str | None, str | None, str | None]:
    if not url:
        return None, None, None
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                reply_btn = soup.select_one("[data-reply-email]")
                if reply_btn:
                    email = reply_btn.get("data-reply-email")
                    if email:
                        return email, None, "craigslist_reply_email"
                body = soup.get_text()[:5000]
                emails = EMAIL_RE.findall(body)
                phones = PHONE_RE.findall(body)
                if emails:
                    return emails[0], phones[0] if phones else None, "craigslist_post"
                if phones:
                    return None, phones[0], "craigslist_post_phone"
    except Exception:
        pass
    return None, None, None

async def extract_hackernews_contact(author: str) -> tuple[str | None, str | None, str | None]:
    if not author:
        return None, None, None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"https://hacker-news.firebaseio.com/v0/user/{author}.json")
            if resp.status_code == 200:
                data = resp.json()
                about = data.get("about", "") or ""
                emails = EMAIL_RE.findall(about)
                if emails:
                    return emails[0], None, "hackernews_profile"
                urls = URL_RE.findall(about)
                if urls:
                    return None, None, "hackernews_profile_link"
    except Exception:
        pass
    return None, None, None

async def extract_contact(platform: str, author: str, url: str, extra: dict = None) -> tuple[str | None, str | None, str | None]:
    platform = platform.lower()
    if platform == "reddit":
        return await extract_reddit_contact(author, url)
    elif platform == "mastodon":
        token = (extra or {}).get("access_token")
        return await extract_mastodon_contact(author, token)
    elif platform == "craigslist":
        return await extract_craigslist_contact(url)
    elif platform == "hackernews":
        return await extract_hackernews_contact(author)
    return None, None, None
