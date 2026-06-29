import re
from sqlalchemy.ext.asyncio import AsyncSession

async def parse_resume(raw_text: str, db: AsyncSession = None) -> dict:
    if db is not None:
        try:
            from ai.ai_resume_parser import ai_parse_resume
            return await ai_parse_resume(raw_text, db)
        except Exception:
            pass
    return _regex_parse_resume(raw_text)


def _regex_parse_resume(raw_text: str) -> dict:
    text = raw_text.lower()

    name = _regex_extract(raw_text, r"(?:name|my name is)\s*:?\s*([A-Za-z\s]+?)(?:\n|$)")
    email = _regex_extract(raw_text, r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})")
    phone = _regex_extract(raw_text, r"(\+?\d[\d\s\-().]{7,}\d)")
    portfolio = _regex_extract(raw_text, r"(?:portfolio|website|url|site)\s*:?\s*(https?://[^\s]+)")
    location = _regex_extract(raw_text, r"(?:location|city|based in|based)\s*:?\s*([^.\n]+)")
    timezone = _regex_extract(raw_text, r"(?:timezone|tz|time zone)\s*:?\s*([^.\n]+)")

    price_patterns = re.findall(r"(\d+)\s*[-to]*\s*(\d*)\s*(mad|usd|eur|dh)?", text)
    vals = []
    for p in price_patterns:
        try:
            vals.append(float(p[0]))
            if p[1]:
                vals.append(float(p[1]))
        except ValueError:
            pass
    pricing_min = min(vals) if vals else 0.0
    pricing_max = max(vals) if vals else 0.0

    website_types = []
    type_keywords = {
        "e-commerce": ["e-commerce", "ecommerce", "shop", "store", "woocommerce", "shopify"],
        "portfolio": ["portfolio", "personal site", "showcase"],
        "blog": ["blog", "blogging", "wordpress"],
        "custom web app": ["web app", "saas", "application", "custom", "react", "django", "full stack"],
        "landing page": ["landing", "lead generation", "funnel"],
    }
    for wtype, keywords in type_keywords.items():
        if any(kw in text for kw in keywords):
            website_types.append(wtype)
    if not website_types:
        website_types = ["web development"]

    voice_tone = "professional"
    for tone, kws in {"friendly": ["friendly"], "casual": ["casual", "chill"], "technical": ["technical", "geeky"]}.items():
        if any(kw in text for kw in kws):
            voice_tone = tone
            break

    availability = _regex_extract(raw_text, r"(?:available?|start|availability)\s*:?\s*([^.\n]+)")
    education = _regex_extract(raw_text, r"(?:education|degree|studied|studying)\s*:?\s*([^.\n]+)")
    experience_years = 0.0
    exp_match = re.search(r"(\d+)\s*(?:\+?\s*years?\s*(?:of\s*)?(?:exp|experience))", text)
    if exp_match:
        try:
            experience_years = float(exp_match.group(1))
        except ValueError:
            pass
    skills = _extract_skills(text, raw_text)
    industries = _extract_industries(text)

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "portfolio_url": portfolio,
        "social_links": {},
        "skills": skills,
        "experience_years": experience_years,
        "education": education,
        "certifications": [],
        "languages": [],
        "industries": industries,
        "pricing_min": pricing_min,
        "pricing_max": pricing_max,
        "website_types": website_types,
        "location": location,
        "timezone": timezone,
        "past_projects": "",
        "voice_tone": voice_tone,
        "availability": availability,
        "additional_notes": "",
    }


def _regex_extract(text: str, pattern: str) -> str:
    m = re.search(pattern, text, re.IGNORECASE)
    return m.group(1).strip() if m else ""


def _extract_skills(text: str, raw: str) -> list:
    known = [
        "html", "css", "javascript", "js", "typescript", "ts", "python", "react",
        "vue", "angular", "node", "nodejs", "php", "ruby", "rails", "django",
        "flask", "fastapi", "sql", "mysql", "postgresql", "mongodb", "firebase",
        "aws", "azure", "gcp", "docker", "kubernetes", "git", "github", "rest",
        "graphql", "api", "sass", "less", "tailwind", "bootstrap", "jquery",
        "wordpress", "shopify", "woocommerce", "laravel", "symfony", "nextjs",
        "nuxt", "express", "nest", "go", "rust", "c#", ".net", "java", "kotlin",
        "swift", "flutter", "react native", "seo", "ui/ux", "figma", "photoshop",
    ]
    found = []
    for skill in known:
        if skill in text:
            found.append(skill)
    title_case = []
    for s in found:
        if s in ("html", "css", "js", "ts", "sql", "aws", "gcp", "seo", "api", "ui/ux"):
            title_case.append(s.upper())
        elif s == "c#":
            title_case.append("C#")
        elif s == ".net":
            title_case.append(".NET")
        elif s == "nodejs":
            title_case.append("Node.js")
        elif s == "nextjs":
            title_case.append("Next.js")
        elif s == "react native":
            title_case.append("React Native")
        else:
            title_case.append(s.capitalize())
    return title_case[:15]


def _extract_industries(text: str) -> list:
    industry_map = {
        "health": ["health", "medical", "clinic", "hospital", "doctor", "dentist"],
        "e-commerce": ["e-commerce", "ecommerce", "retail", "shop", "store"],
        "real estate": ["real estate", "property", "agent", "realtor"],
        "hospitality": ["hotel", "restaurant", "cafe", "food", "hospitality"],
        "education": ["education", "school", "university", "course", "training"],
        "technology": ["tech", "software", "saas", "startup"],
        "legal": ["law", "lawyer", "legal", "attorney", "notary"],
        "creative": ["photography", "design", "art", "creative", "agency"],
    }
    found = []
    for industry, keywords in industry_map.items():
        if any(kw in text for kw in keywords):
            found.append(industry)
    return found[:5]
