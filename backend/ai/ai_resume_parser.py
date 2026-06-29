import json
from sqlalchemy.ext.asyncio import AsyncSession
from ai.fallback import query_with_fallback

PARSER_PROMPT = """You are a resume parser. Extract structured data from the following resume text and return ONLY a valid JSON object with these fields:

{{
  "name": "Full name or empty string",
  "email": "Email address or empty string",
  "phone": "Phone number or empty string",
  "portfolio_url": "Portfolio/website URL or empty string",
  "social_links": {{"github": "", "linkedin": "", "twitter": "", "other": ""}},
  "skills": ["skill1", "skill2"],
  "experience_years": number of years of experience (or 0),
  "education": "Education details or empty string",
  "certifications": ["cert1", "cert2"],
  "languages": ["language1", "language2"],
  "industries": ["industry1", "industry2"],
  "pricing_min": minimum price as number (or 0),
  "pricing_max": maximum price as number (or 0),
  "website_types": ["type1"] (e.g. e-commerce, portfolio, blog, landing page, custom web app, web development),
  "location": "City, Country or empty string",
  "timezone": "Timezone or empty string",
  "past_projects": "Brief description of past projects or empty string",
  "voice_tone": "professional/friendly/casual/technical (default professional)",
  "availability": "Availability description or empty string",
  "additional_notes": "Any other relevant info or empty string"
}}

Rules:
- Use empty string "" for missing text fields
- Use empty list [] for missing array fields
- Use empty object {{}} for missing object fields
- Use 0 for missing number fields
- If a field is clearly not present, use the default empty value
- Keep arrays focused and relevant (max 10 items each)
- For website_types, infer from context (e.g. if they mention Shopify → "e-commerce")

RESUME TEXT:
{raw_text}

Return ONLY the JSON object, no other text."""


async def ai_parse_resume(raw_text: str, db: AsyncSession) -> dict:
    prompt = PARSER_PROMPT.format(raw_text=raw_text[:6000])
    try:
        response = await query_with_fallback(prompt, db)
        cleaned = _extract_json(response)
        parsed = json.loads(cleaned)
        return _normalize(parsed)
    except Exception as e:
        raise ValueError(f"AI parsing failed: {e}")


def _extract_json(text: str) -> str:
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        return text[start:end + 1]
    return text


def _normalize(data: dict) -> dict:
    fields = {
        "name": str,
        "email": str,
        "phone": str,
        "portfolio_url": str,
        "social_links": dict,
        "skills": list,
        "experience_years": float,
        "education": str,
        "certifications": list,
        "languages": list,
        "industries": list,
        "pricing_min": float,
        "pricing_max": float,
        "website_types": list,
        "location": str,
        "timezone": str,
        "past_projects": str,
        "voice_tone": str,
        "availability": str,
        "additional_notes": str,
    }
    result = {}
    for key, typ in fields.items():
        val = data.get(key)
        if val is None:
            result[key] = "" if typ == str else [] if typ == list else {} if typ == dict else 0.0
        elif typ == float:
            try:
                result[key] = float(val) if val else 0.0
            except (ValueError, TypeError):
                result[key] = 0.0
        elif typ == str:
            result[key] = str(val) if val else ""
        elif typ == list:
            result[key] = val if isinstance(val, list) else []
        elif typ == dict:
            result[key] = val if isinstance(val, dict) else {}
        else:
            result[key] = val
    if not result["voice_tone"]:
        result["voice_tone"] = "professional"
    return result
