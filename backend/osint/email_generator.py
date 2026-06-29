import re
import tldextract


def extract_domain(url: str) -> str | None:
    """Extract the root domain from a URL."""
    if not url:
        return None
    try:
        ext = tldextract.extract(url)
        if ext.domain and ext.suffix:
            return f"{ext.domain}.{ext.suffix}"
    except Exception:
        pass
    return None


def generate_email_patterns(full_name: str, domain: str = None, username: str = None) -> list[str]:
    """Generate common email permutations from a name and optional domain."""
    if not full_name and not username:
        return []

    candidates = []
    parts = _split_name(full_name or "")
    first = parts.get("first", "").lower()
    last = parts.get("last", "").lower()
    uname = (username or "").lower().strip()

    if domain:
        domain = domain.lower().strip().lstrip("@")

        if first and last:
            patterns = [
                f"{first}{last}",
                f"{first}.{last}",
                f"{first[0]}{last}",
                f"{first}{last[0]}",
                f"{last}{first}",
                f"{last}.{first}",
                f"{last[0]}{first}",
                f"{first}",
                f"{last}",
                f"{first}.{last[0]}",
                f"{first[0]}.{last}",
                f"{last}.{first[0]}",
            ]
            if len(first) > 2:
                patterns.append(f"{first[:3]}{last}")
                patterns.append(f"{first}.{last[:3]}")
            for p in patterns:
                if 2 <= len(p) <= 30:
                    candidates.append(f"{p}@{domain}")

        if uname:
            clean = re.sub(r"[^a-z0-9._-]", "", uname)
            candidates.append(f"{clean}@{domain}")
            if "." in clean or "-" in clean:
                collapsed = re.sub(r"[._-]", "", clean)
                candidates.append(f"{collapsed}@{domain}")

    if uname:
        clean = re.sub(r"[^a-z0-9._-]", "", uname)
        for provider in ["gmail.com", "outlook.com", "yahoo.com", "hotmail.com", "protonmail.com"]:
            candidates.append(f"{clean}@{provider}")

    seen = set()
    unique = []
    for c in candidates:
        c = c.lower().strip()
        if c not in seen and "@" in c and "." in c.split("@")[1]:
            seen.add(c)
            unique.append(c)
    return unique


def _split_name(name: str) -> dict:
    """Split a full name into first and last."""
    name = name.strip()
    if not name:
        return {"first": "", "last": ""}
    parts = re.split(r"\s+", name, maxsplit=2)
    if len(parts) >= 2:
        return {"first": parts[0], "last": parts[-1]}
    return {"first": parts[0], "last": ""}
