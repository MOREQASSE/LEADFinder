import re
import httpx
from dataclasses import dataclass

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")


@dataclass
class SocialResult:
    platform: str
    username: str
    url: str
    email: str | None = None
    display_name: str | None = None


def _normalize_username(name: str) -> str:
    return re.sub(r"[^a-z0-9._-]", "", name.lower().strip())


async def check_github(username: str) -> SocialResult | None:
    """Check GitHub for public profile email."""
    uname = _normalize_username(username)
    if not uname:
        return None

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(f"https://api.github.com/users/{uname}")
            if resp.status_code == 200:
                data = resp.json()
                email = data.get("email")
                return SocialResult(
                    platform="github",
                    username=uname,
                    url=f"https://github.com/{uname}",
                    email=email,
                    display_name=data.get("name"),
                )
        except Exception:
            pass

        try:
            resp = await client.get(
                f"https://api.github.com/users/{uname}/events/public",
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if resp.status_code == 200:
                for event in resp.json()[:20]:
                    payload = event.get("payload", {})
                    for key in ["email", "commits"]:
                        if key == "email" and payload.get("email"):
                            return SocialResult(
                                platform="github_events",
                                username=uname,
                                url=f"https://github.com/{uname}",
                                email=payload["email"],
                            )
                    commits = payload.get("commits", [])
                    for c in commits:
                        author = c.get("author", {})
                        if author.get("email") and author.get("email") != "noreply@github.com":
                            return SocialResult(
                                platform="github_commit",
                                username=uname,
                                url=f"https://github.com/{uname}",
                                email=author["email"],
                                display_name=author.get("name"),
                            )
        except Exception:
            pass

    return None


async def check_keybase(username: str) -> SocialResult | None:
    """Check Keybase for public profile email."""
    uname = _normalize_username(username)
    if not uname:
        return None

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(f"https://keybase.io/_/api/1.0/user/lookup.json?username={uname}")
            if resp.status_code == 200:
                data = resp.json()
                for them in data.get("them", []):
                    basics = them.get("basics", {})
                    if basics.get("username") == uname:
                        emails = them.get("proofs", {}).get("all", [])
                        primary = data.get("them", [{}])[0] if data.get("them") else {}
                        profile = primary.get("profile", {})
                        return SocialResult(
                            platform="keybase",
                            username=uname,
                            url=f"https://keybase.io/{uname}",
                            email=profile.get("email"),
                            display_name=profile.get("full_name"),
                        )
        except Exception:
            pass
    return None


async def check_twitter(username: str) -> SocialResult | None:
    """Check Twitter/X for profile info (limited without API)."""
    uname = _normalize_username(username)
    if not uname:
        return None

    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        try:
            resp = await client.get(
                f"https://x.com/{uname}",
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                },
            )
            if resp.status_code == 200:
                text = resp.text
                meta_desc = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', text)
                desc = meta_desc.group(1) if meta_desc else ""
                emails = EMAIL_RE.findall(text)
                real_emails = [e for e in emails if "twitter.com" not in e and "x.com" not in e]
                if real_emails:
                    return SocialResult(
                        platform="twitter",
                        username=uname,
                        url=f"https://x.com/{uname}",
                        email=real_emails[0],
                        display_name=desc.split(" - ")[0] if " - " in desc else None,
                    )
        except Exception:
            pass
    return None


async def cross_reference(username: str) -> list[SocialResult]:
    """Run username across multiple social platforms."""
    if not username:
        return []

    tasks = [check_github(username), check_keybase(username), check_twitter(username)]
    results = await _gather_with_none(*tasks)
    return [r for r in results if r is not None]


async def _gather_with_none(*coros):
    """Gather coroutines, returning None for failures."""
    import asyncio
    async def _safe(coro):
        try:
            return await asyncio.wait_for(coro, timeout=10)
        except Exception:
            return None
    return await asyncio.gather(*[_safe(c) for c in coros])
