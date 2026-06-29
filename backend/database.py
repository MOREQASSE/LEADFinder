from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from config import settings

engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=False,
    connect_args={"timeout": 20}
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

MIGRATIONS = [
    "ALTER TABLE leads ADD COLUMN application_status VARCHAR DEFAULT 'not_attempted'",
    "ALTER TABLE leads ADD COLUMN contact_email VARCHAR",
    "ALTER TABLE leads ADD COLUMN contact_phone VARCHAR",
    "ALTER TABLE leads ADD COLUMN contact_source VARCHAR",
    "ALTER TABLE resume_data ADD COLUMN resume_file_path VARCHAR",
    "ALTER TABLE leads ADD COLUMN linkedin_contact_name VARCHAR",
    "ALTER TABLE leads ADD COLUMN linkedin_contact_title VARCHAR",
    "ALTER TABLE leads ADD COLUMN linkedin_contact_url VARCHAR",
    "ALTER TABLE leads ADD COLUMN linkedin_company_url VARCHAR",
    "ALTER TABLE leads ADD COLUMN linkedin_connection_note TEXT",
    "CREATE INDEX IF NOT EXISTS idx_leads_platform ON leads(platform)",
    "CREATE INDEX IF NOT EXISTS idx_leads_rank ON leads(rank)",
    "CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)",
    "CREATE INDEX IF NOT EXISTS idx_leads_application_status ON leads(application_status)",
    "CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_replies_lead_id ON replies(lead_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
    "CREATE TABLE IF NOT EXISTS contact_spares (id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER NOT NULL REFERENCES leads(id), name VARCHAR NOT NULL, title VARCHAR, profile_url VARCHAR NOT NULL, source VARCHAR, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE INDEX IF NOT EXISTS idx_contact_spares_lead_id ON contact_spares(lead_id)",
]

async def init_db():
    async with engine.begin() as conn:
        from models import Base
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("PRAGMA journal_mode=WAL"))
        for stmt in MIGRATIONS:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass
