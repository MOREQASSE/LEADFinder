import re
from dataclasses import dataclass
from utils.ai_caller import call_ai

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}")


@dataclass
class LLMContact:
    email: str | None = None
    phone: str | None = None
    confidence: float = 0.6
    method: str = "llm"


async def extract_with_llm(text: str, author: str = "", company: str = "") -> list[LLMContact]:
    """
    Use LLM to extract contact info from obfuscated or tricky text.
    Only runs when all deterministic methods fail.
    """
    if not text or len(text.strip()) < 20:
        return []

    clean_text = text[:3000]

    prompt = f"""Find ALL email addresses and phone numbers in this text. Include obfuscated ones like:
- "john [at] company [dot] com"
- "john (at) company (dot) com"
- "john at company dot com"
- Split across lines: "john@\ncompany.com"
- Unicode substitution: "john@company.cοm" (Cyrillic o)

Text:
{clean_text}

Return ONLY a JSON array. Each item: {{"email": "...", "phone": "..."}}
If nothing found, return: []
No explanation. Start with [ and end with ]."""

    try:
        result = await call_ai(prompt, db=None, system_prompt="You are a contact info extraction bot. Extract emails and phones. Output JSON only.", max_tokens=500)
        if not result:
            return []

        contacts = []
        json_match = re.search(r"\[.*\]", result, re.DOTALL)
        if json_match:
            import json
            try:
                items = json.loads(json_match.group())
                for item in items:
                    email = item.get("email", "").strip() if isinstance(item, dict) else None
                    phone = item.get("phone", "").strip() if isinstance(item, dict) else None
                    if email and "@" in email:
                        contacts.append(LLMContact(email=email.lower(), confidence=0.6, method="llm"))
                    if phone and re.sub(r"\D", "", phone):
                        contacts.append(LLMContact(phone=phone, confidence=0.4, method="llm"))
            except json.JSONDecodeError:
                pass

        if not contacts:
            for email in EMAIL_RE.findall(result):
                contacts.append(LLMContact(email=email.lower(), confidence=0.6, method="llm"))
            for phone in PHONE_RE.findall(result):
                contacts.append(LLMContact(phone=phone.strip(), confidence=0.4, method="llm"))

        return contacts

    except Exception:
        return []
