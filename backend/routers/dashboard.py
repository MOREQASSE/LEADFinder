from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, text
from database import get_db
from models import Lead, Reply, User, Notification, ApplicationLog, GeneratedDocument
from schemas import (
    DashboardStats, DailyCount, PlatformStat, BudgetRange, NotificationOut,
    DashboardInsights, FunnelStage, PlatformROI, QuickAction,
    AIPerformance, ContactHealth,
)
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = await db.execute(select(func.count(Lead.id)))
    hot = await db.execute(select(func.count(Lead.id)).where(Lead.rank == "Hot"))
    warm = await db.execute(select(func.count(Lead.id)).where(Lead.rank == "Warm"))
    cold = await db.execute(select(func.count(Lead.id)).where(Lead.rank == "Cold"))
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    replied_today = await db.execute(
        select(func.count(Reply.id)).where(Reply.sent_at >= today_start)
    )
    pending = await db.execute(
        select(func.count(Lead.id)).where(Lead.status == "new")
    )
    users = await db.execute(select(func.count(User.id)))

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    daily_rows = await db.execute(
        select(func.date(Lead.created_at).label("day"), func.count(Lead.id).label("cnt"))
        .where(Lead.created_at >= thirty_days_ago)
        .group_by(func.date(Lead.created_at))
        .order_by(func.date(Lead.created_at))
    )
    daily_map = {row.day: row.cnt for row in daily_rows}
    leads_over_time = [
        DailyCount(
            date=(thirty_days_ago + timedelta(days=i)).strftime("%Y-%m-%d"),
            count=daily_map.get((thirty_days_ago + timedelta(days=i)).strftime("%Y-%m-%d"), 0)
        )
        for i in range(31)
    ]

    raw = await db.execute(text("""
        SELECT
          CASE
            WHEN platform LIKE '%Google%' OR platform LIKE '%Maps%' THEN 'Google Maps'
            ELSE platform
          END AS normalized_platform,
          COUNT(*) AS cnt
        FROM leads
        GROUP BY normalized_platform
        ORDER BY cnt DESC
    """))
    platform_rows = raw.all()
    platform_total = sum(row.cnt for row in platform_rows) or 1
    platforms = [
        PlatformStat(platform=row.normalized_platform, count=row.cnt, percentage=round(row.cnt / platform_total * 100, 1))
        for row in platform_rows
    ]

    budget_rows = await db.execute(
        select(
            case(
                (Lead.budget_min == None, "No Budget"),
                (Lead.budget_min < 500, "Under $500"),
                (Lead.budget_min < 1000, "$500 - $1K"),
                (Lead.budget_min < 5000, "$1K - $5K"),
                else_="$5K+"
            ).label("range"),
            func.count(Lead.id).label("cnt")
        )
        .group_by(case(
            (Lead.budget_min == None, "No Budget"),
            (Lead.budget_min < 500, "Under $500"),
            (Lead.budget_min < 1000, "$500 - $1K"),
            (Lead.budget_min < 5000, "$1K - $5K"),
            else_="$5K+"
        ))
        .order_by(func.count(Lead.id).desc())
    )
    range_order = {"No Budget": 0, "Under $500": 1, "$500 - $1K": 2, "$1K - $5K": 3, "$5K+": 4}
    budget_distribution = sorted(
        [BudgetRange(label=row.range, count=row.cnt) for row in budget_rows],
        key=lambda x: range_order.get(x.label, 99)
    )

    return DashboardStats(
        total_leads=total.scalar(),
        hot_leads=hot.scalar(),
        warm_leads=warm.scalar(),
        cold_leads=cold.scalar(),
        replied_today=replied_today.scalar(),
        pending_replies=pending.scalar(),
        active_users=users.scalar(),
        leads_over_time=leads_over_time,
        platforms=platforms,
        budget_distribution=budget_distribution,
    )


# ── Comprehensive Insights Endpoint ──────────────────────────────────────────

def _week_range(weeks_ago: int):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=now.weekday() + 7 * weeks_ago)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=7)
    return start, end


@router.get("/insights", response_model=DashboardInsights)
async def get_insights(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)

    # ── KPI counts ──
    total = (await db.execute(select(func.count(Lead.id)))).scalar() or 0
    hot = (await db.execute(select(func.count(Lead.id)).where(Lead.rank == "Hot"))).scalar() or 0
    warm = (await db.execute(select(func.count(Lead.id)).where(Lead.rank == "Warm"))).scalar() or 0
    cold = (await db.execute(select(func.count(Lead.id)).where(Lead.rank == "Cold"))).scalar() or 0

    hot_this_week = (await db.execute(
        select(func.count(Lead.id)).where(Lead.rank == "Hot", Lead.created_at >= seven_days_ago)
    )).scalar() or 0
    hot_last_week = (await db.execute(
        select(func.count(Lead.id)).where(Lead.rank == "Hot", Lead.created_at >= fourteen_days_ago, Lead.created_at < seven_days_ago)
    )).scalar() or 0
    hot_trend = ((hot_this_week - hot_last_week) / max(hot_last_week, 1)) * 100

    needs_action = (await db.execute(
        select(func.count(Lead.id)).where(
            Lead.rank.in_(["Hot", "Warm"]), Lead.status == "new"
        )
    )).scalar() or 0

    contacted = (await db.execute(
        select(func.count(Lead.id)).where(Lead.application_status.in_(["contacted", "applied", "submitted", "review"]))
    )).scalar() or 0

    replied = (await db.execute(
        select(func.count(Lead.id)).where(Lead.status == "replied")
    )).scalar() or 0
    response_rate = round((replied / max(contacted, 1)) * 100, 1)

    pipeline_value = (await db.execute(
        select(func.coalesce(func.sum(Lead.budget_min), 0)).where(
            Lead.rank.in_(["Hot", "Warm"]), Lead.budget_min.isnot(None)
        )
    )).scalar() or 0

    replied_today = (await db.execute(
        select(func.count(Reply.id)).where(Reply.sent_at >= today_start)
    )).scalar() or 0
    docs_today = (await db.execute(
        select(func.count(GeneratedDocument.id)).where(GeneratedDocument.created_at >= today_start)
    )).scalar() or 0
    today_activity = replied_today + docs_today

    with_email = (await db.execute(
        select(func.count(Lead.id)).where(Lead.contact_email.isnot(None), Lead.contact_email != "")
    )).scalar() or 0
    contact_hit_rate = round((with_email / max(total, 1)) * 100, 1)

    total_app_attempts = (await db.execute(select(func.count(ApplicationLog.id)))).scalar() or 0
    successful_apps = (await db.execute(
        select(func.count(ApplicationLog.id)).where(ApplicationLog.status == "success")
    )).scalar() or 0
    ai_success_rate = round((successful_apps / max(total_app_attempts, 1)) * 100, 1)

    # ── Conversion Funnel ──
    funnel_data = [
        ("Leads Captured", total),
        ("Contact Found", (await db.execute(
            select(func.count(Lead.id)).where(Lead.contact_email.isnot(None), Lead.contact_email != "")
        )).scalar() or 0),
        ("Outreach Sent", contacted),
        ("Reply Received", replied),
        ("Applied", (await db.execute(
            select(func.count(Lead.id)).where(Lead.application_status.in_(["applied", "submitted", "review"]))
        )).scalar() or 0),
    ]
    funnel = [
        FunnelStage(label=label, count=count, percentage=round((count / max(total, 1)) * 100, 1))
        for label, count in funnel_data
    ]

    # ── Platform ROI ──
    platform_raw = await db.execute(text("""
        SELECT
          CASE
            WHEN platform LIKE '%Google%' OR platform LIKE '%Maps%' THEN 'Google Maps'
            ELSE platform
          END AS normalized_platform,
          COUNT(*) AS total,
          SUM(CASE WHEN rank = 'Hot' THEN 1 ELSE 0 END) AS hot_count,
          SUM(CASE WHEN contact_email IS NOT NULL AND contact_email != '' THEN 1 ELSE 0 END) AS has_contact,
          SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) AS replied_count,
          AVG(CASE WHEN budget_min IS NOT NULL THEN budget_min END) AS avg_budget
        FROM leads
        GROUP BY normalized_platform
        ORDER BY total DESC
    """))
    platform_roi = []
    for row in platform_raw.all():
        hot_pct = round((row.hot_count / max(row.total, 1)) * 100, 1)
        contact_rate = round((row.has_contact / max(row.total, 1)) * 100, 1)
        response_rate_p = round((row.replied_count / max(row.has_contact, 1)) * 100, 1)
        roi_score = round((hot_pct * 0.3 + contact_rate * 0.3 + response_rate_p * 0.4) / 10, 1)
        platform_roi.append(PlatformROI(
            platform=row.normalized_platform,
            leads=row.total,
            hot_pct=hot_pct,
            contact_rate=contact_rate,
            response_rate=response_rate_p,
            avg_budget=round(row.avg_budget or 0, 0),
            roi_score=min(roi_score, 10.0),
        ))

    # ── Weekly Comparison ──
    this_week_start, this_week_end = _week_range(0)
    last_week_start, last_week_end = _week_range(1)

    async def _daily_week(start, end):
        rows = await db.execute(
            select(func.date(Lead.created_at).label("day"), func.count(Lead.id).label("cnt"))
            .where(Lead.created_at >= start, Lead.created_at < end)
            .group_by(func.date(Lead.created_at))
            .order_by(func.date(Lead.created_at))
        )
        return {str(row.day): row.cnt for row in rows}

    tw_map = await _daily_week(this_week_start, this_week_end)
    lw_map = await _daily_week(last_week_start, last_week_end)

    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    this_week_data = []
    last_week_data = []
    for i in range(7):
        d = (this_week_start + timedelta(days=i)).strftime("%Y-%m-%d")
        ld = (last_week_start + timedelta(days=i)).strftime("%Y-%m-%d")
        this_week_data.append(DailyCount(date=day_names[i], count=tw_map.get(d, 0)))
        last_week_data.append(DailyCount(date=day_names[i], count=lw_map.get(ld, 0)))

    tw_total = sum(x.count for x in this_week_data)
    lw_total = sum(x.count for x in last_week_data)
    week_change_pct = round(((tw_total - lw_total) / max(lw_total, 1)) * 100, 1)

    # ── Budget Distribution ──
    budget_rows = await db.execute(
        select(
            case(
                (Lead.budget_min == None, "No Budget"),
                (Lead.budget_min < 500, "Under $500"),
                (Lead.budget_min < 1000, "$500 - $1K"),
                (Lead.budget_min < 5000, "$1K - $5K"),
                else_="$5K+"
            ).label("range"),
            func.count(Lead.id).label("cnt")
        )
        .group_by(case(
            (Lead.budget_min == None, "No Budget"),
            (Lead.budget_min < 500, "Under $500"),
            (Lead.budget_min < 1000, "$500 - $1K"),
            (Lead.budget_min < 5000, "$1K - $5K"),
            else_="$5K+"
        ))
        .order_by(func.count(Lead.id).desc())
    )
    range_order = {"No Budget": 0, "Under $500": 1, "$500 - $1K": 2, "$1K - $5K": 3, "$5K+": 4}
    budget_distribution = sorted(
        [BudgetRange(label=row.range, count=row.cnt) for row in budget_rows],
        key=lambda x: range_order.get(x.label, 99)
    )

    # ── Quick Actions ──
    quick_actions = []
    if needs_action > 0:
        quick_actions.append(QuickAction(
            id="needs_action",
            label="Leads Need Action",
            detail=f"{needs_action} Hot/Warm leads sitting idle",
            count=needs_action,
            filter_key="status",
            filter_value="new",
            icon="fa-bolt",
            color="orange",
        ))
    draft_ready = (await db.execute(
        select(func.count(Lead.id)).where(Lead.application_status == "draft_ready")
    )).scalar() or 0
    if draft_ready > 0:
        quick_actions.append(QuickAction(
            id="draft_ready",
            label="Drafts Ready to Send",
            detail=f"{draft_ready} emails drafted, waiting to send",
            count=draft_ready,
            filter_key="application_status",
            filter_value="draft_ready",
            icon="fa-envelope",
            color="blue",
        ))
    failed_apps = (await db.execute(
        select(func.count(ApplicationLog.id)).where(ApplicationLog.status == "failed")
    )).scalar() or 0
    if failed_apps > 0:
        quick_actions.append(QuickAction(
            id="failed_apps",
            label="Failed Auto-Applies",
            detail=f"{failed_apps} attempts failed, review errors",
            count=failed_apps,
            filter_key="application_status",
            filter_value="failed",
            icon="fa-triangle-exclamation",
            color="red",
        ))
    no_contact = total - with_email
    if no_contact > 0:
        quick_actions.append(QuickAction(
            id="no_contact",
            label="Missing Contact Info",
            detail=f"{no_contact} leads have no email, run extract-contact",
            count=no_contact,
            filter_key="application_status",
            filter_value="contact_unavailable",
            icon="fa-address-card",
            color="gray",
        ))

    # ── AI Performance ──
    model_rows = await db.execute(
        select(ApplicationLog.model_used, func.count(ApplicationLog.id).label("cnt"))
        .where(ApplicationLog.model_used.isnot(None))
        .group_by(ApplicationLog.model_used)
        .order_by(func.count(ApplicationLog.id).desc())
    )
    model_usage = {row.model_used: row.cnt for row in model_rows}

    error_rows = await db.execute(
        select(ApplicationLog.error, func.count(ApplicationLog.id).label("cnt"))
        .where(ApplicationLog.error.isnot(None), ApplicationLog.error != "")
        .group_by(ApplicationLog.error)
        .order_by(func.count(ApplicationLog.id).desc())
        .limit(5)
    )
    common_errors = [{"error": row.error[:100], "count": row.cnt} for row in error_rows]

    ai_performance = AIPerformance(
        total_attempts=total_app_attempts,
        success_count=successful_apps,
        fail_count=failed_apps,
        success_rate=ai_success_rate,
        model_usage=model_usage,
        common_errors=common_errors,
    )

    # ── Contact Health ──
    with_phone = (await db.execute(
        select(func.count(Lead.id)).where(Lead.contact_phone.isnot(None), Lead.contact_phone != "")
    )).scalar() or 0

    contact_by_platform = await db.execute(text("""
        SELECT
          CASE
            WHEN platform LIKE '%Google%' OR platform LIKE '%Maps%' THEN 'Google Maps'
            ELSE platform
          END AS normalized_platform,
          COUNT(*) AS total,
          SUM(CASE WHEN contact_email IS NOT NULL AND contact_email != '' THEN 1 ELSE 0 END) AS has_contact
        FROM leads
        GROUP BY normalized_platform
        ORDER BY total DESC
    """))
    contact_health_by_platform = [
        {"platform": row.normalized_platform, "total": row.total, "has_contact": row.has_contact,
         "rate": round((row.has_contact / max(row.total, 1)) * 100, 1)}
        for row in contact_by_platform
    ]

    contact_health = ContactHealth(
        with_email=with_email,
        with_phone=with_phone,
        no_contact=no_contact,
        hit_rate=contact_hit_rate,
        by_platform=contact_health_by_platform,
    )

    return DashboardInsights(
        total_leads=total,
        hot_leads=hot,
        hot_trend=round(hot_trend, 1),
        needs_action=needs_action,
        contacted=contacted,
        response_rate=response_rate,
        pipeline_value=round(pipeline_value, 0),
        today_activity=today_activity,
        contact_hit_rate=contact_hit_rate,
        ai_success_rate=ai_success_rate,
        funnel=funnel,
        platform_roi=platform_roi,
        this_week=this_week_data,
        last_week=last_week_data,
        week_change_pct=week_change_pct,
        budget_distribution=budget_distribution,
        quick_actions=quick_actions,
        ai_performance=ai_performance,
        contact_health=contact_health,
    )


@router.get("/notifications", response_model=list[NotificationOut])
async def get_notifications(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Notification).where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc()).limit(50)
    )
    return result.scalars().all()


@router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Notification).where(Notification.id == notif_id, Notification.user_id == current_user.id))
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        await db.commit()
    return {"status": "ok"}


@router.post("/notifications/read-all")
async def mark_all_read(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False)
    )
    for notif in result.scalars().all():
        notif.is_read = True
    await db.commit()
    return {"status": "ok"}
