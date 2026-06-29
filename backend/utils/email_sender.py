import smtplib
import json
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.ext.asyncio import AsyncSession
from utils.settings_loader import get_setting

RATE_LIMIT_KEY = "email_rate_limit_hour"
RATE_LIMIT_DAILY_KEY = "email_rate_limit_daily"
SEND_LOG_KEY = "email_send_log"

DEFAULT_HOURLY = 50
DEFAULT_DAILY = 400

async def get_gmail_credentials(db: AsyncSession) -> tuple[str, str] | None:
    email = await get_setting(db, "gmail_email", "")
    password = await get_setting(db, "gmail_app_password", "")
    if not email or not password:
        return None
    return (email, password)

async def check_rate_limits(db: AsyncSession) -> tuple[bool, str]:
    hourly_str = await get_setting(db, RATE_LIMIT_KEY, str(DEFAULT_HOURLY))
    daily_str = await get_setting(db, RATE_LIMIT_DAILY_KEY, str(DEFAULT_DAILY))
    hourly_max = int(hourly_str) if hourly_str.isdigit() else DEFAULT_HOURLY
    daily_max = int(daily_str) if daily_str.isdigit() else DEFAULT_DAILY

    log_str = await get_setting(db, SEND_LOG_KEY, "[]")
    try:
        log = json.loads(log_str)
    except (json.JSONDecodeError, TypeError):
        log = []

    now = time.time()
    hour_ago = now - 3600
    today_start = now - 86400

    recent_hour = [t for t in log if t > hour_ago]
    recent_day = [t for t in log if t > today_start]

    if len(recent_hour) >= hourly_max:
        return False, f"Hourly limit reached ({hourly_max}/hour)"
    if len(recent_day) >= daily_max:
        return False, f"Daily limit reached ({daily_max}/day)"

    return True, "ok"

async def log_send(db: AsyncSession):
    import json
    log_str = await get_setting(db, SEND_LOG_KEY, "[]")
    try:
        log = json.loads(log_str)
    except (json.JSONDecodeError, TypeError):
        log = []
    log.append(time.time())
    cutoff = time.time() - 86400 * 7
    log = [t for t in log if t > cutoff]
    from models import Setting
    from sqlalchemy import select
    result = await db.execute(select(Setting).where(Setting.key == SEND_LOG_KEY))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = json.dumps(log)
    else:
        db.add(Setting(key=SEND_LOG_KEY, value=json.dumps(log)))
    await db.commit()

async def send_email(to: str, subject: str, html_body: str, db: AsyncSession) -> tuple[bool, str]:
    creds = await get_gmail_credentials(db)
    if not creds:
        return False, "Gmail not configured. Set gmail_email and gmail_app_password in Settings."

    email_addr, app_password = creds

    ok, msg = await check_rate_limits(db)
    if not ok:
        return False, msg

    try:
        msg_obj = MIMEMultipart("alternative")
        msg_obj["From"] = email_addr
        msg_obj["To"] = to
        msg_obj["Subject"] = subject
        msg_obj.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as server:
            server.login(email_addr, app_password)
            server.sendmail(email_addr, to, msg_obj.as_string())

        await log_send(db)
        return True, "Sent"
    except smtplib.SMTPAuthenticationError:
        return False, "Gmail authentication failed. Check app password."
    except smtplib.SMTPRecipientsRefused:
        return False, "Recipient refused by server."
    except Exception as e:
        return False, f"SMTP error: {str(e)}"
