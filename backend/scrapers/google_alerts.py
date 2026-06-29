from datetime import datetime
from scrapers.base import BaseScraper, ScrapedLead

class GoogleAlertsScraper(BaseScraper):
    def __init__(self, db=None):
        super().__init__(db)
        self.platform_name = "GoogleAlerts"

    async def _get_credentials(self):
        """Get Gmail credentials from database."""
        if not self.db:
            return None, None
        from utils.settings_loader import get_setting
        email = await get_setting(self.db, "gmail_email", "")
        password = await get_setting(self.db, "gmail_app_password", "")
        return email, password

    async def scrape(self) -> list[ScrapedLead]:
        leads = []
        gmail_email, gmail_password = await self._get_credentials()
        if not gmail_email or not gmail_password:
            print("Gmail credentials not configured. Please add them in Settings > Platform API Keys.")
            return leads
        
        keywords = await self._get_keywords("website,web developer,web design,hire,job,internship")
        exclude = await self._get_exclude("free,cheap,no pay")
        
        try:
            import imaplib
            import email
            from email.header import decode_header
            mail = imaplib.IMAP4_SSL("imap.gmail.com")
            mail.login(gmail_email, gmail_password)
            mail.select("inbox")
            status, messages = mail.search(None, '(FROM "google-alerts@google.com")')
            if status == "OK":
                for num in messages[0].split()[:10]:
                    status, data = mail.fetch(num, "(RFC822)")
                    if status != "OK":
                        continue
                    msg = email.message_from_bytes(data[0][1])
                    subject, encoding = decode_header(msg["Subject"])[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding or "utf-8")
                    if msg.is_multipart():
                        for part in msg.walk():
                            if part.get_content_type() == "text/plain":
                                body = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                                break
                    else:
                        body = msg.get_payload(decode=True).decode("utf-8", errors="ignore")
                    
                    # Filter based on keywords and exclude terms
                    combined = (subject + " " + body).lower()
                    matches_keyword = any(kw in combined for kw in keywords)
                    matches_exclude = any(ex in combined for ex in exclude)
                    
                    if matches_keyword and not matches_exclude:
                        # Strip HTML from email body
                        import re
                        clean_body = re.sub(r'<[^>]+>', '', body)
                        clean_body = ' '.join(clean_body.split())
                        
                        leads.append(ScrapedLead(
                            title=subject[:500],
                            platform="GoogleAlerts",
                            url="",
                            description=clean_body[:1000],
                        ))
            mail.logout()
        except Exception as e:
            print(f"Google Alerts scrape error: {e}")
        return leads
