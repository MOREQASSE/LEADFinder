# Reddit Scraper — Logic & Syntax Reference

## Overview

`backend/scrapers/reddit.py` scrapes Reddit for leads **without API keys**. It discovers subreddits intelligently (sidebar scraping + optional AI), then reads Reddit's public **multi-RSS feed** (`/r/sub1+sub2+.../new/.rss`), parses it with `feedparser`, and produces `ScrapedLead` objects that get saved to the database by the caller (scheduler or API).

---

## Class: `RedditScraper(BaseScraper)`

Inherits from `BaseScraper` (`backend/scrapers/base.py`). Every scraper in the project follows this pattern.

### Constructor

```python
def __init__(self, db=None):
    super().__init__(db)
    self.platform_name = "Reddit"
```

- `db` — optional SQLAlchemy `AsyncSession`. When `None`, the scraper runs with defaults (no DB reads).
- `platform_name` — used by the DB saving logic in `routers/leads.py` and `scheduler.py` to tag leads.

---

## Entry Point: `async def scrape() -> list[ScrapedLead]`

This is the **only method the framework calls**. Steps in order:

### 1. Load Keywords & Exclude Terms

```python
keywords = await self._get_keywords("website,web developer,web designer,hire,need,looking for")
exclude = await self._get_exclude("free,cheap")
```

These are inherited from `BaseScraper`:
- `_get_keywords(default)` — reads `search_keywords` setting from DB. Falls back to `default` if no DB or setting is empty.
- `_get_exclude(default)` — reads `search_exclude` setting from DB. Same fallback logic.

Both return `list[str]` (lowercased, stripped).

### 2. Load Preset & Custom Subreddits

```python
preset = "websites"
custom_subreddits = None

if self.db:
    from utils.settings_loader import get_setting
    preset = await get_setting(self.db, "search_preset_active", "websites")
    custom_raw = await get_setting(self.db, "reddit_subreddits", "")
    if custom_raw.strip():
        custom_subreddits = [s.strip().lower() for s in custom_raw.split(",") if s.strip()]
```

- `search_preset_active` — string like `"websites"`, `"cybersecurity_jobs"`, etc. Set via the Search Presets UI.
- `reddit_subreddits` — optional comma-separated list of subreddits (e.g. `"forhire,freelance,webdev"`). If set, **overrides** the preset-based list entirely.
- Both are loaded from the `settings` DB table via `get_setting(key, default)`.

### 3. Resolve Seed Subreddits

```python
seed_subs = self._get_subreddits(preset, custom_subreddits)
```

Priority:
1. `custom_subreddits` (from `reddit_subreddits` setting) — if non-empty
2. `PRESET_SUBREDDITS[preset]` — if the preset key exists
3. `DEFAULT_SUBREDDITS` — fallback

### 4. Discover More Subreddits (Smart Expansion)

```python
all_subs = await self._discover_subreddits(seed_subs)
```

This expands the seed list using two strategies (see below). Final list is capped at **`MAX_SUBREDDITS = 20`**.

### 5. Scrape Multi-RSS

```python
return await self._scrape_multi_rss(all_subs, keywords, exclude)
```

---

## Smart Subreddit Discovery: `_discover_subreddits()`

Takes seed subreddits + keywords, returns an expanded deduplicated list.

```
seed_subs ──► Strategy 1: Sidebar Scraping (always runs)
            │              └── old.reddit.com sidebar → related subs
            │
            ├──► Strategy 2: AI Suggestion (if AI configured)
            │              └── LLM suggests subs based on keywords
            │
             └──► Merge & cap at MAX_SUBREDDITS (20)
```

### Strategy 1: Sidebar Scraping

**What**: Fetches `old.reddit.com/r/{sub}/` HTML, parses the sidebar for `/r/subreddit` links.

**Why**: Subreddit sidebars list related communities. This is a organic discovery method that surfaces real, active subreddits related to the seeds.

```python
async def _scrape_single_sidebar(self, sub: str) -> set[str]:
    resp = await client.get(f"https://old.reddit.com/r/{sub}/")
    soup = BeautifulSoup(resp.text, "html.parser")
    side = soup.find("div", class_="side")
    for a in side.find_all("a"):
        href = a.get("href", "")
        m = re.match(r"/(?:r/)([a-zA-Z0-9_]+)", href)
        if m:
            subs.add(m.group(1).lower())
```

Details:
- Uses `old.reddit.com` (simpler HTML, no JS required, sidebar is server-rendered).
- Scrapes up to **5** related subs per seed subreddit (hardcoded slice `[:5]` in `_scrape_single_sidebar`).
- Runs sidebar fetches concurrently (`asyncio.gather` with `Semaphore(3)` to limit concurrency).
- Results are cached in-memory for the lifetime of the process (`_SIDEBAR_CACHE` dict).

**Example**: Scraping `/r/forhire` sidebar discovers `r/b2bforhire`, `r/designjobs`, `r/freelance`, `r/jobs4bitcoins`, `r/hireawriter`.

### Strategy 2: AI Suggestion

**What**: If the app has an AI provider configured (OpenRouter or GitHub Models), asks the LLM to suggest additional subreddits based on the current keywords and seed list.

**Why**: The AI can make "creative leaps" — suggesting subreddits that aren't linked in any sidebar but are topically relevant.

```python
async def _ai_suggest_subreddits(self, keywords, seed_subs, already_known) -> set[str]:
    from ai.fallback import query_with_fallback
    prompt = (
        "You are a Reddit expert. Given search keywords and seed subreddits, "
        "suggest additional subreddits where people post about needing services or hiring "
        "related to these keywords...\n\n"
        f"Keywords: {', '.join(keywords)}\n"
        f"Seed subreddits: {', '.join(seed_subs)}\n\n"
        "Return ONLY a comma-separated list of subreddit names without /r/."
    )
    result = await query_with_fallback(prompt, self.db)
    # Parse comma-separated names from the AI response
```

Details:
- Uses `query_with_fallback()` from `ai/fallback.py` — tries primary AI config first, then falls back to other configured providers.
- Will **silently skip** if no AI is configured (no error, no crash).
- Parses the LLM's text response as comma-separated subreddit names.
- Deduplicates against seed subs and sidebar-discovered subs.

---

## Multi-RSS Scraping: `_scrape_multi_rss()`

### The Core Idea

Instead of making N sequential requests (one per subreddit), Reddit's multi-RSS format combines subreddits into a **single URL**:

```
https://www.reddit.com/r/sub1+sub2+sub3/new/.rss?limit=100
```

This returns a single RSS feed with posts from all combined subreddits, newest first.

### Why Multi-RSS?

- **Rate limiting**: Sequential RSS requests trigger 429 after ~6-8 requests. Multi-RSS = 1 request = 0% 429.
- **Speed**: 15 subreddits in ~2 seconds vs ~50 seconds with per-subreddit + delays.
- **Simplicity**: No per-subreddit loop, no `asyncio.sleep()`, no partial failure handling.

### HTTP Client

```python
async with httpx.AsyncClient(headers={"User-Agent": USER_AGENT}) as client:
```

- Uses `httpx` (async HTTP).
- Single `User-Agent` header — mimics a real browser.

### Single Request

```python
subs_str = "+".join(subreddits)
url = f"https://www.reddit.com/r/{subs_str}/new/.rss?limit=100"
resp = await client.get(url, timeout=15)
```

- Uses `www.reddit.com` (not `old.reddit.com`).
- `limit=100` — returns up to **100 posts total** (not 100 per subreddit). Reddit fills the feed from the most active subreddits in the combination.
- If non-200, logs a warning and returns empty list (no retry).

### Feed Parsing

```python
feed = feedparser.parse(resp.text)
for entry in feed.entries:
```

- `feedparser` converts RSS XML into Python objects.
- Each `entry` has: `title`, `summary`, `link`, `author`, `published_parsed`, `content` (list).

### Keyword / Exclude Filtering

```python
title = entry.get("title", "")
content = self._get_entry_content(entry)
combined = (title + " " + content).lower()

if not any(kw in combined for kw in keywords):
    continue
if any(ex in combined for ex in exclude):
    continue
```

- Concatenates title + body, lowercases.
- **Inclusion**: at least one keyword must match (substring check).
- **Exclusion**: if any exclude term matches, the post is skipped.
- `_get_entry_content()` tries `summary` → `description` → `content[0].value` in order (RSS feeds vary in which field they populate).

### Building ScrapedLead

```python
leads.append(ScrapedLead(
    title=title,
    platform="Reddit",
    url=entry.get("link", ""),
    timestamp=published,
    author=author,
    description=(content or "")[:1000],
))
```

| `ScrapedLead` field | Source |
|---|---|
| `title` | `entry.title` |
| `platform` | Hardcoded `"Reddit"` |
| `url` | `entry.link` |
| `timestamp` | `entry.published_parsed` → `datetime` with UTC timezone |
| `author` | `entry.author` (or `entry.source.author` fallback) |
| `description` | `entry.summary` (or `entry.content[0].value`), truncated to 1000 chars |

### Performance Comparison

| Approach | Requests | Time | 429 Rate |
|---|---|---|---|
| Per-subreddit (15 subs) | 15 sequential | ~50s | Guaranteed |
| Multi-RSS (all subs) | 1 | ~2s | 0% |

The multi-RSS approach was verified with `test_multirss.py`: 3 consecutive runs, 0% 429, 100 entries each run.

---

## Constants & Tuning

```python
MAX_SUBREDDITS = 20         # Max subreddits to combine into multi-RSS
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
```

Note: `MAX_SIDEBAR_PER_SEED = 5` was removed in favor of a hardcoded `[:5]` slice. Sidebar cache is process-lifetime (no TTL).

---

## The Big Picture — How Data Flows to the Database

```
RedditScraper.scrape()
        │
        ├─ 1. Load keywords & exclude from DB (or defaults)
        ├─ 2. Load preset & custom subreddits from DB
        ├─ 3. Discover more subreddits via sidebar scraping
        │      └─ (optional) AI suggestion
        ├─ 4. Scrape multi-RSS feed (single request)
        │      └─ Filter posts by keywords / exclude
        └─ 5. Return list[ScrapedLead]
              │
              ▼
  Caller (routers/leads.py:165-232 or scheduler.py:21-51)
        │
        ├─ Dedup: checks if Lead.url already exists in DB
        ├─ Enrich: calculate_rank(), convert_to_mad()
        ├─ Save: db.add(Lead(...))
        ├─ Commit: db.commit()
        └─ Notify: notify_new_lead(lead, db)
```

The scraper **never saves to DB itself** — it returns data objects. The caller (API endpoint or scheduler) handles persistence. This keeps the scraper testable and decoupled.

---

## Settings Reference

| DB Setting Key | Used By | Default | Description |
|---|---|---|---|
| `search_keywords` | `_get_keywords()` | `website,web developer,...` | Comma-separated keywords to match |
| `search_exclude` | `_get_exclude()` | `free,cheap` | Terms that disqualify a post |
| `search_preset_active` | `scrape()` | `websites` | Active preset ID, determines seed subreddits |
| `reddit_subreddits` | `scrape()` | `""` (empty) | Custom subreddit list, overrides preset entirely |

---

## Adding a New Preset

1. Add an entry to `PRESET_SUBREDDITS` in `reddit.py`:
   ```python
   "my_new_preset": ["subreddit1", "subreddit2"],
   ```
2. Add the preset definition in `frontend/src/components/Settings/SearchPresets.jsx` inside `BUILT_IN_PRESETS`.

That's it — the scraper reads `search_preset_active` and discovers subreddits automatically from the seeds.

---

## Dependencies

- `httpx` — async HTTP client
- `feedparser` — RSS/Atom feed parsing
- `beautifulsoup4` — HTML parsing for sidebar scraping
- `BaseScraper` / `ScrapedLead` — from `backend/scrapers/base.py`
- `ai/fallback.query_with_fallback` — AI provider (optional, only if configured)
