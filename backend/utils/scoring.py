import re
from typing import Optional, Dict, List, Tuple

# ── Weight configuration ──
DIMENSION_WEIGHTS = {
    'transaction': 0.35,
    'concreteness': 0.25,
    'budget': 0.25,
    'contact': 0.15,
}

RANK_THRESHOLDS = [
    ('Hot', 70),
    ('Warm', 40),
    ('Cold', 15),
]

SPAM_PENALTY_FORCE = 0.70

# ── Transaction Intent: Positive signals (job/gig/opportunity) ──
TRANSACTION_POSITIVE: List[Tuple[str, int]] = [
    # Hiring / Recruitment
    (r'\bhiring\b', 25), (r'\bhired\b', 15), (r'\bhire\b', 20),
    (r'\bwe (?:are\s+)?(?:looking|searching|seeking|hiring)\b', 28),
    (r'\b(?:looking|searching|seeking)\s+for\b', 20),
    (r'\bneed\s+(?:a|an|someone|somebody)\b', 18), (r'\bneeds\s+(?:a|an)\b', 14),
    (r'\bposition\b', 15), (r'\bpositions?\b', 12),
    (r'\broles?\b', 12),
    (r'\bjobs?\b', 15), (r'\bjob\s+open(?:ing|s)?\b', 22), (r'\bvacanc(?:y|ies)\b', 16),
    (r'\bopportunit(?:y|ies)\b', 14),
    (r'\bcandidates?\b', 15), (r'\bapply\b', 10), (r'\bapplication\b', 8),
    (r'\bresume\b', 10), (r'\bCV\b', 8), (r'\binterview\b', 10),
    (r'\brecrui(?:t|ting)\b', 15),
    (r'\bwork\s+with\s+(?:us|me|our)\b', 15),

    # Work arrangement
    (r'\bfull[-\s]?time\b', 12), (r'\bpart[-\s]?time\b', 10),
    (r'\bremote\b', 8), (r'\bon[-\s]?site\b', 6), (r'\bhybrid\b', 6),
    (r'\bcontract\b', 12), (r'\bcontractor\b', 10),
    (r'\bfreelance\b', 15), (r'\bfreelancer\b', 12),

    # Project / Work
    (r'\bproject\b', 12), (r'\bprojects\b', 10),
    (r'\bwebsite\b', 10), (r'\bweb[-\s]?app\b', 12), (r'\bapplication\b', 8),
    (r'\bplatform\b', 8),
    (r'\bbuild\b', 10), (r'\bdevelop\b', 12), (r'\bcreate\b', 8), (r'\bdesign\b', 8),
    (r'\blaunch\b', 10), (r'\bdeliver\b', 10), (r'\bimplement\b', 10),
    (r'\bmvp\b', 8), (r'\bprototype\b', 6),

    # Budget / Compensation
    (r'\bbudget\b', 15), (r'\bbudgeted\b', 12),
    (r'\bpaid\b', 15), (r'\bpay\b', 10), (r'\bpayment\b', 12), (r'\bpaying\b', 12),
    (r'\bcompensation\b', 15), (r'\bsalary\b', 15), (r'\brates?\b', 10),
    (r'\bhourly\b', 12), (r'\bmonthly\b', 8), (r'\bannual\b', 10), (r'\byearly\b', 10),
    (r'\bstipend\b', 10), (r'\bcommission\b', 8),
    (r'\bfixed[- ]?price\b', 12), (r'\bper hour\b', 10),

    # Requirements / Qualifications
    (r'\brequirements?\b', 10), (r'\bqualifications?\b', 10),
    (r'\bexperience\b', 8), (r'\bmust have\b', 12), (r'\bnice to have\b', 10),
    (r'\btechnic[ao]l?\s+skills?\b', 8), (r'\btech stack\b', 10),
    (r'\bstacks?\b', 6),
    (r'\bresponsibilities\b', 10),
    (r'\b(?:min(?:imum)?|preferred|required)\s+(?:qualifications?|requirements?|experience)\b', 12),

    # Service / Client
    (r'\bclient\b', 10), (r'\bclients\b', 8),
    (r'\bservice\b', 6), (r'\bservices\b', 8),
    (r'\bquote\b', 8), (r'\bproposal\b', 10),

    # Internship / Entry level
    (r'\binternship\b', 15), (r'\bintern\b', 12),
    (r'\bjunior\b', 8), (r'\bsenior\b', 8), (r'\bmid.level\b', 8), (r'\blead\b', 6),
    (r'\bentry.level\b', 8),

    # Company / Org signals
    (r'\bteam\b', 6), (r'\bcompan(?:y|ies)\b', 8), (r'\bstartup\b', 10), (r'\bagenc(?:y|ies)\b', 8),
    (r'\bwe (?:need|want|are looking)\b', 16),
    (r'\bjoin our\b', 12),

    # Post type classification
    (r'\b(?:for|in)\s+hire\b', 18),
    (r'\b(?:help\s+)?wanted\b', 14),
]

TRANSACTION_NEGATIVE: List[Tuple[str, int]] = [
    # Direct questions
    (r'\bhow\s+(?:do|can|would|to|could|does)\b', -20),
    (r'\bwhat\s+(?:is|are|does|do|would|will)\b', -15),
    (r'\bwhy\s+(?:is|does|do|are|would|did)\b', -14),
    (r'\bwhen\s+(?:do|does|did|will|can)\b', -12),
    (r'\bwhere\s+(?:do|does|can|should)\b', -12),

    # Asking community
    (r'\bcan\s+(?:someone|anybody|anyone)\b', -22),
    (r'\bdoes\s+(?:anyone|anybody)\b', -18),
    (r'\bhas\s+(?:anyone|anybody)\b', -14),
    (r'\bwould\s+(?:anyone|anybody)\b', -14),
    (r'\bdoes\s+anyone\s+(?:know|have|use)\b', -18),
    (r'\banyone\s+(?:know|tried|used|have|has)\b', -14),

    # Tutorial / Learning
    (r'\btutorial\b', -16), (r'\bguide\b', -10), (r'\bwalkthrough\b', -10),
    (r'\blearn(?:ing)?\b', -12), (r'\bstudy(?:ing)?\b', -8),
    (r'\bbeginner\b', -14), (r'\bgetting started\b', -14), (r'\bjust started\b', -12),
    (r'\bcourse\b', -10), (r'\bcourses?\b', -8),
    (r'\bcertification\b', -8), (r'\bcertificate\b', -6),

    # Help requests
    (r'\bhelp\s+(?:me|with|out)\b', -22), (r'\bplease\s+help\b', -18),
    (r'\b(?:some)?help\s+needed\b', -15),
    (r'\b(?:i\'?m\s+|i\s+am\s+)stuck\b', -14),
    (r'\b(?:having|run into|ran into)\s+(?:an?\s+)?(?:issue|problem)\b', -14),

    # Advice / Opinion
    (r'\badvice\b', -16), (r'\bsuggestion\b', -12),
    (r'\bopinion\b', -10), (r'\bthoughts?\b', -8),
    (r'\brecommend(?:ation)?\b', -14),
    (r'\bany\s+(?:advice|suggestions?|recommendations?)\b', -18),
    (r'\bwhat\s+(?:do|would)\s+you\s+(?:think|recommend|suggest)\b', -16),

    # Comparison / Evaluation
    (r'\b(?:better|worse)\s+than\b', -8), (r'\bvs?\b', -6), (r'\bversus\b', -6),
    (r'\breview\b', -8), (r'\breviews\b', -6),
    (r'\bis\s+it\s+worth\b', -14), (r'\bworth\s+it\b', -12),

    # Should I / Am I
    (r'\bshould\s+i\b', -14), (r'\bshould\s+we\b', -10),
    (r'\bam\s+i\b', -10),
    (r'\bcan\s+i\b', -8),

    # Personal journey
    (r'\bi(?:.ve|\'?ve)?\s+(?:want|wanted|would\s+like)\s+to\s+(?:learn|understand|know|start)\b', -16),
    (r'\bi[`\']?m\s+(?:new|beginner)\b', -14),
    (r'\bnew\s+(?:to|at)\s+(?:this|programming|coding|development)\b', -12),

    # Problem / Debug
    (r'\b(?:problem|issue|trouble)\s+with\b', -10),
    (r'\bnot\s+working\b', -10), (r'\bdoesn[`\']?t\s+work\b', -10),
    (r'\berror\b', -6), (r'\bbug\b', -6), (r'\bcrash(?:es|ed)?\b', -6),
    (r'\bfix\b', -6), (r'\bdebug\b', -8),

    # Curiosity / Explanation
    (r'\bexplain\b', -10), (r'\bunderstanding?\b', -6),
    (r'\bdifference\s+between\b', -10),
    (r'\bexample\b', -6), (r'\bexamples\b', -6),

    # Assessment
    (r'\bis\s+there\s+(?:a|any)\b', -8),
    (r'\bis\s+it\s+(?:possible|good|bad|worth)\b', -10),
    (r'\bwhat\s+(?:would|should)\s+i\b', -12),
]

TECH_KEYWORDS: List[str] = [
    'python', 'javascript', 'typescript', 'js', 'ts',
    'react', 'react.js', 'reactjs', 'angular', 'vue', 'vue.js', 'svelte', 'nextjs', 'nuxt',
    'node', 'nodejs', 'express', 'django', 'flask', 'fastapi', 'laravel', 'symfony',
    'ruby', 'rails', 'ruby on rails', 'php', 'perl',
    'go', 'golang', 'rust', 'swift', 'kotlin', 'java', 'scala',
    'c#', 'csharp', '.net', 'dotnet', 'asp.net', 'blazor', 'xamarin',
    'c++', 'cpp', 'c', 'objective-c',
    'html', 'css', 'sass', 'scss', 'less', 'tailwind', 'bootstrap', 'mui', 'chakra',
    'wordpress', 'shopify', 'woocommerce', 'webflow', 'wix', 'squarespace', 'drupal', 'joomla',
    'sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'mariadb',
    'mongodb', 'mongo', 'redis', 'cassandra', 'dynamodb', 'firestore',
    'graphql', 'rest', 'rest api', 'api', 'grpc', 'websocket',
    'aws', 'azure', 'gcp', 'google cloud', 'digitalocean', 'linode', 'vultr',
    'heroku', 'netlify', 'vercel', 'firebase', 'supabase',
    'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'puppet', 'chef',
    'ci/cd', 'github actions', 'gitlab ci', 'jenkins', 'circleci',
    'git', 'github', 'gitlab', 'bitbucket',
    'linux', 'ubuntu', 'debian', 'centos', 'nginx', 'apache', 'caddy',
    'machine learning', 'ml', 'ai', 'artificial intelligence',
    'openai', 'gpt', 'chatgpt', 'llm', 'langchain', 'tensorflow', 'pytorch',
    'data science', 'data engineering', 'data pipeline',
    'devops', 'sre', 'infrastructure', 'cloud',
    'mobile', 'ios', 'android', 'flutter', 'react native', 'swiftui',
    'ui/ux', 'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator',
    'testing', 'jest', 'cypress', 'playwright', 'selenium', 'pytest',
    'agile', 'scrum', 'kanban', 'jira', 'confluence',
    'blockchain', 'web3', 'solidity', 'smart contract', 'nft',
    'security', 'cybersecurity', 'penetration testing', 'pentest',
    'erp', 'crm', 'salesforce', 'sap', 'oracle',
]

TIMELINE_PATTERNS: List[str] = [
    r'\basap\b', r'\burgent\b', r'\bimmediately\b', r'\bquickly\b',
    r'\bby\s+(?:next|this|coming|end\s+of)\b',
    r'\bby\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
    r'\bwithin\s+\d+\s*(?:day|days|week|weeks|month|months)\b',
    r'\bdeadline\b', r'\bdue\s+date\b', r'\btimeframe\b',
    r'\btimeline\b', r'\bturnaround\b',
    r'\bin\s+\d+\s*(?:day|days|week|weeks|month|months)\b',
    r'\bthis\s+week\b', r'\bnext\s+week\b', r'\bthis\s+month\b', r'\bnext\s+month\b',
    r'\b(?:in\s+)?the\s+next\s+\d+\s*(?:day|days|week|weeks)\b',
    r'\b(?:by|before)\s+\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?\b',
]

DELIVERABLE_PATTERNS: List[str] = [
    r'\bbuild\b', r'\bcreate\b', r'\bdevelop\b', r'\bdesign\b',
    r'\bimplement\b', r'\blaunch\b', r'\bdeploy\b',
    r'\bmigrate\b', r'\bintegrate\b', r'\bconfigure\b',
    r'\bset\s*up\b', r'\bwrite\b', r'\bcode\b', r'\bprogram\b',
    r'\barchitect\b', r'\brestructure\b', r'\brefactor\b',
    r'\boptimize\b', r'\bredesign\b', r'\brebuild\b',
    r'\bautomate\b', r'\bscrape\b', r'\bextract\b',
    r'\bmaintain\b', r'\bimprove\b', r'\brevamp\b', r'\brewrite\b',
    r'\b(?:re)?model\b', r'\btransform\b',
    r'\bcustomize?\b', r'\bpersonalize?\b',
]

BUDGET_PATTERNS: List[Tuple[str, int]] = [
    # Specific currency amounts (high value)
    (r'[\$€£¥₹₽]?\s*\d{2,6}\s*(?:[kKmMbB][bB]?)?', 10),
    (r'(?:USD|EUR|GBP|MAD|INR|AUD|CAD|AED|CHF|JPY|CNY)\s*\d+', 15),
    # Budget ranges
    (r'\$?\d{2,6}\s*[-–to]+\s*\$?\d{2,6}', 15),
    (r'(?:between|from)\s+\$?\d+\s+(?:and|to)\s+\$?\d+', 15),
    # Explicit budget words
    (r'\bbudget\b', 12), (r'\bbudgeted\b', 10),
    (r'\bpaid\b', 14), (r'\bpay\b', 10), (r'\bpayment\b', 12), (r'\bpaying\b', 10),
    (r'\bcompensation\b', 14), (r'\bsalary\b', 14), (r'\brate\b', 8), (r'\brates\b', 8),
    (r'\bhourly\b', 10), (r'\bdaily\b', 8), (r'\bweekly\b', 8),
    (r'\bmonthly\b', 8), (r'\bannual\b', 10), (r'\byearly\b', 10),
    (r'\bfixed[- ]?price\b', 12), (r'\bper hour\b', 8),
    (r'\bstipend\b', 10), (r'\bcommission\b', 8), (r'\bbounty\b', 10),
    (r'\bdollars?\b', 10), (r'\beuros?\b', 10), (r'\bpounds?\b', 10),
    (r'\$?\d+\s*[-–]+\s*\$?\d+\s*/\s*(?:hour|hr|month|mo|year|yr|project|week|wk|day)', 18),
    # No-budget signals (negative)
    (r'\b(?:free|cheap|inexpensive|low[- ]?cost|affordable)\b', -8),
    (r'\b(?:unpaid|volunteer|pro\s+bono|for\s+exposure)\b', -12),
]

CONTACT_PATTERNS: List[Tuple[str, int]] = [
    (r'\bemail\b', 8), (r'\b@\w+\.\w+\b', 12),
    (r'\bphone\b', 8), (r'\bcall\b', 6), (r'\btext\b', 6), (r'\bwhatsapp\b', 10), (r'\bsms\b', 6),
    (r'\bdm\b', 8), (r'\bmessage\s+me\b', 10), (r'\bpm\s+me\b', 8), (r'\binbox\s+me\b', 8),
    (r'\bapply\b', 8), (r'\bsubmit\b', 8), (r'\bsend\s+(?:your|me|us)\b', 8),
    (r'\bsign\s+up\b', 8), (r'\bregister\b', 8), (r'\bfill\s+out\b', 8),
    (r'\bschedule\b', 8), (r'\bmeeting\b', 8),
    (r'\bzoom\b', 8), (r'\bgoogle\s+meet\b', 8), (r'\bteams?\b', 6),
    (r'\bportfolio\b', 8), (r'\bgithub\b', 8), (r'\blinkedin\b', 8), (r'\bupwork\b', 8),
    (r'\bcontact\b', 6), (r'\bget\sin\s+touch\b', 8), (r'\breach\s+out\b', 6),
    (r'\bvisit\b', 4), (r'\blearn\s+more\b', 4),
    (r'\bapply\s+(?:here|now|today)\b', 10),
    (r'https?://\S+', 6),
    (r'\bdiscord\b', 6), (r'\bslack\b', 6), (r'\btelegram\b', 6),
]

SPAM_PATTERNS: List[str] = [
    r'(.)\1{4,}', r'\blorem\s+ipsum\b',
    r'\bclick\s+here\b', r'\bbuy\s+now\b', r'\bact\s+now\b',
    r'\blimited\s+time\b', r'\boffer\s+expires\b',
    r'\bcongratulations\b', r'\bwinner\b', r'\bwon\b',
    r'\blottery\b', r'\bprize\b',
    r'\binvestment\s+opportunity\b', r'\bget\s+rich\b',
    r'\bviagra\b', r'\bcialis\b', r'\bpharmacy\b',
    r'\bcasino\b', r'\bgambling\b', r'\bbetting\b',
    r'\b(?:free|earn|make)\s+money\b',
    r'\bno\s+experience\s+needed\b', r'\bwork\s+from\s+home\s+(?:and\s+)?earn\b',
    r'\bclick\s+the\s+link\b', r'\blink\s+below\b',
    r'\bsubscribe\b', r'\bfollow\s+me\b', r'\bcheck\s+out\s+my\b',
]

QUESTION_START_PATTERN = re.compile(r'^\s*(?:how|what|why|when|where|which|who|does|can|should|would|could|is|are|do)\b', re.IGNORECASE)
QUESTION_END_PATTERN = re.compile(r'\?\s*$')

# ── Helpers ──

def _count_matched_weight(text: str, patterns: List[Tuple[str, int]]) -> int:
    total = 0
    for pattern, weight in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            total += weight
    return total


def _count_pattern_matches(text: str, patterns: List[str]) -> int:
    count = 0
    for pattern in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            count += 1
    return count


def _count_tech_keywords(text: str) -> int:
    count = 0
    for kw in TECH_KEYWORDS:
        if re.search(r'\b' + re.escape(kw) + r'\b', text, re.IGNORECASE):
            count += 1
    return count


def _is_question(title: str, text: str) -> bool:
    t = text.strip()
    if not t:
        return False
    if QUESTION_END_PATTERN.search(t):
        return True
    if QUESTION_START_PATTERN.match(title.strip()):
        return True
    return False


# ── Dimension Scorers ──

def _score_transaction_intent(text: str) -> float:
    positive = _count_matched_weight(text, TRANSACTION_POSITIVE)
    negative = _count_matched_weight(text, TRANSACTION_NEGATIVE)
    return max(-100.0, min(100.0, float(positive + negative)))


def _score_concreteness(title: str, description: str) -> float:
    text = f"{title} {description}" if description else title
    desc = description or ''
    score = 0.0

    tech_count = _count_tech_keywords(text)
    score += min(tech_count * 5, 35)

    tl_count = _count_pattern_matches(text, TIMELINE_PATTERNS)
    score += min(tl_count * 8, 24)

    del_count = _count_pattern_matches(text, DELIVERABLE_PATTERNS)
    score += min(del_count * 4, 20)

    desc_len = len(desc)
    if desc_len > 800:
        score += 15
    elif desc_len > 400:
        score += 12
    elif desc_len > 200:
        score += 8
    elif desc_len > 100:
        score += 5
    elif desc_len > 50:
        score += 2

    if re.search(r'[•\-*]\s', desc): score += 6
    if re.search(r'^\d+\.', desc, re.MULTILINE): score += 4
    if re.search(r'\d+', desc): score += 3

    title_len = len(title or '')
    if title_len > 60: score += 4
    elif title_len > 30: score += 2

    return min(score, 100.0)


def _score_budget(text: str, budget_min: Optional[float], budget_max: Optional[float]) -> float:
    score = 0.0

    if budget_max is not None and budget_max > 0:
        if budget_max >= 50000: score += 65
        elif budget_max >= 10000: score += 55
        elif budget_max >= 5000: score += 45
        elif budget_max >= 1000: score += 35
        elif budget_max >= 500: score += 25
        elif budget_max >= 100: score += 15
        else: score += 5
    elif budget_min is not None and budget_min > 0:
        if budget_min >= 5000: score += 35
        elif budget_min >= 1000: score += 25
        elif budget_min >= 100: score += 15
        else: score += 5

    text_score = _count_matched_weight(text, BUDGET_PATTERNS)
    score += text_score

    return max(0.0, min(100.0, score))


def _score_contact(text: str) -> float:
    score = float(_count_matched_weight(text, CONTACT_PATTERNS))
    return min(100.0, score)


def _compute_penalty(title: str, description: str) -> float:
    text = f"{title} {description}" if description else (title or '')
    penalty = 0.0

    spam_count = _count_pattern_matches(text, SPAM_PATTERNS)
    penalty += spam_count * 0.12

    stripped = text.strip()
    length = len(stripped)
    if length < 30:
        penalty += 0.55
    elif length < 60:
        penalty += 0.35
    elif length < 100:
        penalty += 0.15
    elif length < 150:
        penalty += 0.05

    if title and len(title) > 5:
        caps = sum(1 for c in title if c.isupper())
        if caps / len(title) > 0.55:
            penalty += 0.20

    if re.search(r'[!?]{3,}', text): penalty += 0.12
    if re.search(r'\.{4,}', text): penalty += 0.08
    if re.search(r'(.)\1{4,}', text): penalty += 0.25

    words = stripped.split()
    if len(words) < 5:
        penalty += 0.45
    elif len(words) < 10:
        penalty += 0.20
    elif len(words) < 15:
        penalty += 0.08

    if _is_question(title, stripped):
        transaction = _score_transaction_intent(text)
        if transaction < 0:
            penalty += 0.25

    return min(penalty, 1.0)


# ── Main scoring API ──

def score_lead(
    title: str,
    description: str,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
) -> Dict[str, float]:
    text = f"{title} {description}" if description else title

    transaction = _score_transaction_intent(text)
    concreteness = _score_concreteness(title, description)
    budget = _score_budget(text, budget_min, budget_max)
    contact = _score_contact(text)
    penalty = _compute_penalty(title, description)

    raw = (
        max(transaction, 0) * DIMENSION_WEIGHTS['transaction']
        + concreteness * DIMENSION_WEIGHTS['concreteness']
        + budget * DIMENSION_WEIGHTS['budget']
        + contact * DIMENSION_WEIGHTS['contact']
    )

    total = raw * (1.0 - penalty)

    return {
        'total': round(total, 1),
        'transaction': round(transaction, 1),
        'concreteness': round(concreteness, 1),
        'budget': round(budget, 1),
        'contact': round(contact, 1),
        'penalty': round(penalty, 3),
    }


def score_to_rank(score: Dict[str, float]) -> str:
    if score['penalty'] >= SPAM_PENALTY_FORCE:
        return 'Spam'
    total = score['total']
    for rank, threshold in RANK_THRESHOLDS:
        if total >= threshold:
            return rank
    return 'Unknown'


def classify_lead(
    title: str,
    description: str,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
) -> Tuple[str, Dict[str, float]]:
    score = score_lead(title, description, budget_min, budget_max)
    rank = score_to_rank(score)
    return rank, score
