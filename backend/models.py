from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON, Index
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String)
    name = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    oauth_provider = Column(String, nullable=True)
    oauth_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (
        Index("idx_leads_platform", "platform"),
        Index("idx_leads_rank", "rank"),
        Index("idx_leads_status", "status"),
        Index("idx_leads_application_status", "application_status"),
        Index("idx_leads_created_at", "created_at"),
    )
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    platform = Column(String, nullable=False)
    url = Column(String, unique=True, nullable=False)
    timestamp = Column(DateTime(timezone=True))
    author = Column(String)
    budget_raw = Column(String)
    budget_min = Column(Float, nullable=True)
    budget_max = Column(Float, nullable=True)
    budget_currency = Column(String, default="USD")
    budget_mad = Column(Float, nullable=True)
    description = Column(Text)
    rank = Column(String, default="Unknown")
    tags = Column(JSON, default=list)
    status = Column(String, default="new")
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    application_status = Column(String, default="not_attempted")
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    contact_source = Column(String, nullable=True)
    linkedin_contact_name = Column(String, nullable=True)
    linkedin_contact_title = Column(String, nullable=True)
    linkedin_contact_url = Column(String, nullable=True)
    linkedin_company_url = Column(String, nullable=True)
    linkedin_connection_note = Column(Text, nullable=True)
    has_easy_apply = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Reply(Base):
    __tablename__ = "replies"
    __table_args__ = (
        Index("idx_replies_lead_id", "lead_id"),
    )
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    draft_content = Column(Text)
    sent_content = Column(Text)
    status = Column(String, default="draft")
    retry_count = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AIConfig(Base):
    __tablename__ = "ai_config"
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    is_primary = Column(Boolean, default=False)
    api_key = Column(String, nullable=True)
    rate_limit_rpm = Column(Integer, default=10)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class GeneratedDocument(Base):
    __tablename__ = "generated_documents"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    doc_type = Column(String, nullable=False)  # "resume" | "cover_letter"
    content_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ResumeData(Base):
    __tablename__ = "resume_data"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String)
    email = Column(String)
    phone = Column(String)
    portfolio_url = Column(String)
    social_links = Column(JSON, default=dict)
    skills = Column(JSON, default=list)
    experience_years = Column(Float, nullable=True)
    education = Column(Text)
    certifications = Column(JSON, default=list)
    languages = Column(JSON, default=list)
    industries = Column(JSON, default=list)
    pricing_min = Column(Float)
    pricing_max = Column(Float)
    website_types = Column(JSON, default=list)
    location = Column(String)
    timezone = Column(String)
    past_projects = Column(Text)
    voice_tone = Column(String, default="professional")
    availability = Column(String)
    additional_notes = Column(Text)
    raw_text = Column(Text)
    resume_file_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PortfolioProject(Base):
    __tablename__ = "portfolio_projects"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    tech_stack = Column(JSON, default=list)
    year = Column(Integer, nullable=True)
    client_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("idx_notifications_user_id", "user_id"),
    )
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ContactSpare(Base):
    __tablename__ = "contact_spares"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    name = Column(String, nullable=False)
    title = Column(String, nullable=True)
    profile_url = Column(String, nullable=False)
    source = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Log(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True, index=True)
    level = Column(String, default="info")
    source = Column(String)
    message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LeadApplicationStatus:
    NOT_ATTEMPTED = "not_attempted"
    CONTACT_UNAVAILABLE = "contact_unavailable"
    DRAFT_READY = "draft_ready"
    CONTACTED = "contacted"
    APPLIED = "applied"
    SUBMITTED = "submitted"
    REVIEW = "review"
    FAILED = "failed"


class ApplicationLog(Base):
    __tablename__ = "application_logs"
    __table_args__ = (
        Index("idx_app_logs_lead_id", "lead_id"),
        Index("idx_app_logs_status", "status"),
    )
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    status = Column(String, nullable=False, default="failed")
    message = Column(Text, nullable=True)
    fields_filled = Column(JSON, default=list)
    steps_taken = Column(JSON, default=list)
    model_used = Column(String, nullable=True)
    error = Column(Text, nullable=True)
    confirmation_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
