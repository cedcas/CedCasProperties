#!/usr/bin/env python3
"""
Generate the HavenInLipa Keyword Tracking Workbook (Excel).
Source: May 8, 2026 Full SEO Strategy Report + Articles 13 & 14.
Output: content for HavenInLipa/HavenInLipa_Keyword_Tracker.xlsx
"""

import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

BASE_DIR = "/Volumes/Files and Cloud/Dropbox/VSCode (non-Git)/seo"
OUTPUT_DIR = os.path.join(BASE_DIR, "content for HavenInLipa")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "HavenInLipa_Keyword_Tracker.xlsx")

# Brand colors (NetCoreSolutions)
CORAL = "FF5371"
FOREST_GREEN = "3B5323"
LIGHT_CORAL = "FFE4E9"
LIGHT_GREEN = "E8EFE0"
GRAY = "F2F2F2"
DARK_TEXT = "2C2C2C"
WHITE = "FFFFFF"
HIGH = "D93B3B"
MED = "E88A1A"
LOW = "0D8A4E"

THIN = Side(border_style="thin", color="CCCCCC")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def style_header(cell, fill=CORAL, color=WHITE):
    cell.font = Font(name="Calibri", bold=True, color=color, size=11)
    cell.fill = PatternFill("solid", fgColor=fill)
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = BORDER


def style_body(cell, bold=False, fill=None, color=DARK_TEXT, align="left"):
    cell.font = Font(name="Calibri", bold=bold, color=color, size=10)
    if fill:
        cell.fill = PatternFill("solid", fgColor=fill)
    cell.alignment = Alignment(horizontal=align, vertical="center", wrap_text=True)
    cell.border = BORDER


def style_title(cell, size=16, color=CORAL):
    cell.font = Font(name="Calibri", bold=True, color=color, size=size)
    cell.alignment = Alignment(horizontal="left", vertical="center")


def style_subtitle(cell, color=FOREST_GREEN):
    cell.font = Font(name="Calibri", bold=True, italic=True, color=color, size=11)
    cell.alignment = Alignment(horizontal="left", vertical="center")


def priority_fill(value):
    v = str(value).strip().lower()
    if v == "high":
        return HIGH, WHITE
    if v == "medium":
        return MED, WHITE
    if v == "low":
        return LOW, WHITE
    return None, DARK_TEXT


def set_column_widths(ws, widths):
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w


# ---------------------------------------------------------------------------
# DATA
# ---------------------------------------------------------------------------

HEADERS = [
    "Keyword / Keyphrase",
    "Cluster",
    "Search Intent",
    "Priority",
    "Target URL / Page",
    "Status",
    "GSC Tracked? (Y/N)",
    "Current Avg. Position",
    "Impressions (28d)",
    "Clicks (28d)",
    "CTR %",
    "Last Reviewed",
    "Notes",
]

# Cluster, Keyword, Intent, Priority, Target Page, Status
KEYWORDS = [
    # Cluster 1
    ("Cluster 1 - Short-Term Rentals", "short term rental lipa city", "Transactional", "High", "/ (Homepage)", "Partial - homepage"),
    ("Cluster 1 - Short-Term Rentals", "vacation rental lipa batangas", "Transactional", "High", "/ + Property pages", "Partial"),
    ("Cluster 1 - Short-Term Rentals", "airbnb alternative lipa", "Transactional", "High", "/blog/why-book-direct-vs-airbnb", "Covered - Article #6"),
    ("Cluster 1 - Short-Term Rentals", "affordable staycation lipa", "Transactional", "High", "/ (Homepage)", "Partial"),
    ("Cluster 1 - Short-Term Rentals", "direct booking lipa city", "Commercial", "Medium", "/blog/why-book-direct-vs-airbnb", "Covered - Article #6"),
    ("Cluster 1 - Short-Term Rentals", "full house rental lipa", "Transactional", "High", "/properties/mickey-in-lipa", "NEW - Article #13"),
    ("Cluster 1 - Short-Term Rentals", "family house rental lipa city", "Transactional", "High", "/properties/mickey-in-lipa", "NEW - Article #13"),

    # Cluster 2
    ("Cluster 2 - Things to Do in Lipa", "things to do in lipa city", "Informational", "High", "/blog/things-to-do-lipa-city", "Covered - Article #1"),
    ("Cluster 2 - Things to Do in Lipa", "lipa city tourist spots", "Informational", "High", "/blog/things-to-do-lipa-city", "Covered - Article #1"),
    ("Cluster 2 - Things to Do in Lipa", "lipa batangas attractions", "Informational", "Medium", "/blog/things-to-do-lipa-city", "Covered - Article #1"),
    ("Cluster 2 - Things to Do in Lipa", "mt maculot hiking guide", "Informational", "Medium", "/blog/mt-maculot-hiking-guide", "Covered - Article #4"),
    ("Cluster 2 - Things to Do in Lipa", "taal volcano day trip from lipa", "Informational", "Medium", "/blog/taal-volcano-day-trip", "Covered - Article #7"),

    # Cluster 3
    ("Cluster 3 - Weekend Getaway / Audience", "weekend getaway near manila", "Mixed", "High", "/blog/weekend-getaway-lipa", "Covered - Article #3"),
    ("Cluster 3 - Weekend Getaway / Audience", "staycation batangas", "Mixed", "High", "Multiple articles", "Partial"),
    ("Cluster 3 - Weekend Getaway / Audience", "family staycation lipa", "Commercial", "High", "/blog/family-staycation-lipa", "Covered - Article #11"),
    ("Cluster 3 - Weekend Getaway / Audience", "family-friendly rental lipa city", "Commercial", "High", "/blog/family-staycation-lipa", "Covered - Article #11"),
    ("Cluster 3 - Weekend Getaway / Audience", "weekend getaway with kids near manila", "Commercial", "High", "/blog/family-staycation-lipa", "Covered - Article #11"),
    ("Cluster 3 - Weekend Getaway / Audience", "kid-friendly batangas", "Informational", "Medium", "/blog/family-staycation-lipa", "Covered - Article #11"),
    ("Cluster 3 - Weekend Getaway / Audience", "romantic getaway batangas", "Commercial", "High", "/blog/romantic-getaway-batangas", "Covered - Article #12"),
    ("Cluster 3 - Weekend Getaway / Audience", "couple retreat lipa", "Commercial", "High", "/blog/romantic-getaway-batangas", "Covered - Article #12"),
    ("Cluster 3 - Weekend Getaway / Audience", "honeymoon batangas", "Commercial", "Medium", "/blog/romantic-getaway-batangas", "Covered - Article #12"),
    ("Cluster 3 - Weekend Getaway / Audience", "anniversary getaway near manila", "Commercial", "Medium", "/blog/romantic-getaway-batangas", "Covered - Article #12"),
    ("Cluster 3 - Weekend Getaway / Audience", "family weekend batangas", "Commercial", "High", "/blog/family-weekend-batangas-without-beach-crowds", "NEW - Article #14"),
    ("Cluster 3 - Weekend Getaway / Audience", "weekend near manila with family", "Commercial", "High", "/blog/family-weekend-batangas-without-beach-crowds", "NEW - Article #14"),
    ("Cluster 3 - Weekend Getaway / Audience", "batangas without beach crowds", "Informational", "Medium", "/blog/family-weekend-batangas-without-beach-crowds", "NEW - Article #14"),
    ("Cluster 3 - Weekend Getaway / Audience", "barkada group trip lipa", "Commercial", "Medium", "TBD - Tier C article", "Gap"),
    ("Cluster 3 - Weekend Getaway / Audience", "holy week getaway lipa", "Seasonal", "Medium", "/blog/holy-week-getaway-lipa", "Covered - Article #8 (re-frame evergreen)"),
    ("Cluster 3 - Weekend Getaway / Audience", "remote work staycation philippines", "Commercial", "Medium", "/blog/remote-work-staycation-lipa", "Covered - Article #9"),
    ("Cluster 3 - Weekend Getaway / Audience", "summer in lipa 2026", "Seasonal", "Medium", "TBD - Seasonal LP", "Gap"),
    ("Cluster 3 - Weekend Getaway / Audience", "senior-friendly lipa getaway", "Commercial", "Low", "TBD - Tier D", "Gap"),
    ("Cluster 3 - Weekend Getaway / Audience", "solo travel guide to lipa", "Informational", "Low", "TBD - Tier D", "Gap"),

    # Cluster 4
    ("Cluster 4 - Travel Planning & Logistics", "best restaurants in lipa", "Informational", "High", "/blog/best-restaurants-lipa", "Covered - Article #5"),
    ("Cluster 4 - Travel Planning & Logistics", "lipa city travel guide", "Informational", "High", "Multiple articles", "Partial"),
    ("Cluster 4 - Travel Planning & Logistics", "how to get to lipa from manila", "Informational", "Medium", "/blog/how-to-get-to-lipa-from-manila", "Drafted - publish (currently 404)"),
    ("Cluster 4 - Travel Planning & Logistics", "batangas road trip itinerary", "Informational", "Medium", "TBD - Tier C hub article", "Gap"),
    ("Cluster 4 - Travel Planning & Logistics", "lipa city food trip", "Informational", "Medium", "/blog/best-restaurants-lipa", "Sub-topic of Article #5"),
    ("Cluster 4 - Travel Planning & Logistics", "lipa family itinerary", "Informational", "Medium", "/blog/family-weekend-batangas-without-beach-crowds", "NEW - Article #14"),

    # Cluster 5
    ("Cluster 5 - Direct Booking & Value", "book direct vs airbnb", "Commercial", "High", "/blog/why-book-direct-vs-airbnb", "Covered - Article #6"),
    ("Cluster 5 - Direct Booking & Value", "save on vacation rental fees", "Commercial", "Medium", "/blog/why-book-direct-vs-airbnb", "Covered - Article #6"),
    ("Cluster 5 - Direct Booking & Value", "why book direct accommodation", "Commercial", "Medium", "/blog/why-book-direct-vs-airbnb", "Covered - Article #6"),
    ("Cluster 5 - Direct Booking & Value", "vacation rental no service fee", "Commercial", "Medium", "/blog/why-book-direct-vs-airbnb", "Partial"),

    # Cluster 6
    ("Cluster 6 - Branded / Property", "mickey in lipa", "Branded", "High", "/properties/mickey-in-lipa", "NEW - Article #13"),
    ("Cluster 6 - Branded / Property", "disney-inspired house lipa", "Commercial", "High", "/properties/mickey-in-lipa", "NEW - Article #13"),
    ("Cluster 6 - Branded / Property", "disney themed rental philippines", "Commercial", "Medium", "/properties/mickey-in-lipa", "NEW - Article #13"),
    ("Cluster 6 - Branded / Property", "bella vita lipa rental", "Local/Branded", "Medium", "/properties/mickey-in-lipa", "NEW - Article #13"),
    ("Cluster 6 - Branded / Property", "haven in lipa", "Branded SERP", "High", "/ (Homepage)", "Brand visibility tracking"),
]


# ---------------------------------------------------------------------------
# SHEET 1: README / How to Use
# ---------------------------------------------------------------------------

def build_readme(ws):
    ws.title = "README"
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 4
    ws.column_dimensions["B"].width = 110

    row = 2
    ws.cell(row=row, column=2, value="HavenInLipa Keyword Tracker")
    style_title(ws.cell(row=row, column=2), size=20, color=CORAL)
    ws.row_dimensions[row].height = 30
    row += 1
    ws.cell(row=row, column=2, value="Source: Full SEO Strategy Report (May 8, 2026) + Articles #13 & #14")
    style_subtitle(ws.cell(row=row, column=2))
    row += 1
    ws.cell(row=row, column=2, value="Prepared by NetCoreSolutions")
    style_subtitle(ws.cell(row=row, column=2), color=DARK_TEXT)
    row += 2

    sections = [
        ("Purpose", [
            "This workbook is the single source of truth for the keywords HavenInLipa is targeting.",
            "It is meant to be opened weekly (every Monday), updated from Google Search Console, and used to brief bloggers, editors, and the property team.",
        ]),
        ("What's in each sheet", [
            "1. README - This sheet. How to use the workbook.",
            "2. Keyword Master - The complete keyword list with cluster, intent, priority, target page, status, and tracking columns.",
            "3. Priority Focus (60-Day) - The short list of keywords to win in the next 60 days.",
            "4. GSC Setup Steps - Exact steps to track these keywords in Google Search Console.",
            "5. Blogger Brief - How the blogger should USE these keywords inside articles (no stuffing, no guessing).",
            "6. Tracking Log Template - Monthly snapshot template so you can see movement over time.",
        ]),
        ("Update cadence", [
            "Weekly (Mondays, ~20 min): Pull GSC data for the previous 7 days, paste the latest position/impressions/clicks into the Keyword Master sheet, update the Last Reviewed column.",
            "Monthly (1st of the month): Copy the Keyword Master snapshot into the Tracking Log sheet as 'YYYY-MM' so you can compare movement.",
            "Quarterly: Review priorities. Promote keywords that are climbing into priority focus; retire keywords that aren't gaining traction.",
        ]),
        ("Definitions (so the workbook stays consistent)", [
            "Priority - HIGH = drives bookings or brand discovery now. MEDIUM = supports clusters / mid-funnel. LOW = long-tail or future.",
            "Status - Covered = a published page targets this. Partial = mentioned but not optimized. Drafted = written but not live. Gap = no page exists yet.",
            "Intent - Transactional (ready to book), Commercial (comparing options), Informational (learning), Branded (looking for HavenInLipa specifically).",
        ]),
    ]

    for title, bullets in sections:
        ws.cell(row=row, column=2, value=title)
        style_subtitle(ws.cell(row=row, column=2), color=CORAL)
        row += 1
        for b in bullets:
            ws.cell(row=row, column=2, value="  - " + b)
            c = ws.cell(row=row, column=2)
            c.font = Font(name="Calibri", size=10)
            c.alignment = Alignment(wrap_text=True, vertical="top")
            ws.row_dimensions[row].height = 28
            row += 1
        row += 1


# ---------------------------------------------------------------------------
# SHEET 2: Keyword Master
# ---------------------------------------------------------------------------

def build_master(ws):
    ws.title = "Keyword Master"
    ws.sheet_view.showGridLines = False
    ws.freeze_panes = "A2"

    for i, h in enumerate(HEADERS, start=1):
        cell = ws.cell(row=1, column=i, value=h)
        style_header(cell)
    ws.row_dimensions[1].height = 38

    for r, (cluster, kw, intent, priority, target, status) in enumerate(KEYWORDS, start=2):
        ws.cell(row=r, column=1, value=kw)
        ws.cell(row=r, column=2, value=cluster)
        ws.cell(row=r, column=3, value=intent)
        ws.cell(row=r, column=4, value=priority)
        ws.cell(row=r, column=5, value=target)
        ws.cell(row=r, column=6, value=status)
        ws.cell(row=r, column=7, value="")   # GSC tracked
        ws.cell(row=r, column=8, value="")   # avg position
        ws.cell(row=r, column=9, value="")   # impressions
        ws.cell(row=r, column=10, value="")  # clicks
        ws.cell(row=r, column=11, value="")  # CTR
        ws.cell(row=r, column=12, value="")  # last reviewed
        ws.cell(row=r, column=13, value="")  # notes

        zebra = GRAY if r % 2 == 0 else WHITE
        for col in range(1, len(HEADERS) + 1):
            style_body(ws.cell(row=r, column=col), fill=zebra)

        # Priority pill
        fill, color = priority_fill(priority)
        if fill:
            p_cell = ws.cell(row=r, column=4)
            p_cell.font = Font(name="Calibri", bold=True, color=color, size=10)
            p_cell.fill = PatternFill("solid", fgColor=fill)
            p_cell.alignment = Alignment(horizontal="center", vertical="center")

        ws.row_dimensions[r].height = 28

    set_column_widths(ws, [34, 32, 14, 11, 38, 30, 14, 14, 14, 12, 10, 14, 36])


# ---------------------------------------------------------------------------
# SHEET 3: Priority Focus (60-Day)
# ---------------------------------------------------------------------------

PRIORITY_FOCUS = [
    ("1", "family staycation lipa", "Article #11 (live)", "Internal links from #1, #3, #5; refresh meta description; request indexing in GSC."),
    ("2", "romantic getaway batangas", "Article #12 (live)", "Add Tagaytay comparison schema; FAQ markup; cross-link from 1BR property page."),
    ("3", "book direct vs airbnb", "Article #6 (live)", "Add price comparison table; link from homepage and every property page footer."),
    ("4", "how to get to lipa from manila", "Article #10 (drafted, 404)", "PUBLISH this week. Will unlock long-tail logistics queries."),
    ("5", "things to do in lipa city", "Article #1 (live)", "Add Mt Maculot + Taal viewpoint as H2s; refresh image alt text."),
    ("6", "family weekend batangas", "Article #14 (NEW)", "Push for indexing; promote in HavenInLipa newsletter; link to 2BR property page."),
    ("7", "batangas without beach crowds", "Article #14 (NEW)", "Differentiator angle - low competition. Promote in Q3 when Laiya/Nasugbu traffic peaks."),
    ("8", "mickey in lipa", "Article #13 + new property page", "Build /properties/mickey-in-lipa with full content; capture early-access emails."),
    ("9", "disney-inspired house lipa", "Article #13", "Bid on Google Ads brand-protect; monitor SERP weekly."),
    ("10", "haven in lipa", "Homepage", "Brand SERP - confirm site shows for this query; if not, GSC -> Request indexing for homepage."),
]


def build_priority(ws):
    ws.title = "Priority Focus (60-Day)"
    ws.sheet_view.showGridLines = False
    ws.freeze_panes = "A2"

    headers = ["#", "Keyword / Keyphrase", "Target Page", "Next Action"]
    for i, h in enumerate(headers, start=1):
        style_header(ws.cell(row=1, column=i, value=h), fill=FOREST_GREEN)
    ws.row_dimensions[1].height = 32

    for r, row in enumerate(PRIORITY_FOCUS, start=2):
        for c, val in enumerate(row, start=1):
            ws.cell(row=r, column=c, value=val)
        zebra = LIGHT_GREEN if r % 2 == 0 else WHITE
        for col in range(1, len(headers) + 1):
            style_body(ws.cell(row=r, column=col), fill=zebra)
        ws.row_dimensions[r].height = 36

    set_column_widths(ws, [5, 36, 36, 70])


# ---------------------------------------------------------------------------
# SHEET 4: GSC Setup Steps
# ---------------------------------------------------------------------------

GSC_STEPS = [
    ("A. Verify HavenInLipa.com is added to Google Search Console", [
        "1. Go to https://search.google.com/search-console",
        "2. Sign in with the Google account that owns/manages HavenInLipa.com.",
        "3. Top-left -> property dropdown -> Add Property -> URL prefix -> enter https://haveninlipa.com",
        "4. Verify ownership: easiest is DNS TXT record (via your domain registrar) or HTML tag (paste into <head> of homepage).",
        "5. Once verified, also add the www. version if applicable, and select the preferred domain.",
    ]),
    ("B. Submit your sitemap", [
        "1. In GSC left sidebar -> Sitemaps.",
        "2. Enter: sitemap.xml (or /wp-sitemap.xml if WordPress) -> Submit.",
        "3. Confirm 'Success' status appears within 24-48 hours.",
        "4. If status is 'Couldn't fetch', publish a sitemap first (Yoast/RankMath generates one automatically in WordPress).",
    ]),
    ("C. Track these keywords in the Performance report", [
        "1. Left sidebar -> Performance -> Search results.",
        "2. Date range: set to 'Last 28 days'.",
        "3. Click '+ New' filter -> 'Query' -> 'Queries containing' -> paste a keyword from the Keyword Master sheet (e.g., 'family staycation lipa').",
        "4. Review Clicks, Impressions, CTR, and Average Position for that query.",
        "5. Copy those four numbers into the matching row in the Keyword Master sheet (columns H, I, J, K).",
        "6. Repeat for each HIGH-priority keyword every Monday. Medium-priority: every 2 weeks. Low: monthly.",
    ]),
    ("D. Request indexing for new articles (Articles #13, #14, #10)", [
        "1. Top of GSC -> URL Inspection bar -> paste the full article URL.",
        "2. If 'URL is not on Google' shows -> click 'Request Indexing'.",
        "3. Wait 1-3 days. Re-check the same URL to confirm 'URL is on Google'.",
        "4. Do this once per new article. Do NOT spam Request Indexing for the same URL repeatedly.",
    ]),
    ("E. Save a Queries view for fast weekly review", [
        "1. Performance -> Search results -> Apply your common filters (Country = Philippines, Device = Mobile, Date = 28 days).",
        "2. Bookmark the resulting URL in your browser. Open it every Monday.",
        "3. Export -> Excel -> opens a .xlsx with current query data. Use this to bulk-update the Keyword Master sheet.",
    ]),
    ("F. Watch for these red flags weekly", [
        "1. Average Position jumped backward by 5+ positions -> investigate the page (broken link, missing image, slow load).",
        "2. Impressions dropped 40%+ week-over-week -> check Coverage report for indexing errors.",
        "3. CTR is below 1% for a page ranking in top 10 -> rewrite the meta title and description.",
        "4. A keyword has impressions but 0 clicks for 4+ weeks -> rewrite the meta title; the SERP snippet is failing.",
    ]),
    ("G. Monthly: export and archive", [
        "1. End of each month, Performance -> Export -> Excel.",
        "2. Paste the snapshot into the 'Tracking Log Template' sheet as a new tab named 'YYYY-MM'.",
        "3. This builds your historical trend file. After 3 months you can see real movement.",
    ]),
]


def build_gsc(ws):
    ws.title = "GSC Setup Steps"
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 4
    ws.column_dimensions["B"].width = 120

    row = 2
    ws.cell(row=row, column=2, value="Google Search Console - Setup & Weekly Workflow")
    style_title(ws.cell(row=row, column=2), color=CORAL)
    ws.row_dimensions[row].height = 28
    row += 1
    ws.cell(row=row, column=2, value="Do steps A-B once. Steps C-G run on a recurring weekly/monthly cadence.")
    style_subtitle(ws.cell(row=row, column=2))
    row += 2

    for title, steps in GSC_STEPS:
        ws.cell(row=row, column=2, value=title)
        style_subtitle(ws.cell(row=row, column=2), color=CORAL)
        ws.row_dimensions[row].height = 22
        row += 1
        for s in steps:
            ws.cell(row=row, column=2, value=s)
            c = ws.cell(row=row, column=2)
            c.font = Font(name="Calibri", size=10)
            c.alignment = Alignment(wrap_text=True, vertical="top", indent=1)
            ws.row_dimensions[row].height = 28
            row += 1
        row += 1


# ---------------------------------------------------------------------------
# SHEET 5: Blogger Brief
# ---------------------------------------------------------------------------

BLOGGER_SECTIONS = [
    ("How to read this workbook before writing", [
        "1. Open the 'Keyword Master' sheet. Find the row(s) for the article you are about to write.",
        "2. Note the PRIMARY keyword (the keyword the article is titled around) and 2-4 SUPPORTING keywords from the same cluster.",
        "3. Note the SEARCH INTENT - this tells you what the reader expects to do/learn. Match the article's promise to that intent.",
        "4. Note the TARGET URL - this is the slug to publish under. Do not change it without checking with the SEO lead.",
    ]),
    ("Where each keyword goes in the article (use this checklist)", [
        "PRIMARY KEYWORD:",
        "  - In the H1 title (naturally - never forced).",
        "  - In the first 100 words of the intro.",
        "  - In the meta description (1 time, naturally).",
        "  - In the URL slug.",
        "  - In the featured image alt text.",
        "  - In at least one H2 heading (rephrased is fine).",
        "SUPPORTING KEYWORDS (2-4 per article):",
        "  - One in an H2 or H3 each, where the topic of that heading naturally calls for it.",
        "  - At least one in image alt text across the article.",
        "  - Spread naturally across body copy. If you have to twist a sentence, you have stuffed it - reword.",
    ]),
    ("The Golden Rules (read every time)", [
        "1. WRITE FOR HUMANS FIRST. Read every paragraph aloud. If it sounds robotic, rewrite it.",
        "2. NEVER stuff a keyword more than ~1% density (so a 1,500-word article = max ~15 mentions of the primary keyword in any form).",
        "3. USE NATURAL VARIATIONS. 'short term rental lipa' = 'short-term rental in Lipa City' = 'Lipa City rental'. Google understands all three.",
        "4. ONE PRIMARY KEYWORD PER ARTICLE. If you find yourself adding a second 'primary,' you actually have two articles.",
        "5. ANSWER THE INTENT. If intent = Informational, do not pitch a booking in the first 200 words. Earn it.",
        "6. INTERNAL LINKS. Every article must link to (a) the homepage, (b) one property page, and (c) 2 other blog articles in the same cluster.",
        "7. ALT TEXT IS SEO. Never leave alt text blank. Never write 'photo1.jpg' style alt text.",
    ]),
    ("Workflow for every article (top-to-bottom)", [
        "STEP 1 - Brief: Get the keyword row + outline from the SEO lead (already in 'content for HavenInLipa' folder).",
        "STEP 2 - Draft Title (H1): Include the primary keyword naturally. Aim for <60 characters.",
        "STEP 3 - Meta description: 150-160 characters. Include primary keyword once. Pitch the click.",
        "STEP 4 - URL slug: Lowercase, hyphenated, 3-5 words. Use the slug specified in the Keyword Master sheet.",
        "STEP 5 - Intro (first paragraph): Mention primary keyword in the first 100 words. State who the article is for and what they'll get.",
        "STEP 6 - Body: Follow the outline's H2/H3 structure. Place supporting keywords naturally.",
        "STEP 7 - Internal links: Add 3-5 internal links per article. Anchor text should be descriptive, not 'click here'.",
        "STEP 8 - Images: Use the image guide from the article folder. Always fill in alt text.",
        "STEP 9 - FAQ block: If the SERP shows a 'People Also Ask' box for your keyword, add 3-5 FAQ entries answering those questions.",
        "STEP 10 - Self-check: Read once for tone, once for keyword density, once for typos. Then publish.",
        "STEP 11 - After publishing: Send the live URL to the SEO lead so they can request indexing in GSC.",
    ]),
    ("Common mistakes to avoid", [
        "1. Repeating the exact keyword phrase 8+ times in 1,000 words - reads as spam to Google AND to readers.",
        "2. Writing a title that crams 2-3 keywords ('Family Staycation Lipa - Weekend Getaway with Kids - Romantic Couple Trip').",
        "3. Leaving the meta description blank - Google will generate one and it usually undersells the article.",
        "4. Using the same image alt text on every image ('Lipa City rental').",
        "5. Adding internal links only at the bottom in a 'Related Posts' block. They should appear inside the body where the topic is mentioned.",
        "6. Publishing without checking the URL slug. A wrong slug = a redirect = lost authority.",
    ]),
    ("Quick reference: per-article keyword targets", [
        "Article #11 (Family Staycation): family staycation lipa | family-friendly rental lipa city | weekend getaway with kids near manila | kid-friendly batangas",
        "Article #12 (Romantic Getaway): romantic getaway batangas | couple retreat lipa | honeymoon batangas | anniversary getaway near manila",
        "Article #13 (Mickey in Lipa Launch): mickey in lipa | disney-inspired house lipa | full house rental lipa | family house rental lipa city",
        "Article #14 (Family Weekend, No Beach): family weekend batangas | weekend near manila with family | batangas without beach crowds | lipa family itinerary",
        "Article #6 (Book Direct): book direct vs airbnb | save on vacation rental fees | why book direct accommodation | airbnb alternative lipa",
        "Article #1 (Things to Do): things to do in lipa city | lipa city tourist spots | lipa batangas attractions",
        "Article #10 (How to Get There - PUBLISH): how to get to lipa from manila | lipa city travel guide",
    ]),
]


def build_blogger(ws):
    ws.title = "Blogger Brief"
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 4
    ws.column_dimensions["B"].width = 120

    row = 2
    ws.cell(row=row, column=2, value="Blogger Brief - How to Use This Keyword List")
    style_title(ws.cell(row=row, column=2), color=CORAL)
    ws.row_dimensions[row].height = 28
    row += 1
    ws.cell(row=row, column=2, value="Read top-to-bottom before writing your first HavenInLipa article. Refer back every time.")
    style_subtitle(ws.cell(row=row, column=2))
    row += 2

    for title, lines in BLOGGER_SECTIONS:
        ws.cell(row=row, column=2, value=title)
        style_subtitle(ws.cell(row=row, column=2), color=CORAL)
        ws.row_dimensions[row].height = 22
        row += 1
        for line in lines:
            ws.cell(row=row, column=2, value=line)
            c = ws.cell(row=row, column=2)
            c.font = Font(name="Calibri", size=10)
            c.alignment = Alignment(wrap_text=True, vertical="top", indent=1)
            ws.row_dimensions[row].height = 28
            row += 1
        row += 1


# ---------------------------------------------------------------------------
# SHEET 6: Tracking Log Template
# ---------------------------------------------------------------------------

def build_tracking(ws):
    ws.title = "Tracking Log Template"
    ws.sheet_view.showGridLines = False
    ws.freeze_panes = "B2"

    headers = ["Keyword", "Snapshot Date (YYYY-MM)", "Avg. Position", "Impressions", "Clicks", "CTR %", "Movement vs. last month", "Notes"]
    for i, h in enumerate(headers, start=1):
        style_header(ws.cell(row=1, column=i, value=h), fill=FOREST_GREEN)
    ws.row_dimensions[1].height = 36

    # Pre-fill keyword column for convenience
    for r, (cluster, kw, intent, priority, target, status) in enumerate(KEYWORDS, start=2):
        ws.cell(row=r, column=1, value=kw)
        zebra = LIGHT_GREEN if r % 2 == 0 else WHITE
        for col in range(1, len(headers) + 1):
            style_body(ws.cell(row=r, column=col), fill=zebra)
        ws.row_dimensions[r].height = 24

    set_column_widths(ws, [34, 20, 15, 14, 12, 10, 28, 36])


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    wb = Workbook()
    build_readme(wb.active)
    build_master(wb.create_sheet())
    build_priority(wb.create_sheet())
    build_gsc(wb.create_sheet())
    build_blogger(wb.create_sheet())
    build_tracking(wb.create_sheet())

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    wb.save(OUTPUT_FILE)
    print(f"Saved: {OUTPUT_FILE}")
    print(f"File size: {os.path.getsize(OUTPUT_FILE):,} bytes")


if __name__ == "__main__":
    main()
