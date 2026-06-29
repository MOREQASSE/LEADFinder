# 🕵️ Detective — Search Modes Architecture & Implementation Guide

## Vision

Transform the app from a **keyword-bag scraper** (find anything matching these words) into a **context-aware lead detective** that knows *what* you're looking for, *where* to look, and *who* is valuable.

Three search modes sit **between presets and scrapers** as an intent layer:

- **Presets** define *what domain* (websites, cybersecurity, networking)
- **Modes** define *what transaction type* (buying services, selling labor, seeking training)

Each preset (built-in or custom) can optionally **associate a mode**. When activated, the mode is set globally. If a preset has no mode, the current mode is left unchanged.

---

## The Three Modes

### 🔵 Job Hunter (`job_hunter`)
Find employment, full-time roles, contract positions.  
*Example: "Companies hiring website developers"*

| Aspect | Detail |
|--------|--------|
| **Signature keywords** | `hiring, position, full-time, remote, salary, job opening, we are looking for, opportunity, career` |
| **Platform priority** | LinkedIn → Indeed → HackerNews → Upwork → Reddit |
| **Geography weight** | Strong (local jobs prioritized) |
| **Exclude** | `internship, intern, freelance, volunteer, contractor, unpaid` |

### 🟢 Internship Scout (`internship_scout`)
Find internships, graduate programs, entry-level roles.

| Aspect | Detail |
|--------|--------|
| **Signature keywords** | `internship, summer intern, graduate trainee, fresher, entry-level, new grad, apprentice` |
| **Platform priority** | LinkedIn → Indeed → Upwork → Reddit → HackerNews |
| **Geography weight** | Moderate (student hubs + remote) |
| **Exclude** | `senior, lead, manager, principal, 5+ years, 10 years, experienced` |

### 🟠 Clients Excavator (`clients_excavator`)
Find BUYERS — people/companies who need services.  
*Example: "People needing a website built"*

| Aspect | Detail |
|--------|--------|
| **Signature keywords** | `looking for, need help, looking to build, want to hire, seeking freelancer, need a developer` |
| **Platform priority** | Reddit → Craigslist → Upwork → Mastodon |
| **Geography weight** | Weak (clients can be anywhere) |
| **Exclude** | `looking for work, looking for job, available for hire, seeking employment, resume attached` |

---

## Data Model (Settings Table — No DB Migration)

All mode state lives in the existing `setting` key-value table:

| Key | Values | Default |
|-----|--------|---------|
| `search_mode` | `job_hunter`, `internship_scout`, `clients_excavator` | `clients_excavator` |
| `user_location` | Free text, e.g. "Casablanca, Morocco" | `""` → falls back to `ResumeData.location` |
| `geo_radius` | `local`, `national`, `global` | `national` |

Custom presets in `search_presets_list` gain an optional `mode` field:

```json
{
  "id": "my_preset",
  "name": "My Custom Search",
  "keywords": "...",
  "mode": "job_hunter"
}
```

---

## File Map

### Backend
| File | Action | Purpose |
|------|--------|---------|
| `backend/scrapers/modes.py` | **CREATE** | Mode profiles + preset-mode association |
| `backend/scrapers/base.py` | **MODIFY** | Add `_get_mode()`, `_get_mode_keywords()`, `_get_geo_context()` |
| `backend/scrapers/reddit.py` | **MODIFY** | Mode-aware subreddit selection |
| `backend/scrapers/linkedin.py` | **MODIFY** | Mode + geography in job URL |
| `backend/scrapers/hackernews.py` | **MODIFY** | Mode-aware feed selection |
| `backend/scrapers/mastodon.py` | **MODIFY** | Mode-aware hashtags |
| `backend/scrapers/craigslist.py` | **MODIFY** | Mode-aware categories |
| `backend/scrapers/indeed.py` | **MODIFY** | Mode keywords + geography in RSS |
| `backend/utils/ranking.py` | **MODIFY** | Intelligence scoring with mode + geo |

### Frontend
| File | Action | Purpose |
|------|--------|---------|
| `ModeSelector.jsx` | **CREATE** | Mode selection UI component |
| `SearchPresets.jsx` | **MODIFY** | Add mode association per preset |
| `GetLeads.jsx` | **MODIFY** | Show active mode badge |

---

## BaseScraper API

```python
async def _get_mode(self) -> str:
    """Read search_mode from DB. Falls back to 'clients_excavator'."""

async def _get_mode_keywords(self, base_keywords: list[str]) -> list[str]:
    """Merge preset keywords + mode modifiers. Deduplicated."""

async def _get_mode_exclude(self, base_exclude: list[str]) -> list[str]:
    """Merge preset exclude + mode exclude. Deduplicated."""

async def _get_geo_context(self) -> dict:
    """Return {location, timezone, radius} from ResumeData or settings."""
```

---

## Per-Scraper Changes

### Reddit
Add mode-specific subreddits to the sidebar discovery.

### LinkedIn
Use `_get_geo_context().location` instead of hardcoded "United States".  
Apply mode keywords to search query.

### HackerNews / Mastodon
Already preset-aware; add mode modifiers to feed/hashtag selection.

### Craigslist
Choose categories based on mode (job vs service categories).

### Indeed
Append mode keywords + location to RSS query URL.

---

## Intelligence Scoring

Each lead gets a 0–100 `intelligence_score` combining:

| Signal | Weight | Details |
|--------|--------|---------|
| Mode alignment | 0–30 | Does lead content match mode intent? |
| Geography match | 0–25 | City=25, Country=15, Remote=10 |
| Budget quality | 0–20 | Has budget above thresholds |
| Urgency signals | 0–15 | "urgent", "asap", "immediately" |
| Quality signals | 0–10 | "company", "startup", "business" |
| Noise deduction | −0–20 | "free", "cheap", "volunteer" |

---

## Glossary

| Term | Definition |
|------|------------|
| **Preset** | A named collection of keywords, platforms, and exclude terms (e.g. "Website Development") |
| **Mode** | An intent layer (Job Hunter / Internship Scout / Clients Excavator) that modifies how presets are applied |
| **Association** | Linking a mode to a preset so activating the preset also sets the mode |
| **Geo context** | User's location + timezone + radius preference, pulled from ResumeData or settings |
