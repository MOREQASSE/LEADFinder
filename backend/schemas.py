from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    name: Optional[str]
    is_active: bool
    is_admin: bool
    class Config:
        from_attributes = True

class LeadOut(BaseModel):
    id: int
    title: str
    platform: str
    url: str
    timestamp: Optional[datetime]
    author: Optional[str]
    budget_raw: Optional[str]
    budget_min: Optional[float]
    budget_max: Optional[float]
    budget_currency: Optional[str]
    budget_mad: Optional[float]
    description: Optional[str]
    rank: Optional[str]
    tags: Optional[List[str]]
    status: str
    application_status: Optional[str] = "not_attempted"
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_source: Optional[str] = None
    linkedin_contact_name: Optional[str] = None
    linkedin_contact_title: Optional[str] = None
    linkedin_contact_url: Optional[str] = None
    linkedin_company_url: Optional[str] = None
    linkedin_connection_note: Optional[str] = None
    has_easy_apply: bool = False
    class Config:
        from_attributes = True

class LeadUpdate(BaseModel):
    status: Optional[str] = None
    rank: Optional[str] = None
    assigned_to: Optional[int] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    application_status: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_source: Optional[str] = None
    linkedin_contact_name: Optional[str] = None
    linkedin_contact_title: Optional[str] = None
    linkedin_contact_url: Optional[str] = None
    linkedin_company_url: Optional[str] = None
    linkedin_connection_note: Optional[str] = None

class ReplyOut(BaseModel):
    id: int
    lead_id: int
    user_id: int
    draft_content: Optional[str]
    sent_content: Optional[str]
    status: str
    retry_count: int
    last_error: Optional[str]
    sent_at: Optional[datetime]
    class Config:
        from_attributes = True

class ReplyGenerate(BaseModel):
    lead_id: int

class ReplySend(BaseModel):
    reply_id: int
    content: Optional[str] = None

class SettingOut(BaseModel):
    key: str
    value: str

class SettingUpdate(BaseModel):
    value: str

class AIConfigOut(BaseModel):
    id: int
    provider: str
    model: str
    is_primary: bool
    api_key: Optional[str]
    rate_limit_rpm: int
    class Config:
        from_attributes = True

class AIConfigCreate(BaseModel):
    provider: str
    model: str
    is_primary: bool = False
    api_key: Optional[str] = None
    rate_limit_rpm: int = 10

class GeneratedDocumentOut(BaseModel):
    id: int
    lead_id: int
    doc_type: str
    content_json: dict
    created_at: Optional[datetime]
    class Config:
        from_attributes = True

class ResumeDataOut(BaseModel):
    id: int
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    portfolio_url: Optional[str] = None
    social_links: Optional[dict] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[float] = None
    education: Optional[str] = None
    certifications: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    industries: Optional[List[str]] = None
    pricing_min: Optional[float] = None
    pricing_max: Optional[float] = None
    website_types: Optional[List[str]] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    past_projects: Optional[str] = None
    voice_tone: Optional[str] = None
    availability: Optional[str] = None
    additional_notes: Optional[str] = None
    resume_file_path: Optional[str] = None
    class Config:
        from_attributes = True

class ResumeUpload(BaseModel):
    raw_text: str

class ResumeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    portfolio_url: Optional[str] = None
    social_links: Optional[dict] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[float] = None
    education: Optional[str] = None
    certifications: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    industries: Optional[List[str]] = None
    pricing_min: Optional[float] = None
    pricing_max: Optional[float] = None
    website_types: Optional[List[str]] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    past_projects: Optional[str] = None
    voice_tone: Optional[str] = None
    availability: Optional[str] = None
    additional_notes: Optional[str] = None

class PortfolioProjectOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    year: Optional[int] = None
    client_name: Optional[str] = None
    class Config:
        from_attributes = True

class PortfolioProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    year: Optional[int] = None
    client_name: Optional[str] = None

class PortfolioProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    year: Optional[int] = None
    client_name: Optional[str] = None

class NotificationOut(BaseModel):
    id: int
    title: str
    message: Optional[str]
    is_read: bool
    lead_id: Optional[int]
    created_at: Optional[datetime]
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class DailyCount(BaseModel):
    date: str
    count: int

class PlatformStat(BaseModel):
    platform: str
    count: int
    percentage: float

class BudgetRange(BaseModel):
    label: str
    count: int

class DashboardStats(BaseModel):
    total_leads: int
    hot_leads: int
    warm_leads: int
    cold_leads: int
    replied_today: int
    pending_replies: int
    active_users: int
    leads_over_time: list[DailyCount]
    platforms: list[PlatformStat]
    budget_distribution: list[BudgetRange]


class FunnelStage(BaseModel):
    label: str
    count: int
    percentage: float

class PlatformROI(BaseModel):
    platform: str
    leads: int
    hot_pct: float
    contact_rate: float
    response_rate: float
    avg_budget: float
    roi_score: float

class QuickAction(BaseModel):
    id: str
    label: str
    detail: str
    count: int
    filter_key: str
    filter_value: str
    icon: str
    color: str

class AIPerformance(BaseModel):
    total_attempts: int
    success_count: int
    fail_count: int
    success_rate: float
    model_usage: dict
    common_errors: list[dict]

class ContactHealth(BaseModel):
    with_email: int
    with_phone: int
    no_contact: int
    hit_rate: float
    by_platform: list[dict]

class DashboardInsights(BaseModel):
    total_leads: int
    hot_leads: int
    hot_trend: float
    needs_action: int
    contacted: int
    response_rate: float
    pipeline_value: float
    today_activity: int
    contact_hit_rate: float
    ai_success_rate: float
    funnel: list[FunnelStage]
    platform_roi: list[PlatformROI]
    this_week: list[DailyCount]
    last_week: list[DailyCount]
    week_change_pct: float
    budget_distribution: list[BudgetRange]
    quick_actions: list[QuickAction]
    ai_performance: AIPerformance
    contact_health: ContactHealth
