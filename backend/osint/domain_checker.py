try:
    import dns.resolver
    HAS_DNS = True
except ImportError:
    HAS_DNS = False

KNOWN_SOCIAL_DOMAINS = {
    "mastodon.social", "mastodon.world", "mastodon.online", "mastodon.art",
    "fosstodon.org", "infosec.exchange", "hachyderm.io",
    "norden.social", "toot.cafe", "mas.to", "mastodon.cloud",
    "mstdn.social", "social.coop", "universeodon.com",
    "kolektiva.social", "pawoo.net", "pleroma.site",
    "akkoma.social", "gotosocial.social", "gnulinux.social",
    "mastodon.green", "mastodon.technology", "mastodon.xyz",
    "mastodon.me.uk", "bird.trom.tf", "wreckage.systems",
    "bsd.network", "climatejustice.social", "counter.social",
    "c.im", "merveilles.town", "mastodon.lol",
    "mastodon.au.com", "mastodon.ie", "mastodon.nz",
    "mastodon.top", "mastodonapp.uk",
}


def domain_can_receive_email(domain: str) -> bool:
    """
    Check if a domain can likely receive email.
    Returns False for known social-only domains or domains with no DNS records.
    """
    if not domain or "." not in domain:
        return False
    domain = domain.lower().strip()

    if domain in KNOWN_SOCIAL_DOMAINS:
        return False

    if HAS_DNS:
        try:
            answers = dns.resolver.resolve(domain, "MX", lifetime=2)
            if answers:
                return True
        except dns.resolver.NXDOMAIN:
            return False
        except Exception:
            pass

        try:
            answers = dns.resolver.resolve(domain, "A", lifetime=2)
            if answers:
                return True
        except dns.resolver.NXDOMAIN:
            return False
        except Exception:
            pass

        try:
            answers = dns.resolver.resolve(domain, "AAAA", lifetime=2)
            if answers:
                return True
        except Exception:
            pass

    import socket
    try:
        socket.getaddrinfo(domain, 0)
        return True
    except Exception:
        pass

    return False
