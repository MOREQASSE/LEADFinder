import asyncio
import random
import socket
from dataclasses import dataclass

try:
    import dns.resolver
    HAS_DNS = True
except ImportError:
    HAS_DNS = False


@dataclass
class EmailVerification:
    email: str
    valid: bool
    catch_all: bool = False
    method: str = "unknown"
    error: str | None = None


def _get_mx_host(domain: str) -> str | None:
    """Get the MX record hostname for a domain. Falls back to domain itself if it resolves."""
    if HAS_DNS:
        try:
            answers = dns.resolver.resolve(domain, "MX", lifetime=3)
            if answers:
                return str(answers[0].exchange).rstrip(".")
        except dns.resolver.NoAnswer:
            pass
        except Exception:
            pass

        try:
            answers = dns.resolver.resolve(domain, "A", lifetime=3)
            if answers:
                return domain
        except Exception:
            pass

    try:
        socket.getaddrinfo(domain, 0)
        return domain
    except Exception:
        pass

    return None


def _smtp_check(mx_host: str, email: str, sender: str = "verify@osint-checker.com") -> tuple[bool, bool]:
    """Synchronous SMTP RCPT TO probe. Returns (exists, catch_all)."""
    exists = False
    catch_all = False
    sock = None

    try:
        sock = socket.create_connection((mx_host, 25), timeout=4)
        f = sock.makefile("rb")

        banner = f.readline()
        if not banner.startswith(b"220"):
            return exists, catch_all

        f.readline()
        sock.sendall(f"EHLO osint-checker.com\r\n".encode())
        ehlo_response = f.readline()
        if not ehlo_response.startswith(b"250"):
            sock.sendall(f"HELO osint-checker.com\r\n".encode())
            f.readline()

        sock.sendall(f"MAIL FROM:<{sender}>\r\n".encode())
        mail_response = f.readline()
        if not mail_response.startswith(b"250"):
            return exists, catch_all

        sock.sendall(f"RCPT TO:<{email}>\r\n".encode())
        response = f.readline()
        exists = response.startswith(b"250")

        if exists:
            fake = f"xyzfake{random.randint(100000, 999999)}@{email.split('@')[1]}"
            sock.sendall(f"RCPT TO:<{fake}>\r\n".encode())
            fake_response = f.readline()
            catch_all = fake_response.startswith(b"250")

        sock.sendall(b"QUIT\r\n")
        f.close()
        sock.close()
    except Exception:
        pass
    finally:
        if sock:
            try:
                sock.close()
            except Exception:
                pass

    return exists, catch_all


async def verify_email(email: str) -> EmailVerification:
    """Verify an email address via MX record + SMTP probe."""
    if not email or "@" not in email:
        return EmailVerification(email=email, valid=False, method="invalid_format")

    domain = email.split("@")[1].strip().lower()
    if not domain or "." not in domain:
        return EmailVerification(email=email, valid=False, method="invalid_domain")

    mx_host = _get_mx_host(domain)
    if not mx_host:
        return EmailVerification(email=email, valid=False, method="no_mail_records")

    try:
        exists, catch_all = await asyncio.get_event_loop().run_in_executor(
            None, _smtp_check, mx_host, email
        )
        if catch_all:
            return EmailVerification(
                email=email, valid=False, catch_all=True,
                method="smtp_catch_all"
            )
        return EmailVerification(
            email=email, valid=exists,
            method="smtp_verified"
        )
    except Exception as e:
        return EmailVerification(
            email=email, valid=False,
            method="smtp_error", error=str(e)
        )


async def verify_emails_batch(emails: list[str]) -> list[EmailVerification]:
    """Verify multiple emails in chunks (3 at a time, 8s timeout per chunk)."""
    if not emails:
        return []

    results = []
    for i in range(0, len(emails), 3):
        chunk = emails[i:i + 3]
        chunk_tasks = [asyncio.ensure_future(verify_email(eml)) for eml in chunk]
        done, pending = await asyncio.wait(chunk_tasks, timeout=8)
        for task in done:
            try:
                results.append(task.result())
            except Exception:
                results.append(EmailVerification(email="", valid=False, method="batch_error"))
        for task in pending:
            task.cancel()

    return results
