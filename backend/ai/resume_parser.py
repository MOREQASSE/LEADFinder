import re

_RTL_MARKS = re.compile(r"[\u200e\u200f\u202a-\u202e\u061c\u2066-\u2069]")
_AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
_FA_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
_AR_SCRIPT = re.compile(r"[\u0600-\u06FF]")
_MULTISPACE = re.compile(r"\s+")

_EN_HINTS = (
    "experience", "skills", "projects", "available", "years of", "i am", "my name",
    "education", "summary", "objective", "about me", "degree", "achievements",
    "languages", "phone", "reference",
)
_FR_HINTS = (
    "expérience", "compétences", "projets", "disponible", "ans d'", "je suis",
    "mon nom", "formation", "études", "à propos", "parcours", "diplôme",
    "réalisations", "langues", "téléphone", "missions", "entreprises",
)


async def parse_resume(raw_text: str, db=None) -> dict:
    if db is not None:
        try:
            from ai.ai_resume_parser import ai_parse_resume
            return await ai_parse_resume(raw_text, db)
        except Exception:
            pass
    return _regex_parse_resume(raw_text)


def _normalize_text(raw_text: str) -> str:
    text = _RTL_MARKS.sub("", raw_text)
    text = text.replace("’", "'").replace("‘", "'")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return text.translate(_AR_DIGITS).translate(_FA_DIGITS)


def _clean_value(value: str, max_len: int = 160) -> str:
    value = str(value or "")
    value = _MULTISPACE.sub(" ", value)
    value = value.strip(" \t\r\n•·∙◦-–—:;|,،؛()[]{}.…")
    if len(value) > max_len:
        value = value[:max_len].rstrip(" \t,،؛-–—.")
    return value


def _dedupe(items) -> list:
    seen = set()
    out = []
    for item in items:
        key = str(item).lower()
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def _detect_language(text: str) -> str:
    if _AR_SCRIPT.search(text):
        return "ar"
    fr = sum(text.count(h) for h in _FR_HINTS)
    en = sum(text.count(h) for h in _EN_HINTS)
    return "fr" if fr > en else "en"


_CUT_RE = re.compile(
    r"(?i)\b(?:tone|voice\s*tone|languages?|education|experience|availability|rate|"
    r"price|pricing|tarif|prix|skills?|summary|objective|certifications?|projects?|"
    r"portfolio|email|phone|location|مدينة|اللغات|التعليم|الخبرة|السعر|المهارات|التوفر|"
    r"الشهادات)\s*[:–]"
    r"|\bstyle\s+(?:amical|convivial|sympathique|professionnel|décontracté|sérieux|créatif)"
    r"|\bأسلوب\s+(?:ودود|مريح|بسيط|تقني|مباشر)"
)


def _extract_labeled(text: str, labels, lines: int = 1) -> str:
    pattern = "|".join(re.escape(label) for label in labels)
    m = re.search(rf"(?im)^\s*(?:{pattern})\s*[:=\-–—]?\s*(.*)$", text)
    if not m:
        m = re.search(rf"(?i)(?<![a-z0-9:؛،])(?:{pattern})\s*[:=\-–—]\s*([^\n]+)", text)
    if not m:
        return ""
    value = _CUT_RE.split(m.group(1))[0]
    if lines > 1:
        extra = []
        for line in text[m.end():].split("\n")[: lines - 1]:
            if not line.strip():
                break
            extra.append(line.strip())
        if extra:
            value += " " + " ".join(extra)
    return _clean_value(value, max_len=300 if lines > 1 else 160)


def _extract_inline(text: str, phrases, capture: str = r"([^\n]{2,60})") -> str:
    pattern = "|".join(re.escape(p) for p in phrases)
    m = re.search(rf"(?i)(?:{pattern})\s*[:,\-–—]?\s*{capture}", text)
    return _clean_value(m.group(1)) if m else ""


_STOP_LABELS = [
    "name", "email", "phone", "contact", "address", "location", "city", "portfolio",
    "linkedin", "github", "education", "degree", "skills", "languages", "certifications",
    "training", "trainings", "availability", "price", "pricing", "rate", "summary",
    "objective", "about me", "experience", "projects", "references", "tools", "timezone",
    "awards", "interests", "hobbies", "social",
    "nom", "prénom", "téléphone", "adresse", "ville", "compétences", "formations",
    "langues", "expérience", "projets", "réalisations", "disponibilité", "profil",
    "centres", "loisirs",
    "الاسم", "البريد", "الهاتف", "المدينة", "الموقع", "المهارات", "الخبرة", "المشاريع",
    "التعليم", "اللغات", "الشهادات", "التدريب", "التوفر", "السعر", "نبذة", "عن نفسي",
    "أعمالي", "إنجازات", "هوايات", "الاهتمامات",
]

_STOP_RE = None


def _is_section_line(line: str) -> bool:
    global _STOP_RE
    if _STOP_RE is None:
        _STOP_RE = re.compile(
            r"(?i)^\s*(?:" + "|".join(re.escape(s) for s in _STOP_LABELS) + r")\s*[:=\-–—]?"
        )
    return bool(_STOP_RE.match(line))


def _extract_section(text: str, labels, max_lines: int = 8) -> str:
    for raw in _iter_sections(text, labels, max_lines):
        return raw
    pattern = "|".join(re.escape(label) for label in labels)
    m = re.search(rf"(?i)(?<![a-z0-9:؛،])(?:{pattern})\s*[:=\-–—]\s*([^\n]+)", text)
    return m.group(1) if m else ""


def _iter_sections(text: str, labels, max_lines: int = 8):
    pattern = "|".join(re.escape(label) for label in labels)
    for m in re.finditer(rf"(?im)^\s*(?:{pattern})\s*[:=\-–—]?\s*(.*)$", text):
        parts = [m.group(1)]
        for line in text[m.end():].split("\n"):
            if not line.strip():
                continue
            if _is_section_line(line):
                break
            parts.append(line.strip())
            if len(parts) >= max_lines:
                break
        yield "\n".join(parts)


def _price_from_number(n_str: str):
    if not re.fullmatch(r"\d{1,6}(?:\.\d{1,2})?", n_str):
        return None
    if re.fullmatch(r"(?:19|20)\d{2}", n_str):
        return None
    n = float(n_str)
    if n >= 1_000_000:
        return None
    return n


def _regex_parse_resume(raw_text: str) -> dict:
    text = _normalize_text(raw_text)
    lower = text.lower()

    email = _extract_email(text)
    name = _extract_name(text, lower, email)
    phone = _extract_phone(text)
    portfolio_url, social_links = _extract_urls(text)
    pricing_min, pricing_max, currency, price_base = _extract_pricing(text)
    skills = _extract_skills(lower)
    industries = _extract_industries(lower)
    website_types = _extract_website_types(lower)
    location = _extract_location(text)
    timezone = _extract_timezone(text, lower)
    education = _extract_education(text)
    certifications = _extract_certifications(text)
    languages = _extract_languages(lower)
    past_projects = _extract_past_projects(text)
    voice_tone = _extract_tone(lower)
    availability = _extract_availability(lower)

    notes = []
    about = _extract_labeled(text, _ABOUT_LABELS, lines=2)
    if about:
        notes.append(about)
    if pricing_min or pricing_max:
        note = f"Pricing: {_fmt(pricing_min)}-{_fmt(pricing_max)}"
        if currency:
            note += f" {currency}"
        if price_base:
            note += f" ({price_base})"
        notes.append(note)

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "portfolio_url": portfolio_url,
        "social_links": social_links,
        "skills": skills,
        "experience_years": _extract_experience(lower),
        "education": education,
        "certifications": certifications,
        "languages": languages,
        "industries": industries,
        "pricing_min": pricing_min,
        "pricing_max": pricing_max,
        "website_types": website_types,
        "location": location,
        "timezone": timezone,
        "past_projects": past_projects,
        "voice_tone": voice_tone,
        "availability": availability,
        "additional_notes": " | ".join(notes),
    }


def _fmt(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else str(value)


# ---------------------------------------------------------------------------
# name
# ---------------------------------------------------------------------------

_NAME_LABELS = [
    "nom et prénom", "prénom et nom", "nom complet", "full name", "الاسم الكامل",
    "الاسم الثلاثي",
]

_NAME_FIRST_LABELS = [
    "prénom", "first name", "الاسم الشخصي", "الاسم الأول", "الاسم", "name", "اسمي",
]

_NAME_LAST_LABELS = [
    "nom", "last name", "surname", "family name", "اللقب", "اسم العائلة",
    "الاسم الأخير", "الاسم العائلي",
]

_NAME_INLINE = ["my name is", "je m'appelle", "اسمي"]

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_GENERIC_LOCAL = re.compile(
    r"^(info|contact|hello|admin|support|sales|team|noreply|no\.reply|test|example|user|mail)@", re.I
)
_SKIP_EMAIL_EXT = re.compile(r"\.(png|jpe?g|gif|pdf|docx?|txt|zip)$", re.I)


def _valid_name(value: str) -> bool:
    if not value or len(value) > 45:
        return False
    if ":" in value or "@" in value or value.startswith("http"):
        return False
    return True


def _extract_name(text: str, lower: str, email: str) -> str:
    value = _extract_labeled(text, _NAME_LABELS)
    if _valid_name(value):
        return _clean_value(value, max_len=45)

    first = _extract_labeled(text, _NAME_FIRST_LABELS)
    last = _extract_labeled(text, _NAME_LAST_LABELS)
    if _valid_name(first) and _valid_name(last):
        if first.lower() != last.lower():
            return _clean_value(f"{first} {last}", max_len=45)
        return first
    if _valid_name(first):
        return first
    if _valid_name(last):
        return last

    value = _extract_inline(text, _NAME_INLINE, capture=r"([^.\n]{2,40})")
    if _valid_name(value):
        return value
    if email:
        return _name_from_email(email)
    return ""


def _name_from_email(email: str) -> str:
    local = email.split("@")[0]
    local = re.sub(r"[0-9._+\-]+", " ", local).strip()
    parts = [p.capitalize() for p in re.split(r"\s+", local) if p]
    if not parts:
        return ""
    return " ".join(parts)


def _extract_email(text: str) -> str:
    candidates = _EMAIL_RE.findall(text)
    fallback = ""
    for cand in candidates:
        if _SKIP_EMAIL_EXT.search(cand):
            continue
        if re.search(r"@(example|test|domain|email)\.com$", cand, re.I):
            continue
        if _GENERIC_LOCAL.search(cand):
            fallback = fallback or cand
            continue
        return cand
    return fallback


# ---------------------------------------------------------------------------
# phone
# ---------------------------------------------------------------------------

_PHONE_LABELS = [
    "tel", "tél", "téléphone", "phone", "mobile", "whatsapp", "cellular",
    "هاتف", "جوال", "موبايل", "تليفون", "رقم الهاتف", "رقم الجوال",
]

_DATE_RE = re.compile(r"(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}")
_YEAR_RANGE_RE = re.compile(r"^(?:19|20)\d{2}(?:19|20)\d{2}$")


def _extract_phone(text: str) -> str:
    value = _extract_labeled(text, _PHONE_LABELS)
    if value:
        m = re.search(r"\+?\d[\d\s().\-]{4,}\d", value)
        if m:
            return _clean_phone(m.group(0))
    for m in re.finditer(r"\+?\d[\d\s().\-]{5,}\d", text):
        raw = m.group(0)
        if _DATE_RE.search(raw):
            continue
        cleaned = _clean_phone(raw)
        if cleaned:
            return cleaned
    return ""


def _clean_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw)
    if _YEAR_RANGE_RE.fullmatch(digits):
        return ""
    if not 8 <= len(digits) <= 15:
        return ""
    if raw.startswith("+"):
        result = "+" + digits
    else:
        result = digits
    if result.startswith("+2120") and len(result) == 14:
        result = "+212" + result[5:]
    return result


# ---------------------------------------------------------------------------
# urls (portfolio + social links)
# ---------------------------------------------------------------------------

_URL_RE = re.compile(r"https?://[^\s<>\"'()\[\]]+|www\.[^\s<>\"'()\[\]]+")
_BARE_TLDS = {
    "com", "net", "org", "io", "dev", "app", "design", "agency", "store", "site",
    "online", "tech", "ma", "fr", "ca", "us", "uk", "eu", "de", "es", "it", "pt",
    "be", "ch", "nl", "se", "no", "dk", "at", "pl", "ae", "sa", "qa", "kw", "eg",
    "tn", "dz", "co", "me", "biz", "info", "pro", "live", "xyz", "club", "ai",
}
_BARE_URL_RE = re.compile(
    r"(?<![\w@.])(?:[a-z0-9](?:[a-z0-9\-]{0,40}[a-z0-9])?\.)+(?:"
    + "|".join(re.escape(t) for t in sorted(_BARE_TLDS, key=len, reverse=True))
    + r")(?:/[^\s<>\"'()\[\]]*)?",
    re.I,
)
_SOCIAL_DOMAINS = {
    "linkedin.com", "lnkd.in", "github.com", "gitlab.com", "twitter.com", "x.com",
    "facebook.com", "instagram.com", "tiktok.com", "youtube.com", "wa.me",
    "whatsapp.com", "t.me", "telegram.me",
}
_SOCIAL_LABELS = ["linkedin", "github", "gitlab", "twitter", "behance", "dribbble"]
_URL_LABELS = [
    "portfolio", "website", "site web", "site internet", "web site", "personal site",
    "url", "معرض الأعمال", "البورتفوليو", "الموقع الإلكتروني", "الموقع الالكتروني",
    "lien",
]


def _clean_url(url: str) -> str:
    url = url.rstrip(".,;:،)])'\"")
    if url.startswith("www."):
        url = "https://" + url
    return url


def _classify_social(url: str) -> str:
    u = url.lower()
    if "linkedin.com" in u or "lnkd.in" in u:
        return "linkedin"
    if "github.com" in u:
        return "github"
    if "twitter.com" in u or "x.com" in u:
        return "twitter"
    return ""


def _extract_urls(text: str) -> tuple:
    all_urls = [_clean_url(u) for u in _URL_RE.findall(text)]
    all_urls += [_clean_url(u) for u in _BARE_URL_RE.findall(text)]
    all_urls = _dedupe(all_urls)

    social = {"github": "", "linkedin": "", "twitter": "", "other": []}
    others = []
    portfolio = ""
    for url in all_urls:
        kind = _classify_social(url)
        if kind:
            if not social[kind]:
                social[kind] = url
        else:
            others.append(url)
            if not portfolio:
                portfolio = url

    labeled = _extract_labeled(text, _URL_LABELS)
    if labeled:
        m = _URL_RE.search(labeled) or _BARE_URL_RE.search(labeled)
        if m:
            labeled_url = _clean_url(m.group(0))
            kind = _classify_social(labeled_url)
            if kind:
                if not social[kind]:
                    social[kind] = labeled_url
            else:
                portfolio = labeled_url

    for label in _SOCIAL_LABELS:
        m = re.search(rf"(?im)^\s*{re.escape(label)}\s*:?\s*(\S+)$", text)
        if not m:
            continue
        raw = m.group(1).strip(".,;:،")
        lowered = raw.lower()
        if lowered.startswith("http"):
            url = _clean_url(raw)
        elif re.fullmatch(r"[a-z0-9\-]+(?:\.[a-z0-9\-]+)+(?:/\S*)?", lowered):
            url = _clean_url("https://" + raw)
        elif not re.search(r"\s", raw):
            url = f"https://{label}.com/{raw.lstrip('@')}"
        else:
            continue
        kind = _classify_social(url) or "other"
        if kind in ("linkedin", "github", "twitter"):
            if not social[kind]:
                social[kind] = url
        else:
            others.append(url)

    if portfolio:
        others = [u for u in others if u != portfolio]
    social["other"] = _dedupe(others)[:3]
    return portfolio, social


# ---------------------------------------------------------------------------
# location & timezone
# ---------------------------------------------------------------------------

_LOC_LABELS = [
    "location", "city", "based in", "living in", "residence", "address",
    "ville", "localisation", "lieu", "adresse",
    "المدينة", "مكان الإقامة", "أقيم في", "مقيم في", "العنوان",
]

_LOC_INLINE = ["based in", "living in", "أقيم في", "مقيم في", "أسكن في"]

_CITY_MAP = {
    "casablanca": "Casablanca, Morocco", "الدار البيضاء": "Casablanca, Morocco",
    "rabat": "Rabat, Morocco", "الرباط": "Rabat, Morocco",
    "marrakech": "Marrakech, Morocco", "مراكش": "Marrakech, Morocco",
    "fes": "Fes, Morocco", "فاس": "Fes, Morocco",
    "tanger": "Tangier, Morocco", "طنجة": "Tangier, Morocco",
    "agadir": "Agadir, Morocco", "أكادير": "Agadir, Morocco",
    "oujda": "Oujda, Morocco", "وجدة": "Oujda, Morocco",
    "kenitra": "Kenitra, Morocco", "القنيطرة": "Kenitra, Morocco",
    "tetouan": "Tetouan, Morocco", "تطوان": "Tetouan, Morocco",
    "meknes": "Meknes, Morocco", "مكناس": "Meknes, Morocco",
    "nador": "Nador, Morocco", "الناظور": "Nador, Morocco",
    "el jadida": "El Jadida, Morocco", "الجديدة": "El Jadida, Morocco",
    "safi": "Safi, Morocco", "آسفي": "Safi, Morocco",
    "essaouira": "Essaouira, Morocco", "الصويرة": "Essaouira, Morocco",
    "sale": "Sale, Morocco", "salé": "Sale, Morocco", "سلا": "Sale, Morocco",
    "temara": "Temara, Morocco", "تمارة": "Temara, Morocco",
    "mohammedia": "Mohammedia, Morocco", "المحمدية": "Mohammedia, Morocco",
    "berrechid": "Berrechid, Morocco", "برشيد": "Berrechid, Morocco",
    "beni mellal": "Beni Mellal, Morocco", "بني ملال": "Beni Mellal, Morocco",
    "khouribga": "Khouribga, Morocco", "خريبكة": "Khouribga, Morocco",
    "laayoune": "Laayoune, Morocco", "العيون": "Laayoune, Morocco",
    "dakhla": "Dakhla, Morocco", "الداخلة": "Dakhla, Morocco",
    "settat": "Settat, Morocco", "taza": "Taza, Morocco",
    "larache": "Larache, Morocco", "al hoceima": "Al Hoceima, Morocco",
    "guelmim": "Guelmim, Morocco", "tiznit": "Tiznit, Morocco",
    "paris": "Paris, France", "lyon": "Lyon, France", "marseille": "Marseille, France",
    "toulouse": "Toulouse, France", "bordeaux": "Bordeaux, France", "lille": "Lille, France",
    "nice": "Nice, France", "nantes": "Nantes, France", "strasbourg": "Strasbourg, France",
    "montpellier": "Montpellier, France", "grenoble": "Grenoble, France",
    "bruxelles": "Brussels, Belgium", "geneva": "Geneva, Switzerland", "genève": "Geneva, Switzerland",
    "zurich": "Zurich, Switzerland", "lausanne": "Lausanne, Switzerland",
    "montreal": "Montreal, Canada", "montréal": "Montreal, Canada", "toronto": "Toronto, Canada",
    "dubai": "Dubai, UAE", "abu dhabi": "Abu Dhabi, UAE",
    "doha": "Doha, Qatar", "riyadh": "Riyadh, Saudi Arabia", "jeddah": "Jeddah, Saudi Arabia",
    "kuwait": "Kuwait City, Kuwait", "cairo": "Cairo, Egypt",
    "tunis": "Tunis, Tunisia", "algiers": "Algiers, Algeria",
    "london": "London, UK", "new york": "New York, USA", "los angeles": "Los Angeles, USA",
    "san francisco": "San Francisco, USA", "chicago": "Chicago, USA",
    "berlin": "Berlin, Germany", "munich": "Munich, Germany",
    "madrid": "Madrid, Spain", "barcelona": "Barcelona, Spain",
    "amsterdam": "Amsterdam, Netherlands", "istanbul": "Istanbul, Turkey",
    "stockholm": "Stockholm, Sweden", "oslo": "Oslo, Norway",
    "copenhagen": "Copenhagen, Denmark", "lisbon": "Lisbon, Portugal",
    "milan": "Milan, Italy", "rome": "Rome, Italy",
}

_COUNTRY_KEYWORDS = {
    "Morocco": ["morocco", "maroc", "المغرب", "المملكة المغربية"],
    "France": ["france", "فرنسا"],
    "USA": ["united states", "u.s.a", "usa", "america", "الولايات المتحدة", "أمريكا"],
    "Canada": ["canada", "كندا"],
    "Belgium": ["belgium", "belgique", "بلجيكا"],
    "Switzerland": ["switzerland", "suisse", "سويسرا"],
    "UAE": ["uae", "emirates", "الإمارات", "الإمارات العربية المتحدة"],
    "Qatar": ["qatar", "قطر"],
    "Saudi Arabia": ["saudi arabia", "saudi", "السعودية", "المملكة العربية السعودية"],
    "Kuwait": ["kuwait", "الكويت"],
    "Egypt": ["egypt", "مصر"],
    "Tunisia": ["tunisia", "tunisie", "تونس"],
    "Algeria": ["algeria", "algérie", "الجزائر"],
    "Spain": ["spain", "espagne", "إسبانيا"],
    "Germany": ["germany", "allemagne", "ألمانيا"],
    "UK": ["united kingdom", "england", "britain", "المملكة المتحدة", "إنجلترا", "بريطانيا"],
    "Italy": ["italy", "italie", "إيطاليا"],
    "Netherlands": ["netherlands", "holland", "pays-bas", "هولندا"],
    "Turkey": ["turkey", "turquie", "تركيا"],
    "Portugal": ["portugal", "البرتغال"],
    "Sweden": ["sweden", "suède", "السويد"],
    "Norway": ["norway", "norvège", "النرويج"],
    "Denmark": ["denmark", "danemark", "الدنمارك"],
    "Austria": ["austria", "autriche", "النمسا"],
    "Poland": ["poland", "pologne", "بولندا"],
    "Senegal": ["senegal", "sénégal", "السنغال"],
    "Ivory Coast": ["côte d'ivoire", "cote d'ivoire", "ساحل العاج"],
}


def _extract_location(text: str) -> str:
    value = _extract_labeled(text, _LOC_LABELS)
    if not value:
        value = _extract_inline(text, _LOC_INLINE)
    if value:
        cleaned = _clean_value(value, max_len=60)
        lower = cleaned.lower()
        for city, display in _CITY_MAP.items():
            if re.search(rf"(?<![a-z0-9]){re.escape(city)}(?![a-z0-9])", lower):
                return display
        return cleaned

    lower = text.lower()
    for city, display in _CITY_MAP.items():
        if re.search(rf"(?<![a-z0-9]){re.escape(city)}(?![a-z0-9])", lower):
            return display
    for country, keywords in _COUNTRY_KEYWORDS.items():
        for kw in keywords:
            if re.search(rf"(?<![a-z0-9]){re.escape(kw)}(?![a-z0-9])", lower):
                return country
    return ""


_TZ_LABELS = ["timezone", "time zone", "fuseau horaire", "المنطقة الزمنية", "التوقيت"]
_TZ_RE = re.compile(
    r"\b(?:UTC|GMT|CET|CEST|EET|WET|EST|PST|IST|JST)\s*[+-]?\s*\d{0,2}(?::\d{2})?"
    r"|\bAfrica/\w+|\bEurope/\w+",
    re.I,
)


def _extract_timezone(text: str, lower: str) -> str:
    value = _extract_labeled(text, _TZ_LABELS)
    if value:
        value = value.replace("غرينتش", "GMT")
        m = _TZ_RE.search(value)
        if m:
            return _clean_value(m.group(0), max_len=30)
        return _clean_value(value, max_len=30)
    m = _TZ_RE.search(text)
    return _clean_value(m.group(0), max_len=30) if m else ""


# ---------------------------------------------------------------------------
# pricing
# ---------------------------------------------------------------------------

_PRICE_LABELS = [
    "price", "rate", "pricing", "cost", "prix", "tarif", "budget", "honoraire",
    "السعر", "التكلفة", "الأجرة", "التسعيرة",
]

_CURRENCY_TOKENS = (
    "dhs", "dh", "mad", "dirhams", "dirham", "درهم", "د.م",
    "usd", "dollars", "dollar", "دولارات", "دولار", "$",
    "euros", "euro", "eur", "€",
    "pounds", "pound", "gbp", "£",
    "sar", "ريال", "ر.س", "aed", "qar", "kwd", "tnd", "egp", "dzd", "دج", "ج.م",
)

_CURRENCY_LOOKUP = {
    "dhs": "MAD", "dh": "MAD", "mad": "MAD", "dirham": "MAD", "dirhams": "MAD",
    "درهم": "MAD", "د.م": "MAD",
    "usd": "USD", "dollar": "USD", "dollars": "USD", "دولار": "USD", "دولارات": "USD", "$": "USD",
    "eur": "EUR", "euro": "EUR", "euros": "EUR", "€": "EUR",
    "gbp": "GBP", "pound": "GBP", "pounds": "GBP", "£": "GBP",
    "sar": "SAR", "ريال": "SAR", "ر.س": "SAR",
    "aed": "AED", "qar": "QAR", "kwd": "KWD", "tnd": "TND", "egp": "EGP",
    "dzd": "DZD", "دج": "DZD", "ج.م": "EGP",
}

_CURRENCY_RE = re.compile(
    "(?i)(?:" + "|".join(re.escape(t) for t in _CURRENCY_TOKENS) + ")"
)

_PRICE_BASE_RULES = [
    (r"per\s+hour\b|hourly|par\s+heure\b|à\s+l'heure|بالساعة|في\s+الساعة|لل\s?ساعة", "per hour"),
    (r"per\s+word\b|par\s+mot\b|لكل\s+كلمة|للكلمة", "per word"),
    (r"per\s+page\b|par\s+page\b|لكل\s+صفحة|للصفحة", "per page"),
    (r"per\s+project\b|par\s+projet\b|لكل\s+مشروع|بالمشروع", "per project"),
    (r"per\s+month\b|par\s+mois\b|شهرياً|شهريا|بالشهر|في\s+الشهر", "per month"),
]


def _extract_pricing(text: str) -> tuple:
    values = []
    currency = ""
    currency_hits = []

    def _currency_of(line: str) -> str:
        m = _CURRENCY_RE.search(line)
        if m:
            return _CURRENCY_LOOKUP.get(m.group(0).lower(), "")
        return ""

    price_line = _extract_labeled(text, _PRICE_LABELS)
    if price_line:
        for n in re.findall(r"\d{1,6}(?:\.\d{1,2})?", price_line):
            v = _price_from_number(n)
            if v is not None:
                values.append(v)
        currency = _currency_of(price_line) or currency

    range_re = re.compile(
        r"(\d{1,6})\s*[-–—]\s*(\d{1,6})\s*(?:"
        + "|".join(re.escape(t) for t in _CURRENCY_TOKENS)
        + r")"
    )
    for m in range_re.finditer(text):
        a, b = _price_from_number(m.group(1)), _price_from_number(m.group(2))
        if a is not None and b is not None:
            values.extend((a, b))
            currency = _currency_of(m.group(0)) or currency

    cur_first_range = re.compile(
        r"(?:"
        + "|".join(re.escape(t) for t in _CURRENCY_TOKENS)
        + r")\s*(\d{1,6})\s*[-–—]\s*(\d{1,6})"
    )
    for m in cur_first_range.finditer(text):
        a, b = _price_from_number(m.group(1)), _price_from_number(m.group(2))
        if a is not None and b is not None:
            values.extend((a, b))
            currency = _currency_of(m.group(0)) or currency

    word_range_re = re.compile(
        r"(?i)(?:from|between|entre|من|بين)\s+(\d{1,6})\s*(?:to|et|à|إلى|و)\s+(\d{1,6})"
        r"(?!\s*(?:years?|ans|سنوات|سنة))"
    )
    for m in word_range_re.finditer(text):
        a, b = _price_from_number(m.group(1)), _price_from_number(m.group(2))
        if a is not None and b is not None:
            values.extend((a, b))
            currency = _currency_of(m.group(0)) or currency

    for m in re.finditer(r"(?i)(?:"
                         + "|".join(re.escape(t) for t in _CURRENCY_TOKENS)
                         + r")\s*(\d{1,6}(?:\.\d{1,2})?)", text):
        v = _price_from_number(m.group(1))
        if v is not None:
            values.append(v)
            token = _CURRENCY_RE.search(m.group(0))
            if token:
                currency = _CURRENCY_LOOKUP.get(token.group(0).lower(), "") or currency

    for m in re.finditer(r"(?i)(\d{1,6}(?:\.\d{1,2})?)\s*("
                         + "|".join(re.escape(t) for t in _CURRENCY_TOKENS)
                         + r")\b", text):
        v = _price_from_number(m.group(1))
        if v is not None:
            values.append(v)
            currency = _CURRENCY_LOOKUP.get(m.group(2).lower(), "") or currency

    values = _dedupe([v for v in values if v is not None])
    if not values:
        return 0.0, 0.0, "", ""

    price_base = ""
    for pattern, label in _PRICE_BASE_RULES:
        if re.search(pattern, text):
            price_base = label
            break

    return min(values), max(values), currency, price_base


# ---------------------------------------------------------------------------
# experience
# ---------------------------------------------------------------------------

_EXP_RANGE_RE = re.compile(
    r"(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(?:years?|ans|سنوات|سنة)"
    r"\s*(?:of\s*|من\s*)?(?:experience|exp\b|d'expérience|خبرة|تجربة|الخبرة)"
)
_EXP_MORE_RE = re.compile(r"(?:more\s+than|plus\s+de|أكثر\s+من)\s*(\d{1,2})\s*(?:years?|ans|سنوات|سنة)")
_EXP_UNIT_FIRST_RE = re.compile(
    r"(\d{1,2})\s*(?:years?|ans|سنوات|سنة)\s*(?:of\s*|من\s*)?(?:experience|exp\b|d'expérience|خبرة|تجربة|الخبرة)"
)
_EXP_LABEL_FIRST_RE = re.compile(
    r"(?:experience|expérience|خبرة|تجربة|الخبرة)\s*:?\s*(\d{1,2})\s*(?:years?|ans|سنوات|سنة)?"
)
_EXP_PLUS_RE = re.compile(r"(\d{1,2})\s*\+?\s*years?\b")


def _extract_experience(text: str) -> float:
    m = _EXP_RANGE_RE.search(text)
    if m:
        return min(40.0, round((float(m.group(1)) + float(m.group(2))) / 2, 1))
    for regex in (_EXP_MORE_RE, _EXP_UNIT_FIRST_RE, _EXP_LABEL_FIRST_RE, _EXP_PLUS_RE):
        m = regex.search(text)
        if m:
            return min(40.0, float(m.group(1)))
    return 0.0


# ---------------------------------------------------------------------------
# skills
# ---------------------------------------------------------------------------

_SKILLS = [
    (r"\bhtml5?\b", "HTML"),
    (r"\bcss3?\b", "CSS"),
    (r"\bjavascript\b|(?<!\.)\bjs\b", "JavaScript"),
    (r"\btypescript\b|(?<!\.)\bts\b", "TypeScript"),
    (r"\bpython\b", "Python"),
    (r"\breact\s+native\b", "React Native"),
    (r"\breact\b(?!\s+native)", "React"),
    (r"\bvue(?:\.js)?\b", "Vue"),
    (r"\bangular(?:\.js)?\b", "Angular"),
    (r"\bnode(?:\.js)?\b", "Node.js"),
    (r"\bnext(?:\.js|js)\b", "Next.js"),
    (r"\bnuxt(?:\.js)?\b", "Nuxt"),
    (r"\bexpress(?:\.js)?\b", "Express"),
    (r"\bnest(?:\.js)?\b", "NestJS"),
    (r"\bphp\b", "PHP"),
    (r"\blaravel\b", "Laravel"),
    (r"\bsymfony\b", "Symfony"),
    (r"\bdjango\b", "Django"),
    (r"\bflask\b", "Flask"),
    (r"\bfastapi\b|\bfast\s+api\b", "FastAPI"),
    (r"\brails\b", "Rails"),
    (r"\bruby\b", "Ruby"),
    (r"\bgolang\b|\bgo\s+lang\b", "Go"),
    (r"\brust\b", "Rust"),
    (r"\bjava\b", "Java"),
    (r"\bkotlin\b", "Kotlin"),
    (r"\bswift\b", "Swift"),
    (r"\bflutter\b", "Flutter"),
    (r"\bc#\b", "C#"),
    (r"(?<![.\w])\.net\b", ".NET"),
    (r"\bc\+\+\b", "C++"),
    (r"\bsql\b", "SQL"),
    (r"\bmysql\b", "MySQL"),
    (r"\bpostgres(?:ql)?\b", "PostgreSQL"),
    (r"\bmongodb\b|\bmongo\b", "MongoDB"),
    (r"\bfirebase\b", "Firebase"),
    (r"\bredis\b", "Redis"),
    (r"\baws\b", "AWS"),
    (r"\bazure\b", "Azure"),
    (r"\bgcp\b|\bgoogle\s+cloud\b", "GCP"),
    (r"\bdocker\b", "Docker"),
    (r"\bkubernetes\b|\bk8s\b", "Kubernetes"),
    (r"\bgit\b", "Git"),
    (r"\bgithub\b", "GitHub"),
    (r"\bgitlab\b", "GitLab"),
    (r"\brest(?:ful)?\b", "REST APIs"),
    (r"\bgraphql\b", "GraphQL"),
    (r"\bsass\b|\bscss\b", "Sass"),
    (r"\btailwind(?:css)?\b", "Tailwind"),
    (r"\bbootstrap\b", "Bootstrap"),
    (r"\bjquery\b", "jQuery"),
    (r"\bwordpress\b", "WordPress"),
    (r"\bshopify\b", "Shopify"),
    (r"\bwoocommerce\b", "WooCommerce"),
    (r"\bprestashop\b", "PrestaShop"),
    (r"\bmagento\b", "Magento"),
    (r"\bdrupal\b", "Drupal"),
    (r"\bseo\b", "SEO"),
    (r"\bui\s*/?\s*ux\b|\bux\b|\buiux\b", "UI/UX"),
    (r"\bfigma\b", "Figma"),
    (r"\bphotoshop\b", "Photoshop"),
    (r"\billustrator\b", "Illustrator"),
    (r"\bblender\b", "Blender"),
    (r"\bthree\.js\b", "Three.js"),
    (r"\bunity\b", "Unity"),
    (r"\bunreal\b", "Unreal Engine"),
    (r"\bmachine\s+learning\b|\bml\b", "Machine Learning"),
    (r"\bartificial\s+intelligence\b|\bgenai\b", "AI"),
    (r"\bdata\s+analysis\b|\bdata\s+science\b|\banalytics\b", "Data Analysis"),
    (r"\bexcel\b", "Excel"),
    (r"\bpowerpoint\b|\bppt\b", "PowerPoint"),
    (r"\bgoogle\s+sheets\b", "Google Sheets"),
    (r"\bagile\b|\bscrum\b", "Agile/Scrum"),
    (r"\bjira\b", "Jira"),
    (r"\btrello\b", "Trello"),
    (r"\bnotion\b", "Notion"),
    (r"\bcanva\b", "Canva"),
    (r"\bpremiere?\s+pro\b", "Premiere Pro"),
    (r"\bafter\s+effects\b", "After Effects"),
    (r"\bcapcut\b", "CapCut"),
    (r"\bemail\s+marketing\b", "Email Marketing"),
    (r"\bsocial\s+media\b|\bsocial\s+network", "Social Media"),
    (r"\bcopywriting\b|\bcopy\s+writer\b", "Copywriting"),
    (r"e-commerce|ecommerce", "E-commerce"),
    (r"développe\w*\s+web|développement\s+web|developpement\s+web|full[- ]stack", "Full Stack"),
    (r"développe\w*\s+mobile|développement\s+mobile|تطوير\s+تطبيقات|مطور\s+تطبيقات", "Mobile Development"),
    (r"conception\s+graphique|design\s+graphique|graphiste|تصميم\s+جرافيك|مصمم\s+جرافيك", "Graphic Design"),
    (r"\bتصميم\b", "Design"),
    (r"\bdesign(?:er)?\b", "Design"),
    (r"marketing\s+digital|marketing\s+numérique|تسويق\s+رقمي|التسويق\s+الرقمي|تسويق\s+إلكتروني", "Digital Marketing"),
    (r"référencement|تحسين\s+محركات\s+البحث|سيو", "SEO"),
    (r"rédaction\s+web|rédaction\s+de\s+contenu|contenu\s+web|كتابة\s+المحتوى|كتابة\s+محتوى", "Content Writing"),
    (r"gestion\s+de\s+projet|chef\s+de\s+projet|إدارة\s+المشاريع|إدارة\s+مشاريع|مدير\s+مشاريع", "Project Management"),
    (r"photographie|تصوير|مصور", "Photography"),
    (r"montage\s+vidéo|montage\s+video|مونتاج", "Video Editing"),
    (r"motion\s+design", "Motion Design"),
    (r"community\s+management", "Community Management"),
    (r"réseaux\s+sociaux|إدارة\s+وسائل\s+التواصل|سوشيال\s+ميديا|التسويق\s+عبر\s+وسائل", "Social Media"),
    (r"relation\s+client|service\s+client|خدمة\s+العملاء|خدمة\s+عملاء", "Customer Service"),
    (r"support\s+technique|دعم\s+فني", "Technical Support"),
    (r"إدارة\s+إعلانات|حملات\s+إعلانية|إعلانات\s+ممولة", "Ads Management"),
    (r"\bcommunication\b|التواصل(?!\s+الاجتماعي)", "Communication"),
    (r"team\s+player|teamwork|travail\s+d'équipe|travail\s+en\s+équipe|esprit\s+d'équipe|العمل\s+الجماعي|روح\s+الفريق|عمل\s+جماعي", "Teamwork"),
    (r"\bleadership\b|القيادة", "Leadership"),
    (r"problem\s+solving|résolution\s+de\s+problèmes|حل\s+المشاكل|حل\s+المشكلات", "Problem Solving"),
    (r"time\s+management|gestion\s+du\s+temps|إدارة\s+الوقت", "Time Management"),
    (r"\bcreativity\b|créativité|الإبداع", "Creativity"),
    (r"\badaptability\b|adaptabilité|التكيف", "Adaptability"),
    (r"attention\s+to\s+detail|sens\s+du\s+détail|الدقة", "Attention to Detail"),
    (r"\bmultitasking\b|multitâche", "Multitasking"),
    (r"\bnegotiation\b|négociation|التفاوض", "Negotiation"),
    (r"\borganization\b|\borganisation\b", "Organization"),
    (r"تطوير\s+الويب|مطور\s+ويب|مطور\s+مواقع|تصميم\s+مواقع|تطوير\s+مواقع|تطوير\s+المواقع", "Web Development"),
]


def _extract_skills(text: str) -> list:
    found = []
    for pattern, display in _SKILLS:
        if re.search(pattern, text):
            found.append(display)
    return _dedupe(found)[:20]


# ---------------------------------------------------------------------------
# industries
# ---------------------------------------------------------------------------

_INDUSTRIES = [
    ("health", [
        r"\bhealth(care)?\b", r"\bmedical\b", r"\bclinic", r"\bhospital\b", r"\bdoctor\b",
        r"\bdentist\b", r"\bnurse\b", r"\bsanté\b", r"\bmédecine\b", r"\bmédical\b",
        r"\bclinique\b", r"\bhôpital\b", r"cabinet\s+médical", r"\bصحة\b", r"\bطبي\b",
        r"\bعيادة\b", r"\bمستشفى\b", r"\bطبيب\b", r"\bصيدلية\b",
    ]),
    ("e-commerce", [
        r"e-commerce|ecommerce", r"\bretail\b", r"\bshop\b", r"\bstores?\b",
        r"boutique\s+en\s+ligne", r"vente\s+en\s+ligne", r"commerce\s+électronique",
        r"تجارة\s+إلكترونية", r"متجر\s+إلكتروني", r"بيع\s+أونلاين", r"\bالتجارة\b",
        r"متاجر|المتاجر",
    ]),
    ("real estate", [
        r"real\s+estate", r"\bproperty\b", r"\brealtor\b", r"\bimmobilier\b",
        r"\bimmobilière\b", r"\bأملاك\b", r"\bعقارات\b", r"\bعقار\b",
    ]),
    ("hospitality", [
        r"\bhotel", r"\brestaurant", r"\bcafé\b|\bcafe\b", r"\bfood\b",
        r"\bhospitality\b", r"\brestauration\b", r"\bفندق\b",
        r"\bمطعم\b", r"\bمقهى\b", r"\bضيافة\b",
    ]),
    ("travel & tourism", [
        r"\btravel\b", r"\btourism\b", r"\bvoyage", r"\btourisme\b", r"\bséjour\b",
        r"\b(?:ال)?سفر\b", r"\b(?:ال)?سياحة\b", r"\b(?:ال)?رحلات\b",
    ]),
    ("education", [
        r"\beducation\b", r"\bschool\b", r"\buniversity", r"\bcourse", r"\btraining\b",
        r"\bformation\b", r"\béducation\b", r"\benseignement\b", r"\bتعليم\b",
        r"\bمدرسة\b", r"\bجامعة\b", r"\bتدريب\b", r"دروس\s+خصوصية",
    ]),
    ("technology", [
        r"\btech\b", r"\bsoftware\b", r"\bsaas\b", r"\bstartup", r"\bdeveloper\b",
        r"\bdev\b", r"\btechnologie\b", r"\blogiciel\b", r"شركة\s+ناشئة",
        r"\bتقنية\b", r"\bبرمجيات\b", r"\bتكنولوجيا\b", r"\bمطور\b",
        r"\bit\b", r"informatique", r"\bمعلوميات\b",
    ]),
    ("legal", [
        r"\blaw\b", r"\blawyer", r"\blegal\b", r"\battorney\b", r"\bnotary\b",
        r"\bdroit\b", r"\bavocat", r"\bjuridique\b", r"\bnotaire\b", r"\bقانون\b",
        r"\bمحامي\b", r"\bعدالة\b",
    ]),
    ("creative", [
        r"\bphotography\b", r"\bdesign\b", r"\bart\b", r"\bcreative\b", r"\bagency\b",
        r"\bphotographie\b", r"\bcréatif\b", r"\bcréation\b", r"\bتصوير\b",
        r"\bتصميم\b", r"\bفن\b", r"\bإبداع\b", r"\bوكالة\b",
    ]),
    ("marketing", [
        r"\bmarketing\b", r"digital\s+marketing", r"marketing\s+digital",
        r"\bالتسويق\b|\bتسويق\b", r"\bالإعلان\b", r"\bإعلانات\b",
    ]),
    ("finance", [
        r"\bfinance\b", r"\bbanking\b", r"\baccounting\b", r"\bfinances\b",
        r"\bbanque\b", r"\bcomptabilité\b", r"\bمالية\b", r"\bبنك\b", r"\bمحاسبة\b",
        r"\bbookkeeping\b",
    ]),
    ("automotive", [
        r"\bautomotive\b", r"\bautomobile\b", r"\bcars\b", r"\bسيارات\b",
        r"\bautos\b",
    ]),
    ("logistics", [
        r"\blogistics\b", r"\bdelivery\b", r"\btransport\b", r"\bاللوجستيك\b",
        r"\bالنقل\b", r"\bالتوصيل\b", r"\blivraison\b", r"\bshipping\b",
        r"\bexpédition\b",
    ]),
    ("agriculture", [
        r"\bagriculture\b", r"\bagri\b", r"\bزراعة\b", r"\bفلاحة\b",
        r"\bfarming\b",
    ]),
    ("construction", [
        r"\bconstruction\b", r"\bbâtiment\b", r"\bإنشاءات\b", r"\bبناء\b",
    ]),
    ("fashion", [
        r"\bfashion\b", r"\bmode\b", r"\bvêtements\b", r"\bcouture\b",
        r"\b(?:ال)?أزياء\b", r"\b(?:ال)?ملابس\b",
    ]),
    ("beauty & wellness", [
        r"\bbeauty\b", r"\bspa\b", r"\bsalon\b", r"\bcoiffure\b", r"\besthétique\b",
        r"\bcoaching\b", r"\b(?:ال)?تجميل\b", r"\b(?:ال)?صالون\b", r"\b(?:ال)?جمال\b",
        r"\b(?:ال)?حلاقة\b",
    ]),
    ("media & entertainment", [
        r"\bmedia\b", r"entertainment", r"\bjournalism\b", r"\bpress\b",
        r"\bcinema\b", r"\btelevision\b", r"\bmédias\b", r"\bjournalisme\b",
        r"\b(?:ال)?إعلام\b", r"\b(?:ال)?ترفيه\b", r"\b(?:ال)?صحافة\b",
        r"\b(?:ال)?سينما\b", r"\b(?:ال)?تلفزيون\b",
    ]),
    ("energy", [
        r"\benergy\b", r"\bsolar\b", r"\bwind\b", r"\bélectricité\b",
        r"\bélectrique\b", r"\b(?:ال)?طاقة\b", r"\b(?:ال)?كهرباء\b", r"\bمتجددة\b",
    ]),
    ("telecommunications", [
        r"\btelecom", r"\btélécom", r"\b(?:ال)?اتصالات\b", r"\binternet\b",
    ]),
    ("insurance", [
        r"\binsurance\b", r"\bassurance\b", r"\b(?:ال)?تأمين\b",
    ]),
    ("government", [
        r"\bgovernment\b", r"\bgouvernement\b", r"public\s+sector",
        r"\bministry\b", r"\b(?:ال)?حكومة\b", r"\bحكومي\b", r"\b(?:ال)?وزارة\b",
    ]),
    ("nonprofit", [
        r"non-?profit", r"\bassociation\b", r"\bong\b", r"\bcharity\b",
        r"\b(?:ال)?جمعية\b", r"\b(?:ال)?جمعيات\b", r"\b(?:ال)?خيرية\b",
    ]),
    ("fitness & sports", [
        r"\bfitness\b", r"\bsport\b", r"\bgym\b", r"\bcoach\b",
        r"\b(?:ال)?رياضة\b", r"\b(?:ال)?لياقة\b", r"\b(?:ال)?رياضي\b",
    ]),
    ("food & beverage", [
        r"food\s+and\s+beverage", r"\bf&b\b", r"\bboissons\b",
        r"الغذاء\s+والمشروبات", r"\b(?:ال)?مشروبات\b",
    ]),
]


def _extract_industries(text: str) -> list:
    found = []
    for industry, patterns in _INDUSTRIES:
        if any(re.search(p, text) for p in patterns):
            found.append(industry)
    return found[:6]


# ---------------------------------------------------------------------------
# website types
# ---------------------------------------------------------------------------

_WEBSITE_TYPES = [
    ("e-commerce", [
        r"e-commerce|ecommerce", r"\bshop\b", r"\bstores?\b", r"\bwoocommerce\b",
        r"\bshopify\b", r"\bprestashop\b", r"\bboutique\b", r"vente\s+en\s+ligne",
        r"\bمتجر\b", r"\bتجارة\b", r"بيع\s+أونلاين", r"متاجر|المتاجر",
    ]),
    ("portfolio", [
        r"\bportfolio\b", r"personal\s+site", r"\bshowcase\b", r"site\s+personnel",
        r"معرض\s+الأعمال", r"\bبورتفوليو\b",
    ]),
    ("blog", [
        r"\bblog", r"\bblogging\b", r"\bwordpress\b", r"\bمدونة\b", r"\bتدوين\b",
    ]),
    ("custom web app", [
        r"web\s+app", r"\bsaas\b", r"\bapplication\b", r"\bcustom\b", r"\breact\b",
        r"\bdjango\b", r"full[- ]stack", r"application\s+web", r"تطبيق\s+ويب",
        r"تطبيقات\s+ويب", r"\bساس\b",
    ]),
    ("landing page", [
        r"\blanding\b", r"lead\s+generation", r"\bfunnel", r"page\s+de\s+destination",
        r"صفحة\s+هبوط", r"توليد\s+العملاء",
    ]),
    ("web development", [
        r"web\s+development", r"développement\s+web", r"تطوير\s+الويب", r"مطور\s+ويب",
        r"مطور\s+مواقع", r"تصميم\s+مواقع",
    ]),
]


def _extract_website_types(text: str) -> list:
    found = []
    for wtype, patterns in _WEBSITE_TYPES:
        if any(re.search(p, text) for p in patterns):
            found.append(wtype)
    return _dedupe(found) or ["web development"]


# ---------------------------------------------------------------------------
# tone
# ---------------------------------------------------------------------------

_TONE_PATTERNS = [
    ("friendly", [r"\bfriendly\b", r"\bwarm\b", r"\bapproachable\b", r"\bamical\b",
                  r"\bconvivial\b", r"\bsympathique\b", r"\bsympa\b", r"\bودود\b", r"\bلطيف\b"]),
    ("casual", [r"\bcasual\b", r"\bchill\b", r"\brelaxed\b", r"\bdécontracté\b",
                r"\bبسيط\b", r"\bمريح\b", r"\bخفيف\b"]),
    ("technical", [r"\btechnical\b", r"\bgeeky\b", r"\btechnique\b", r"\bتقني\b"]),
]


def _extract_tone(text: str) -> str:
    for tone, patterns in _TONE_PATTERNS:
        if any(re.search(p, text) for p in patterns):
            return tone
    return "professional"


# ---------------------------------------------------------------------------
# availability
# ---------------------------------------------------------------------------

_AVAIL_LABELS = [
    "availability", "available from", "available", "start date", "disponibilité",
    "disponible à partir", "disponible", "التوفر", "متاح", "جاهز للعمل", "جاهز للبدء",
]

_AVAIL_INLINE = [
    "available from", "disponible à partir de", "متاح من", "متاح ابتداءً من",
    "متاح ابتداء من", "جاهز للعمل", "جاهز للبدء", "جاهز للعمل",
]

_AVAIL_RULES = [
    (r"متاح\s+(?:للعمل|الآن|فورا?|للبدء)|جاهز\s+(?:للعمل|للبدء|الآن)", "Immediately available"),
    (r"immediately\b|as\s+soon\s+as\s+possible|\basap\b|disponible\s+immédiatement|"
     r"dès\s+maintenant|de\s+suite\b|متاح\s+الآن|متاح\s+فورا?|فوراً|فورا|جاهز\s+الآن|بشكل\s+فوري",
     "Immediately available"),
    (r"full[- ]time|temps\s+plein|دوام\s+كامل|وقت\s+كامل", "Full-time"),
    (r"part[- ]time|temps\s+partiel|دوام\s+جزئي", "Part-time"),
    (r"\bremote\b|à\s+distance\b|télétravail|travail\s+à\s+distance|عن\s+بعد\b|العمل\s+عن\s+بعد",
     "Remote"),
    (r"\bfreelance\b|freelance\s+uniquement", "Freelance"),
    (r"open\s+to\s+(?:new\s+)?(?:opportunities|work)\b", "Open to work"),
    (r"\bevenings?\b|\bweekends?\b|week[- ]end|soirs?\b|أوقات\s+المساء|عطلات\s+نهاية\s+الأسبوع",
     "Evenings/Weekends"),
]


def _extract_availability(text: str) -> str:
    value = _extract_labeled(text, _AVAIL_LABELS)
    if not value:
        value = _extract_inline(text, _AVAIL_INLINE)
    if value:
        value = re.split(r"(?i)\s*\d+\s*\+?\s*(?:years?|ans|سنوات|سنة)", value)[0]
        value = _clean_value(value, max_len=80)
        if value.lower() in ("now", "immediately", "maintenant", "de suite",
                             "الآن", "فوراً", "فورا", "متاح"):
            return "Immediately available"
        if value:
            return value
    flags = []
    for pattern, label in _AVAIL_RULES:
        if re.search(pattern, text):
            flags.append(label)
    return ", ".join(dict.fromkeys(flags))


# ---------------------------------------------------------------------------
# education / certifications / languages / projects
# ---------------------------------------------------------------------------

_EDU_LABELS = [
    "education", "degree", "studied", "academic background", "formation",
    "diplôme", "études", "université", "école", "parcours académique",
    "التعليم", "الدراسة", "الجامعة", "المدرسة", "الشهادة", "تخرج", "التكوين",
]

_DEGREE_RE = re.compile(
    r"(?i)\b(?:bachelor|(?<!scrum\s)master|phd|doctorate|b\.?sc|m\.?sc|mba|licence|"
    r"doctorat|ingénieur|dut|bts|baccalauréat|بكالوريوس|ماجستير|دكتوراه|ليسانس|إجازة)\b"
)


def _extract_education(text: str) -> str:
    value = _extract_labeled(text, _EDU_LABELS, lines=2)
    if value:
        return value
    for line in text.split("\n"):
        m = _DEGREE_RE.search(line)
        if m:
            prev = line.rfind(". ", 0, m.start())
            seg_start = prev + 2 if prev != -1 else 0
            marker = line.find(". ", m.end())
            seg_end = marker + 1 if marker != -1 else len(line)
            return _clean_value(line[seg_start:seg_end], max_len=220)
    return ""


_CERT_LABELS = [
    "certifications", "certification", "certificates", "training", "trainings",
    "professional development", "courses", "certificats", "formations", "formation",
    "الشهادات المهنية", "الشهادات", "شهادات", "التدريب", "دورات تدريبية", "الدورات",
    "دورات", "التكوين",
]

_CERT_KW_RE = re.compile(
    r"(?i)(aws\s+certified|google\s+(analytics|ads|cloud)\s+certified|pmp\b|"
    r"scrum\s+master|csm\b|ccna\b|ceh\b|comptia|ielts\b|toefl\b|toeic\b|"
    r"delf\b|dalf\b|salesforce|hubspot|meta\s+certified|microsoft\s+certified|"
    r"oracle\s+certified|شهادة\s+[^\s،,]+)"
)


def _extract_certifications(text: str) -> list:
    raws = list(_iter_sections(text, _CERT_LABELS, max_lines=10))
    if not raws:
        single = _extract_section(text, _CERT_LABELS, max_lines=10)
        if single:
            raws = [single]
    items = []
    for raw in raws:
        for line in raw.split("\n"):
            for piece in re.split(r"[,;•·\n|]+", line):
                piece = _CUT_RE.split(piece)[0]
                piece = _clean_value(piece, max_len=80).rstrip(".")
                if not piece or piece.isdigit():
                    continue
                if _is_section_line(piece):
                    continue
                items.append(piece)
    cleaned = _dedupe(items)
    if cleaned:
        return cleaned[:10]
    hits = []
    for m in _CERT_KW_RE.finditer(text):
        item = _clean_value(m.group(1), max_len=70)
        if item and item.lower() not in (h.lower() for h in hits):
            hits.append(item)
        if len(hits) >= 8:
            break
    return hits


_LANG_MAP = {
    "Arabic": [r"\barabic\b", r"\barabe\b", r"العربية", r"\bعربي\b", r"اللغة\s+العربية"],
    "French": [r"\bfrench\b", r"\bfrançais\b", r"\bfrancaise\b", r"الفرنسية", r"اللغة\s+الفرنسية"],
    "English": [r"\benglish\b", r"\banglais\b", r"الإنجليزية", r"الانجليزية", r"اللغة\s+الإنجليزية"],
    "Spanish": [r"\bspanish\b", r"\bespagnol\b", r"الإسبانية", r"الإسباني"],
    "German": [r"\bgerman\b", r"\ballemand\b", r"الألمانية"],
    "Italian": [r"\bitalian\b", r"\bitalien\b", r"الإيطالية"],
    "Portuguese": [r"\bportuguese\b", r"\bportugais\b", r"البرتغالية"],
    "Dutch": [r"\bdutch\b", r"\bnéerlandais\b", r"الهولندية"],
    "Turkish": [r"\bturkish\b", r"\bturc\b", r"التركية"],
    "Russian": [r"\brussian\b", r"\brusse\b", r"الروسية"],
    "Chinese": [r"\bchinese\b", r"\bchinois\b", r"الصينية"],
    "Japanese": [r"\bjapanese\b", r"\bjaponais\b", r"اليابانية"],
    "Korean": [r"\bkorean\b", r"\bcoréen\b", r"الكورية"],
    "Amazigh": [r"\bamazigh\b", r"\bberber\b", r"الأمازيغية", r"\bتامازيغت\b"],
}


def _extract_languages(text: str) -> list:
    hits = []
    for lang, patterns in _LANG_MAP.items():
        pos = None
        for p in patterns:
            m = re.search(p, text)
            if m and (pos is None or m.start() < pos):
                pos = m.start()
        if pos is not None:
            hits.append((pos, lang))
    hits.sort()
    return [lang for _, lang in hits][:8]


_PROJ_LABELS = [
    "projects", "recent work", "selected projects", "key projects", "featured projects",
    "side projects", "project experience", "work experience", "professional experience",
    "experience", "portfolio", "projets", "expérience professionnelle", "réalisations",
    "mes projets", "projets réalisés", "المشاريع", "أعمالي", "أعمال", "مشاريع",
    "أبرز الأعمال", "أبرز أعمالي", "خبراتي", "إنجازات", "إنجازاتي", "تجربتي",
    "الخبرات المهنية",
]

_PROJ_SPECIFIC_LABELS = [
    "projects", "recent work", "selected projects", "key projects", "featured projects",
    "side projects", "project experience", "portfolio", "projets", "mes projets",
    "projets réalisés", "réalisations", "المشاريع", "أعمالي", "أعمال", "مشاريع",
    "أبرز الأعمال", "أبرز أعمالي", "إنجازات", "إنجازاتي",
]


def _extract_past_projects(text: str) -> str:
    raw = _extract_section(text, _PROJ_SPECIFIC_LABELS, max_lines=14)
    if not raw:
        raw = _extract_section(text, _PROJ_LABELS, max_lines=14)
    if not raw:
        return ""
    if _URL_RE.fullmatch(raw.strip()) or _BARE_URL_RE.fullmatch(raw.strip()):
        return ""
    items = []
    for line in raw.split("\n"):
        piece = _CUT_RE.split(line)[0]
        piece = piece.strip(" \t\r\n•·∙◦-–—|،،؛()[]{}")
        if len(piece) > 220:
            piece = piece[:220].rstrip(" \t,،؛-–—.")
        if not piece or piece.isdigit():
            continue
        if re.fullmatch(r"(?:19|20)\d{2}[-–]\d{2,4}", piece):
            continue
        if _is_section_line(piece):
            continue
        items.append(piece)
    items = _dedupe(items)
    return "\n".join(items)


_PORTFOLIO_NON_TECH = {
    "Teamwork", "Leadership", "Problem Solving", "Time Management", "Creativity",
    "Adaptability", "Attention to Detail", "Multitasking", "Negotiation", "Organization",
    "Communication", "Customer Service", "Technical Support", "Community Management",
    "Ads Management", "Digital Marketing", "Email Marketing", "Social Media",
    "Copywriting", "Content Writing", "Photography", "Video Editing", "Motion Design",
    "Graphic Design", "Design",
}


def extract_portfolio_projects(text: str) -> list:
    """Structure resume project lines into portfolio project dicts matching the UI:
    title, description, url, tech_stack, year, client_name."""
    if not text:
        return []
    projects = []
    seen = set()
    for line in text.split("\n"):
        piece = _CUT_RE.split(line)[0]
        piece = piece.strip(" \t\r\n•·∙◦-–—|،،؛()[]{}")
        if not piece or piece.isdigit():
            continue
        if re.fullmatch(
            r"(?i)\s*(?:" + "|".join(re.escape(s) for s in _STOP_LABELS) + r")\s*[:=\-–—]?\s*",
            piece,
        ):
            continue
        if re.fullmatch(r"(?:19|20)\d{2}[-–]\d{2,4}", piece):
            continue
        if _URL_RE.fullmatch(piece) or _BARE_URL_RE.fullmatch(piece):
            continue

        entry = {
            "title": "", "description": "", "url": "",
            "tech_stack": [], "year": None, "client_name": "",
        }

        m = re.search(_URL_RE.pattern, piece)
        if not m:
            m = _BARE_URL_RE.search(piece)
        if m:
            entry["url"] = m.group(0).rstrip(".,;،؛")
            piece = piece.replace(m.group(0), " ").strip()

        ym = re.search(r"\b(?:19|20)\d{2}\b", piece)
        if ym:
            entry["year"] = int(ym.group(0))

        cm = re.finditer(
            r"(?i)\b(?:for|pour|لصالح)\s+([a-zà-ÿ\u0600-\u06FF][\w'& \u0600-\u06FF\-]{2,40})",
            piece,
        )
        for m in cm:
            client = m.group(1).strip().strip(".,;،؛")
            client = re.sub(r"^(?:the|un|une|des|la|le|les|ال)\s+", "", client, flags=re.I)
            client = re.split(r"(?i)\s+(?:with|using|built|développé|powered)\s+", client)[0]
            client = re.split(r"(?i)[,.;،؛:–—]|\s+and\s+", client)[0].strip()
            if client and (
                not re.search(r"[a-zA-Z]", client)
                or re.match(r"[A-ZÀ-Ö]", client)
            ):
                entry["client_name"] = client[:40]
                break

        colon = piece.find(":")
        if colon > 0:
            head = piece[:colon].strip()
            if (
                head
                and not re.fullmatch(r"(?:19|20)\d{2}", head)
                and not head.lower().startswith(("http", "www"))
                and not re.search(r"\.\w{2,}$", head)
            ):
                entry["title"] = head[:90]
                entry["description"] = piece[colon + 1:].strip()
        if not entry["title"]:
            entry["title"] = piece[:90]

        tech = []
        search_piece = piece.lower()
        for pattern, display in _SKILLS:
            if display in _PORTFOLIO_NON_TECH:
                continue
            if re.search(pattern, search_piece):
                tech.append(display)
        entry["tech_stack"] = _dedupe(tech)[:8]

        key = entry["title"].lower()
        if key in seen:
            continue
        seen.add(key)
        projects.append(entry)
        if len(projects) >= 10:
            break
    return projects

_ABOUT_LABELS = [
    "summary", "objective", "professional summary", "about me", "profile",
    "profil", "à propos de moi", "à propos", "résumé",
    "نبذة عني", "نبذة", "ملخص", "عن نفسي",
]
