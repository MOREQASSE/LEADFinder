# Platforms & Scraping Methods

## Overview

| # | Platform | File | API Key Required | Method | Registration Needed |
|---|---|---|---|---|---|
| 1 | **Google Maps** | `google_maps.py` | No | Playwright (headless Chromium) | No |
| 2 | **Reddit** | `reddit.py` | **Yes** — `reddit_client_id`, `reddit_client_secret`, `reddit_user_agent` | PRAW REST API | Yes — Reddit account + "script" app at reddit.com/prefs/apps |
| 3 | **Craigslist** | `craigslist.py` | No | Async Playwright: multi-region, categories, pagination, parallel tabs | No |
| 4 | **Upwork** | `upwork.py` | No | RSS feedparser | No |
| 5 | **Mastodon** | `mastodon.py` | **Yes** — `mastodon_access_token` | mastodon.py REST API | Yes — Mastodon account + developer application |
| 7 | **Indeed** | `indeed.py` | **Optional** — `adzuna_api_id`, `adzuna_api_key` (Adzuna fallback only) | RSS feedparser (+ httpx for Adzuna) | Only for Adzuna fallback |
| 8 | **HackerNews** | `hackernews.py` | No | RSS feedparser (hnrss.org) | No |
| 9 | **Google Alerts** | `google_alerts.py` | **Yes** — `gmail_email`, `gmail_app_password` | IMAP (imaplib) — reads Gmail inbox | Yes — Google account + App Password |

---

## Details Per Platform

### 1. Google Maps

- **API Key**: None
- **Method**: Playwright headless Chromium browser automation
- **How it works**: Opens `google.com/maps`, scrolls the results feed to load all cards, clicks each card to open the details panel, extracts name/address/phone/rating/hours/category/website. Filters out businesses that already have a website.
- **Registration**: None
- **Settings**: None required
- **Limits**: Respects Google's rate limiting; random delays between actions

### 2. Reddit

- **API Key**: Yes — `reddit_client_id`, `reddit_client_secret`, `reddit_user_agent`
- **Method**: PRAW (Python Reddit API Wrapper)
- **How it works**: Fetches new posts from targeted subreddits (`forhire`, `freelance`, `webdev`, etc.) matching search keywords
- **Registration**: Reddit account + create a "script" app at https://www.reddit.com/prefs/apps
- **Settings**: `reddit_client_id`, `reddit_client_secret`, `reddit_user_agent`, `search_preset_active`, `rate_limit_reddit_daily`

### 3. Craigslist

- **API Key**: None
- **Scope**: Craigslist is **not one global site**. Each **subdomain** (`sfbay`, `newyork`, `london`, …) is its own region. The scraper only loads regions you configure (one site, a comma-separated `craigslist_sites` list, and/or optional **US hub** preset)—never “all Craigslist worldwide” (that would be huge, slow, and hostile to their servers).
- **Method**: Async Playwright opens **one browser** and reuses a context; for each `(site, category, page)` URL it loads the JS search UI, reads `.result-node` rows, dedupes by URL, then applies your keyword / exclude rules.
- **How it works**: Categories include **web** (web/HTML/info jobs), **sof** (software/QA/DBA jobs), **cps** (computer services), **cpg** (computer gigs). Each combo can fetch up to **`craigslist_max_pages`** pages (~120 listings per page via `s=` offset). **`craigslist_parallel_tabs`** URLs load concurrently (capped) to shorten wall time without spawning many browsers.
- **Registration**: None
- **Settings**: `craigslist_site`, optional `craigslist_sites` (CSV overrides the single site list), `craigslist_use_us_hubs`, `craigslist_max_sites`, `craigslist_max_pages`, `craigslist_parallel_tabs`, `craigslist_post_goto_ms`, optional `craigslist_area` (only use with a **single** region—area codes differ per city), legacy `craigslist_rss_url` infers site when empty; `rate_limit_craigslist_daily`

### 4. Upwork

- **API Key**: None
- **Method**: RSS feed via feedparser
- **How it works**: Parses public Upwork RSS job feeds (`upwork.com/ab/feed/jobs/rss`) filtered by keywords
- **Registration**: None
- **Settings**: `upwork_rss_url` (optional custom feed URL), `rate_limit_upwork_daily`

### 5. Mastodon

- **API Key**: Yes — `mastodon_access_token`
- **Method**: mastodon.py REST API library
- **How it works**: Connects to `mastodon.social`, fetches posts by hashtag, filters against keywords
- **Registration**: Mastodon account + create a developer application for an access token
- **Settings**: `mastodon_access_token`, `rate_limit_mastodon_daily`

### 7. Indeed

- **API Key**: Optional — `adzuna_api_id`, `adzuna_api_key` (only for Adzuna fallback)
- **Method**: RSS feedparser (primary) + httpx REST API (Adzuna fallback)
- **How it works**: Tries Indeed RSS feeds first. If no results and Adzuna keys are configured, falls back to the Adzuna API
- **Registration**: Only for Adzuna — register at https://developer.adzuna.com
- **Settings**: `indeed_rss_url` (optional custom RSS), `adzuna_api_id`, `adzuna_api_key`, `rate_limit_indeed_daily`

### 8. HackerNews

- **API Key**: None
- **Method**: RSS feed via feedparser from hnrss.org
- **How it works**: Fetches `hnrss.org/frontpage` or `hnrss.org/jobs` depending on the active search preset
- **Registration**: None
- **Settings**: `search_preset_active`, `rate_limit_hackernews_daily`

### 9. Google Alerts

- **API Key**: Yes — `gmail_email`, `gmail_app_password`
- **Method**: IMAP via imaplib
- **How it works**: Logs into Gmail IMAP, searches for emails from `google-alerts@google.com`, extracts alert content
- **Registration**: Google account + App Password (requires 2FA enabled) + Google Alerts configured
- **Settings**: `gmail_email`, `gmail_app_password`

---

## Shared Settings (used across scrapers)

| Key | Default | Purpose |
|---|---|---|
| `search_keywords` | `web development,website design` | Keywords to match in posts |
| `search_exclude` | `free,cheap` | Terms to exclude leads |
| `search_preset_active` | `websites` | Determines subreddits/hashtags/feeds |
| `boost_keywords` | `urgent,asap,company` | Keywords that boost lead rank |
| `blacklist_keywords` | `scam,fake` | Keywords that auto-reject leads |

---

## Rate Limits (configured in Settings)

| Key | Default |
|---|---|
| `rate_limit_reddit_daily` | 20 |
| `rate_limit_craigslist_daily` | 10 |
| `rate_limit_upwork_daily` | 15 |
| `rate_limit_mastodon_daily` | 30 |
| `rate_limit_indeed_daily` | 10 |
| `rate_limit_hackernews_daily` | 5 |
