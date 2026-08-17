import React from 'react'

const LINK_STYLE = {
  color: '#FF6B35',
  fontWeight: 900,
  textDecoration: 'underline',
  textUnderlineOffset: 2,
}

const TourLink = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" style={LINK_STYLE}>
    {children}
  </a>
)

const Strong = ({ children }) => (
  <strong style={{ color: '#111827', fontWeight: 900 }}>{children}</strong>
)

export const TOUR_STEPS = [
  {
    target: '[data-tour="dashboard-header"]',
    route: '/',
    placement: 'bottom',
    title: 'Welcome to LEADFinder',
    content:
      'Your AI-powered command center. Every number here tracks your lead pipeline — scrape, rank, reply, and win more clients across 9 platforms.',
  },
  {
    target: '[data-tour="dashboard-kpis"]',
    route: '/',
    placement: 'bottom',
    title: 'Live Metrics',
    content:
      'Hot leads, pipeline value, response rates — all clickable. Click any card to jump straight to the filtered lead list.',
  },
  {
    target: '[data-tour="sidebar-nav"]',
    route: '/',
    placement: 'right',
    title: 'Navigation',
    content:
      'Your cockpit. Get Leads launches searches, Leads is your pipeline, Tools has 18 free utilities, and Profile + Settings configure everything.',
  },
  {
    target: '[data-tour="get-leads-platforms"]',
    route: '/get-leads',
    placement: 'bottom',
    title: 'Pick Your Platforms',
    content:
      'Select any of the 9 sources — Reddit, Craigslist, Upwork, Indeed, Hacker News and more. Your active config already has some selected.',
  },
  {
    target: '[data-tour="get-leads-launch"]',
    route: '/get-leads',
    placement: 'bottom',
    title: 'Launch a Search',
    content:
      'Hit Launch Search and your agents scan every selected platform sequentially. Watch live progress roll in the console.',
  },
  {
    target: '[data-tour="leads-view-switcher"]',
    route: '/leads',
    placement: 'bottom',
    title: 'Pipeline Views',
    content:
      'Toggle between List, Kanban and Split views to triage your leads the way you like.',
  },
  {
    target: '[data-tour="leads-reclassify"]',
    route: '/leads',
    placement: 'bottom',
    title: 'AI Reclassification',
    content:
      'One click re-ranks every lead Hot / Warm / Cold using your budget rules and keywords.',
  },
  {
    target: '[data-tour="profile-resume"]',
    route: '/profile',
    placement: 'bottom',
    title: 'Upload Your Resume',
    content:
      'The AI parses your skills, pricing, and tone — every draft reply becomes personalized and on-brand.',
  },
  {
    target: '[data-tour="profile-portfolio"]',
    route: '/profile',
    placement: 'bottom',
    title: 'Portfolio Projects',
    content:
      'Add past projects so the AI can reference real work when pitching to clients.',
  },
  {
    target: '[data-tour="settings-tabs"]',
    route: '/settings',
    placement: 'bottom',
    title: 'Configuration Center',
    content: (
      <>
        Everything you need lives here — <Strong>Presets</Strong> (search config),{' '}
        <Strong>Connection Center</Strong> (API keys), <Strong>Budget & Limits</Strong>,{' '}
        <Strong>AI Model</Strong>, and <Strong>Toggles</Strong>.
      </>
    ),
  },
  {
    target: '[data-tour="settings-keys-reddit"]',
    route: '/settings?tab=connections',
    placement: 'bottom',
    title: 'API Keys — Get Them Here',
    content: (
      <>
        Free keys for each platform:
        <br />
        <TourLink href="https://www.reddit.com/prefs/apps">Reddit Apps Portal</TourLink> ·
        <TourLink href="https://developer.adzuna.com/">Adzuna Developer Portal</TourLink> ·
        <TourLink href="https://mastodon.social/settings/applications">Mastodon App Settings</TourLink>.
        <br />
        <br />
        Upwork uses your private RSS feed — the orange feed icon on any job search.
      </>
    ),
  },
  {
    target: '[data-tour="settings-gmail-smtp"]',
    route: '/settings?tab=connections',
    placement: 'bottom',
    title: 'Gmail SMTP — Required for Maps Leads',
    content: (
      <>
        Needed to send outreach emails — including replies to <Strong>Google Maps leads</Strong>.
        Enable 2-Step Verification, then grab a 16-character{' '}
        <TourLink href="https://myaccount.google.com/apppasswords">App Password</TourLink> and paste
        your Gmail + password below.
        <br />
        <br />
        Also create <TourLink href="https://www.google.com/alerts">Google Alerts</TourLink> — the bot
        reads them automatically.
      </>
    ),
  },
  {
    target: '[data-tour="settings-limits"]',
    route: '/settings?tab=limits',
    placement: 'bottom',
    title: 'Budget & Limits',
    content: (
      <>
        <Strong>Budget Ranges</Strong> power the Hot / Warm / Cold ranking,{' '}
        <Strong>Rate Limits</Strong> keep scrapers polite, and <Strong>Keyword Rules</Strong> boost
        or block leads.
      </>
    ),
  },
  {
    target: '[data-tour="settings-ai"]',
    route: '/settings?tab=ai',
    placement: 'bottom',
    title: 'AI Model',
    content:
      'Pick your provider and model — OpenRouter, Mistral, Llama, Gemma — plus rate limits for ranking leads and drafting replies.',
  },
  {
    target: '[data-tour="settings-toggles"]',
    route: '/settings?tab=toggles',
    placement: 'bottom',
    title: 'Toggles & Reminders',
    content: (
      <>
        Fine-tune app behaviors. If you ever need this tour again, hit{' '}
        <Strong>Replay Tour</Strong> right below.
      </>
    ),
  },
  {
    target: '[data-tour="settings-save"]',
    route: '/settings',
    placement: 'bottom',
    title: 'Save All',
    content: (
      <>
        Nothing is persisted until you hit <Strong>Save All</Strong> — do not forget, it is the last
        step before your config goes live.
      </>
    ),
  },
  {
    target: '[data-tour="tools-grid"]',
    route: '/tools',
    placement: 'bottom',
    title: '18 Free Utilities',
    content:
      'Word counter, QR generator, JSON formatter, ATS resume checker, invoice generator and more — no signup, no cloud.',
  },
  {
    target: 'body',
    placement: 'center',
    title: "You're all set!",
    content: (
      <>
        Scrape leads, rank them with AI, and draft replies from your resume. Explore at your own
        pace — this tour is always one click away in <Strong>Settings → Toggles</Strong> or the{' '}
        <Strong>"?" button</Strong> up top.
      </>
    ),
  },
]