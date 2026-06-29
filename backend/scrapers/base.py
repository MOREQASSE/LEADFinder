from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional

class ScrapedLead:
    def __init__(self, title: str, platform: str, url: str, timestamp: Optional[datetime] = None,
                 author: str = "", description: str = "", budget_raw: str = "",
                 budget_min: Optional[float] = None, budget_max: Optional[float] = None,
                 budget_currency: str = "USD"):
        self.title = title
        self.platform = platform
        self.url = url
        self.timestamp = timestamp or datetime.utcnow()
        self.author = author
        self.description = description
        self.budget_raw = budget_raw
        self.budget_min = budget_min
        self.budget_max = budget_max
        self.budget_currency = budget_currency

class BaseScraper(ABC):
    def __init__(self, db=None):
        self.platform_name = ""
        self.db = db

    @abstractmethod
    async def scrape(self) -> list[ScrapedLead]:
        pass

    async def _get_keywords(self, default="web development,website design"):
        if not self.db:
            return [k.strip() for k in default.split(",")]
        from utils.settings_loader import get_setting
        kw_str = await get_setting(self.db, "search_keywords", default)
        return [k.strip().lower() for k in kw_str.split(",") if k.strip()]

    async def _get_exclude(self, default="free,cheap"):
        if not self.db:
            return [e.strip() for e in default.split(",")]
        from utils.settings_loader import get_setting
        ex_str = await get_setting(self.db, "search_exclude", default)
        return [e.strip().lower() for e in ex_str.split(",") if e.strip()]

    # ── Search Mode Awareness ─────────────────────────────────────

    async def _get_mode(self) -> str:
        """Return the active search mode. Falls back to clients_excavator."""
        if not self.db:
            return "clients_excavator"
        from utils.settings_loader import get_setting
        return await get_setting(self.db, "search_mode", "clients_excavator")

    async def _get_mode_keywords(self, base_keywords: list[str]) -> list[str]:
        """Merge preset keywords with mode-specific modifiers."""
        mode = await self._get_mode()
        from scrapers.modes import SEARCH_MODES
        modifiers = SEARCH_MODES.get(mode, {}).get("keywords_modifiers", [])
        merged = base_keywords + modifiers
        seen = set()
        result = []
        for kw in merged:
            kw_norm = kw.strip().lower()
            if kw_norm and kw_norm not in seen:
                seen.add(kw_norm)
                result.append(kw_norm)
        return result

    async def _get_mode_exclude(self, base_exclude: list[str]) -> list[str]:
        """Merge preset exclude terms with mode-specific exclude terms."""
        mode = await self._get_mode()
        from scrapers.modes import SEARCH_MODES
        modifiers = SEARCH_MODES.get(mode, {}).get("exclude_modifiers", [])
        merged = base_exclude + modifiers
        seen = set()
        result = []
        for ex in merged:
            ex_norm = ex.strip().lower()
            if ex_norm and ex_norm not in seen:
                seen.add(ex_norm)
                result.append(ex_norm)
        return result

    async def _get_geo_context(self) -> dict:
        """Return {location, timezone, radius} from ResumeData or settings."""
        location = ""
        timezone = ""
        radius = "national"
        if self.db:
            from utils.settings_loader import get_setting
            from sqlalchemy import select
            from models import ResumeData
            # 1. Use the explicit country setting if available (set via Settings page)
            country = await get_setting(self.db, "country", "")
            if country:
                location = country
            else:
                # 2. Fall back to ResumeData location
                try:
                    result = await self.db.execute(select(ResumeData).limit(1))
                    resume = result.scalars().first()
                    if resume:
                        raw_location = resume.location or ""
                        if raw_location and raw_location[0].isdigit():
                            parts = [p.strip() for p in raw_location.split(",")]
                            location = parts[-1] if len(parts) > 1 else raw_location
                        else:
                            location = raw_location
                        timezone = resume.timezone or ""
                except Exception:
                    pass
            # 3. Fall back to user_location setting
            if not location:
                location = await get_setting(self.db, "user_location", "")
            radius = await get_setting(self.db, "geo_radius", "national")
        return {"location": location, "timezone": timezone, "radius": radius}
