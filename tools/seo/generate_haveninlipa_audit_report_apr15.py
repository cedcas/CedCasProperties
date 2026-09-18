#!/usr/bin/env python3
"""
Generate the April 15, 2026 SEO Audit Report DOCX for HavenInLipa.com
Prepared by: NetCoreSolutions
Comparison: April 7, 2026 baseline vs. April 15, 2026 current state
"""

import os
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

# Brand Colors
CORAL = RGBColor(0xFF, 0x53, 0x71)
FOREST_GREEN = RGBColor(0x3B, 0x53, 0x23)
DARK_TEXT = RGBColor(0x2C, 0x2C, 0x2C)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_GRAY = RGBColor(0xF2, 0xF2, 0xF2)
MED_GRAY = RGBColor(0x66, 0x66, 0x66)
ACCENT_RED = RGBColor(0xD9, 0x3B, 0x3B)
ACCENT_ORANGE = RGBColor(0xE8, 0x8A, 0x1A)
ACCENT_GREEN_LIGHT = RGBColor(0x0D, 0x8A, 0x4E)

LOGO_PATH = "/Users/cedricpcastillo/Documents/VSCode/seo/Brand Assets/NCS Logo.png"
OUTPUT_DIR = "/Users/cedricpcastillo/Documents/VSCode/seo/content for HavenInLipa"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "HavenInLipa_SEO_Audit_Report_Apr15.docx")


def set_cell_shading(cell, hex_color):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def set_cell_text(cell, text, bold=False, color=None, size=10, alignment=None):
    cell.text = ""
    p = cell.paragraphs[0]
    if alignment:
        p.alignment = alignment
    run = p.add_run(text)
    run.bold = bold
    run.font.size = Pt(size)
    run.font.name = "Calibri"
    if color:
        run.font.color.rgb = color
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)


def add_styled_table(doc, headers, rows, col_widths=None, header_bg="FF5371"):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        set_cell_shading(cell, header_bg)
        set_cell_text(cell, h, bold=True, color=WHITE, size=9)
    for r_idx, row in enumerate(rows):
        bg = "F2F2F2" if r_idx % 2 == 0 else "FFFFFF"
        for c_idx, val in enumerate(row):
            cell = table.rows[r_idx + 1].cells[c_idx]
            set_cell_shading(cell, bg)
            set_cell_text(cell, str(val), size=9)
    if col_widths:
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Inches(w)
    return table


def add_heading_styled(doc, text, level=1, color=None):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.name = "Calibri"
        if color:
            run.font.color.rgb = color
    return h


def add_body(doc, text, bold=False, italic=False, color=None, size=10.5):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.size = Pt(size)
    run.font.name = "Calibri"
    if color:
        run.font.color.rgb = color
    return p


def add_bullet(doc, text, level=0, bold_prefix=""):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Inches(0.5 + level * 0.25)
    if bold_prefix:
        run_b = p.add_run(bold_prefix)
        run_b.bold = True
        run_b.font.size = Pt(10)
        run_b.font.name = "Calibri"
    run = p.add_run(text)
    run.font.size = Pt(10)
    run.font.name = "Calibri"
    return p


def add_divider(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run("\u2500" * 80)
    run.font.size = Pt(6)
    run.font.color.rgb = RGBColor(0xCC, 0xCC, 0xCC)


def generate_report():
    doc = Document()

    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2)
        section.right_margin = Cm(2)

    # ── COVER PAGE ──
    cover_para = doc.add_paragraph()
    cover_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover_para.paragraph_format.space_before = Pt(80)

    if os.path.exists(LOGO_PATH):
        run = cover_para.add_run()
        run.add_picture(LOGO_PATH, width=Inches(2.5))

    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_para.paragraph_format.space_before = Pt(40)
    run = title_para.add_run("SEO AUDIT REPORT")
    run.bold = True
    run.font.size = Pt(32)
    run.font.name = "Calibri"
    run.font.color.rgb = DARK_TEXT

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run("Progress Review & Updated Assessment")
    run.italic = True
    run.font.size = Pt(14)
    run.font.color.rgb = MED_GRAY
    run.font.name = "Calibri"

    client_para = doc.add_paragraph()
    client_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    client_para.paragraph_format.space_before = Pt(30)
    run = client_para.add_run("haveninlipa.com")
    run.bold = True
    run.font.size = Pt(20)
    run.font.color.rgb = CORAL
    run.font.name = "Calibri"

    prep = doc.add_paragraph()
    prep.alignment = WD_ALIGN_PARAGRAPH.CENTER
    prep.paragraph_format.space_before = Pt(100)
    run = prep.add_run("Prepared by: NetCoreSolutions")
    run.font.size = Pt(11)
    run.font.color.rgb = DARK_TEXT
    run.font.name = "Calibri"

    date_para = doc.add_paragraph()
    date_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = date_para.add_run("Date: April 15, 2026")
    run.font.size = Pt(11)
    run.font.color.rgb = DARK_TEXT
    run.font.name = "Calibri"

    baseline = doc.add_paragraph()
    baseline.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = baseline.add_run("Baseline Comparison: April 7, 2026")
    run.italic = True
    run.font.size = Pt(10)
    run.font.color.rgb = MED_GRAY
    run.font.name = "Calibri"

    conf = doc.add_paragraph()
    conf.alignment = WD_ALIGN_PARAGRAPH.CENTER
    conf.paragraph_format.space_before = Pt(20)
    run = conf.add_run("CONFIDENTIAL")
    run.bold = True
    run.font.size = Pt(9)
    run.font.color.rgb = MED_GRAY
    run.font.name = "Calibri"

    doc.add_page_break()

    # ── TABLE OF CONTENTS ──
    add_heading_styled(doc, "Table of Contents", level=1, color=CORAL)
    toc_items = [
        "1. Executive Summary",
        "2. Progress Since April 7 Baseline",
        "    2.1 Fixes Shipped",
        "    2.2 Outstanding Issues",
        "3. Website Audit",
        "    3.1 Site Structure & Pages",
        "    3.2 Content Volume",
        "    3.3 Technical SEO",
        "    3.4 Trust Signals",
        "4. Competitor Analysis",
        "    4.1 Lipa City Airbnb Market Data",
        "    4.2 Positioning Opportunities",
        "5. Content Strategy",
        "    5.1 Topic Clusters Status",
        "    5.2 Priority Content Plan",
        "6. Recommendations & Next Steps",
        "    6.1 Immediate Actions (Week 1-2)",
        "    6.2 Mid-Term Strategy (Month 1-3)",
        "    6.3 Long-Term Growth (Month 3-6)",
    ]
    for item in toc_items:
        p = doc.add_paragraph()
        run = p.add_run(item)
        run.font.size = Pt(10.5)
        run.font.name = "Calibri"
        p.paragraph_format.space_after = Pt(2)

    doc.add_page_break()

    # ── 1. EXECUTIVE SUMMARY ──
    add_heading_styled(doc, "1. Executive Summary", level=1, color=CORAL)
    add_body(
        doc,
        "This updated SEO audit for HavenInLipa.com reflects significant progress made since the April 7, 2026 baseline report. "
        "In 8 days, the HavenInLipa team has shipped critical fixes across content, trust, technical SEO, and local search "
        "infrastructure. The overall SEO Health Score has improved from 6/10 to 8/10, a meaningful +2 point jump in a short period.",
    )
    add_body(
        doc,
        "The site is now indexed in Google Search, verified in Google Search Console with three successful sitemap submissions, "
        "and listed on Google Business Profile with the correct primary category. The www vs. non-www duplicate content risk has "
        "been resolved via 301 redirects, and the previously-broken legal pages (Privacy Policy and Terms of Service) now contain "
        "full, professional content. Most notably, HavenInLipa has launched its blog subdomain (blog.haveninlipa.com) with two "
        "substantial articles totaling 6,000+ words of destination content.",
    )

    add_heading_styled(doc, "Key Improvements (April 7 → April 15)", level=2, color=FOREST_GREEN)
    improvements = [
        ("Blog launched:", " 2 articles totaling ~6,000 words published on blog.haveninlipa.com"),
        ("Content volume 7x:", " From ~1,400 words to ~10,800+ words across the ecosystem"),
        ("Legal pages fixed:", " Privacy Policy and Terms of Service now contain full content"),
        ("Google Business Profile:", " Live and verified with correct 'Vacation home rental agency' category"),
        ("Google Search Console:", " Verified with 3 sitemaps submitted (main site, www, blog) — all reading Success"),
        ("Duplicate content resolved:", " 301 redirects in place for www and Vercel auto-domain"),
        ("Indexing confirmed:", " Site appears in Google Search for branded queries (haven in lipa)"),
        ("Trust signals expanded:", " 280+ guests, 180+ five-star reviews (across platforms), 3-year Superhost badge"),
        ("Reviews on property pages:", " 2BR shows 20 reviews, 1BR shows 32 reviews"),
        ("FAQ coverage:", " 7 questions addressing booking, cancellation, and direct booking safety"),
    ]
    for prefix, text in improvements:
        add_bullet(doc, text, bold_prefix=prefix)

    add_heading_styled(doc, "Remaining Priorities", level=2, color=ACCENT_ORANGE)
    priorities = [
        ("Google Review Generation:", " GBP shows 4 reviews at 4.0★ — launch a post-stay review flow to reach 25-50 reviews in 90 days"),
        ("Property Page Depth:", " Expand from 450-650 words to 1,500+ words with amenities, neighborhood info, and inline testimonials"),
        ("Book Direct vs. Airbnb page:", " High-intent commercial keyword still uncovered"),
        ("Canonical tags:", " Add self-referencing canonical tags site-wide for defense-in-depth"),
        ("Accelerate indexing:", " Request indexing of blog posts via GSC URL Inspection tool"),
    ]
    for prefix, text in priorities:
        add_bullet(doc, text, bold_prefix=prefix)

    add_heading_styled(doc, "Overall SEO Health Score", level=2, color=CORAL)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("April 7 Baseline:  ")
    run.font.size = Pt(13)
    run.font.name = "Calibri"
    run.font.color.rgb = DARK_TEXT
    run2 = p.add_run("6.0/10")
    run2.bold = True
    run2.font.size = Pt(16)
    run2.font.name = "Calibri"
    run2.font.color.rgb = MED_GRAY
    run3 = p.add_run("    →    ")
    run3.font.size = Pt(14)
    run3.font.name = "Calibri"
    run4 = p.add_run("April 15: ")
    run4.font.size = Pt(13)
    run4.font.name = "Calibri"
    run4.font.color.rgb = DARK_TEXT
    run5 = p.add_run("8.0/10")
    run5.bold = True
    run5.font.size = Pt(20)
    run5.font.name = "Calibri"
    run5.font.color.rgb = ACCENT_GREEN_LIGHT
    run6 = p.add_run("    (+2.0)")
    run6.bold = True
    run6.font.size = Pt(14)
    run6.font.name = "Calibri"
    run6.font.color.rgb = ACCENT_GREEN_LIGHT

    doc.add_page_break()

    # ── 2. PROGRESS SINCE APRIL 7 BASELINE ──
    add_heading_styled(doc, "2. Progress Since April 7 Baseline", level=1, color=CORAL)

    add_heading_styled(doc, "2.1 SEO Score Breakdown by Category", level=2, color=FOREST_GREEN)
    score_rows = [
        ["Technical Foundation", "7/10", "8.5/10", "+1.5"],
        ["Content Volume", "2/10", "5/10", "+3.0"],
        ["On-Page SEO", "6/10", "6.5/10", "+0.5"],
        ["Trust & Credibility", "5/10", "7.5/10", "+2.5"],
        ["Local SEO", "1/10", "8/10", "+7.0"],
        ["Content Strategy", "1/10", "4/10", "+3.0"],
        ["Indexing & Visibility", "1/10", "5.5/10", "+4.5"],
        ["OVERALL", "6.0/10", "8.0/10", "+2.0"],
    ]
    add_styled_table(
        doc,
        ["Category", "April 7", "April 15", "Change"],
        score_rows,
        col_widths=[2.5, 1.2, 1.2, 1.0],
    )

    add_heading_styled(doc, "2.2 Fixes Shipped", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "The following April 7 recommendations have been fully implemented as of April 15:",
    )
    fixes_rows = [
        ["Broken legal pages (/privacy, /terms linked to #)", "Privacy Policy + Terms now live with full content (9 sections each, updated April 11)", "Done"],
        ["No blog or content hub", "blog.haveninlipa.com launched on WordPress + Yoast SEO with 2 articles (~6,000 words)", "Done"],
        ["No Google Business Profile", "GBP live as 'Haven in Lipa' — Vacation home rental agency + Holiday apartment rental", "Done"],
        ["No Google Search Console", "GSC verified; 3 sitemaps submitted (main, www, blog) — all Success status", "Done"],
        ["No guest reviews displayed", "20 reviews on 2BR page, 32 reviews on 1BR page", "Done"],
        ["No cancellation policy published", "Tiered refund policy in Terms (7+ days full refund, 3-7 days 50%, <3 days no refund)", "Done"],
        ["No check-in/check-out times visible", "Published in Terms (2:00 PM check-in / 12:00 PM check-out)", "Done"],
        ["No FAQ content (despite schema)", "7-question FAQ section on homepage", "Done"],
        ["Duplicate content (www vs non-www)", "301 redirect: www.haveninlipa.com → haveninlipa.com (verified)", "Done"],
        ["Vercel auto-domain exposure", "301 redirect: ced-cas-properties.vercel.app → haveninlipa.com (verified)", "Done"],
        ["Trust signal expansion", "Updated counts: 280+ guests, 180+ five-star reviews, 3-year Superhost", "Done"],
        ["Review source clarification", "Homepage clarifies reviews aggregated across platforms", "Done"],
    ]
    add_styled_table(
        doc,
        ["April 7 Issue", "April 15 Resolution", "Status"],
        fixes_rows,
        col_widths=[2.3, 3.3, 0.8],
    )

    add_heading_styled(doc, "2.3 Outstanding Issues", level=2, color=ACCENT_ORANGE)
    outstanding_rows = [
        ["Google review count vs. website claim", "GBP only has 4 reviews (4.0★) vs. 180+ claimed. Launch review generation.", "High"],
        ["Property pages thin (450-650 words)", "Target: 1,500+ words. Add amenity details, neighborhood, inline testimonials.", "High"],
        ["No 'Book Direct vs Airbnb' page", "High-intent commercial keyword still uncovered.", "High"],
        ["Canonical tags", "Add self-referencing <link rel='canonical'> to all pages.", "Medium"],
        ["Blog posts not yet indexed", "Use GSC URL Inspection → Request Indexing for both articles.", "Medium"],
        ["Main sitemap missing legal pages", "/privacy and /terms not in sitemap.xml (only 3 URLs listed).", "Medium"],
        ["'5+ Properties' claim, 2 shown", "Either add more listings or adjust copy to '2 Properties'.", "Low"],
        ["Blog author email shown publicly", "ccastillo@netcoresolutions.com displayed as author on 1 post — replace with name.", "Low"],
        ["No photo gallery SEO alt text", "Property images use repetitive patterns — add descriptive, keyword-rich alt text.", "Low"],
        ["No seasonal landing pages", "Missing peak season (Dec, Apr, May) content for timely rankings.", "Low"],
    ]
    add_styled_table(
        doc,
        ["Issue", "Recommendation", "Priority"],
        outstanding_rows,
        col_widths=[2.3, 3.5, 0.7],
    )

    doc.add_page_break()

    # ── 3. WEBSITE AUDIT ──
    add_heading_styled(doc, "3. Website Audit", level=1, color=CORAL)

    add_heading_styled(doc, "3.1 Site Structure & Pages", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "HavenInLipa now operates a two-domain architecture: the main site (Next.js on Vercel) for core transactional pages, "
        "and a blog subdomain (WordPress + Yoast SEO) for content marketing. This split is intentional and healthy — it lets "
        "the content team publish via WordPress without affecting the production Next.js app.",
    )
    pages_rows = [
        ["Homepage", "haveninlipa.com", "~2,000", "LocalBusiness + FAQ"],
        ["Spacious 2BR Property", "/properties/spacious-2-bedroom", "~650", "VacationRental"],
        ["Cozy 1BR Property", "/properties/cozy-1-bedroom", "~450", "VacationRental"],
        ["Privacy Policy", "/privacy", "~800", "—"],
        ["Terms of Service", "/terms", "~900", "—"],
        ["Blog: 15 Things to Do in Lipa", "blog.haveninlipa.com/15-best-...", "~3,500", "Article"],
        ["Blog: Weekend Getaway in Lipa", "blog.haveninlipa.com/weekend-...", "~2,500", "Article"],
        ["TOTAL", "—", "~10,800+", "—"],
    ]
    add_styled_table(
        doc,
        ["Page", "URL", "Est. Words", "Schema"],
        pages_rows,
        col_widths=[2.2, 2.4, 1.0, 1.2],
    )

    add_heading_styled(doc, "3.2 Content Volume", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "Content volume has grown approximately 7x since April 7. The competitive benchmark for a short-term rental website "
        "with 2 properties is 2,000-5,000+ words across the core site, plus 5-10 supporting blog articles. HavenInLipa has "
        "already exceeded the main-site threshold with the legal pages and is ramping up toward the content target with 2 "
        "substantial blog pieces.",
    )
    volume_rows = [
        ["Total indexed words", "~1,400", "~10,800+", "+670%"],
        ["Main site pages", "3", "5", "+2 (legal)"],
        ["Blog articles", "0", "2", "+2"],
        ["Total pages in ecosystem", "3", "7 + blog archives", "+4 (core)"],
        ["Avg. words per page", "~467", "~1,543", "+230%"],
    ]
    add_styled_table(
        doc,
        ["Metric", "April 7", "April 15", "Change"],
        volume_rows,
        col_widths=[2.5, 1.5, 1.5, 1.5],
    )

    add_heading_styled(doc, "3.3 Technical SEO", level=2, color=FOREST_GREEN)
    tech_rows = [
        ["Domain canonicalization", "Both www and non-www served 200", "301 redirect: www → non-www (verified)"],
        ["Vercel auto-domain exposure", "Not addressed", "301 redirect to canonical (verified)"],
        ["robots.txt", "Not assessed", "Present on both domains, properly configured"],
        ["Main site sitemap.xml", "Not assessed", "Present — 3 URLs (homepage + 2 properties)"],
        ["Blog sitemap.xml", "Did not exist", "Yoast-generated sitemap index with 15 URLs"],
        ["GSC verification", "Not set up", "Verified, 3 sitemaps submitted, all 'Success'"],
        ["Google indexing status", "Not indexed", "Indexed — site appears for branded queries"],
        ["HTTPS / HSTS", "Enabled", "Enabled (max-age=63072000)"],
        ["CSP / Security headers", "Not assessed", "Configured (img-src, script-src, frame-ancestors DENY)"],
        ["Canonical tags", "Not confirmed", "Still needs implementation"],
    ]
    add_styled_table(
        doc,
        ["Element", "April 7 State", "April 15 State"],
        tech_rows,
        col_widths=[1.8, 2.5, 2.5],
    )

    add_heading_styled(doc, "3.4 Trust Signals", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "Trust signals have been meaningfully strengthened, with two important caveats around Google Business Profile review "
        "volume and the aggregated review count claim.",
    )
    trust_rows = [
        ["Total guest count claim", "200+ Happy Guests", "280+ Happy Guests"],
        ["Five-star review claim", "51 verified reviews", "180+ Five-Star Reviews (across platforms)"],
        ["Superhost badge", "Not shown", "3 Years Superhost Status displayed"],
        ["Reviews on property pages", "Not displayed", "20 reviews (2BR) + 32 reviews (1BR) inline"],
        ["Google Business Profile", "Missing", "Live: 4.0★ / 4 Google reviews — needs growth"],
        ["Social media presence", "Facebook, Instagram, TikTok", "Same, plus Airbnb Superhost link"],
        ["Payment methods", "GCash + BPI", "GCash, BPI InstaPay, Stripe (cards)"],
        ["Response time SLA", "24hr", "24hr (maintained)"],
        ["Legal pages (privacy/terms)", "Broken (linked to #)", "Full content, last updated April 11, 2026"],
    ]
    add_styled_table(
        doc,
        ["Trust Signal", "April 7", "April 15"],
        trust_rows,
        col_widths=[2.0, 2.3, 2.5],
    )

    doc.add_page_break()

    # ── 4. COMPETITOR ANALYSIS ──
    add_heading_styled(doc, "4. Competitor Analysis", level=1, color=CORAL)

    add_heading_styled(doc, "4.1 Lipa City Airbnb Market Data (2026)", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "The Lipa City short-term rental market shows a clear pattern of oversupply and declining per-listing revenue — "
        "creating an opening for differentiated, direct-booking operators like HavenInLipa.",
    )
    market_rows = [
        ["Active listings in Lipa", "146-166 properties"],
        ["Average Daily Rate (ADR)", "$104/night (~₱5,800)"],
        ["HavenInLipa ADR (2BR)", "₱2,800/night (~$50) — 52% below market"],
        ["HavenInLipa ADR (1BR)", "₱2,000/night (~$36) — 65% below market"],
        ["Occupancy rate", "24-32%"],
        ["Monthly revenue per listing", "$1,254"],
        ["Revenue YoY change", "-24.8% (declining)"],
        ["Supply YoY change", "+130.6% (rapid growth)"],
        ["Superhost rate", "59%"],
        ["Guest Favorite rate", "42.2%"],
        ["Domestic guests", "84%"],
        ["Primary international markets", "US (7%), Canada (2.1%)"],
        ["Peak months", "December, April, May"],
        ["Low months", "February, March, October"],
        ["Average stay length", "3.2 nights"],
        ["Average booking lead time", "21 days"],
    ]
    add_styled_table(
        doc,
        ["Metric", "Value"],
        market_rows,
        col_widths=[3.0, 3.8],
    )

    add_heading_styled(doc, "4.2 Positioning Opportunities", level=2, color=FOREST_GREEN)
    add_body(doc, "Airbnb Strengths (Threats to HavenInLipa):", bold=True)
    add_bullet(doc, "Massive brand authority (Domain Rating 90+) and instant trust")
    add_bullet(doc, "146-166 competing listings in Lipa alone")
    add_bullet(doc, "Built-in search, filtering, verified reviews, Superhost badges")
    add_bullet(doc, "Mobile app with push notifications for deal alerts")
    add_bullet(doc, "Guest Favorite badges on 42.2% of listings")

    add_body(doc, "Airbnb Weaknesses (HavenInLipa Opportunities):", bold=True)
    add_bullet(doc, "Service fees 14-20% — HavenInLipa's 'save 15-20%' message is a strong differentiator")
    add_bullet(doc, "Declining market (-24.8% revenue) with oversupply (+130.6%) — hosts struggling, creating opportunity for direct booking alternatives")
    add_bullet(doc, "Generic property descriptions with no local expertise content")
    add_bullet(doc, "No destination content (travel guides, itineraries, restaurant recommendations)")
    add_bullet(doc, "Cookie-cutter listing format limits brand personality")
    add_bullet(doc, "HavenInLipa's pricing significantly undercuts the Airbnb average — strong value positioning for price-sensitive domestic travelers (the 84% majority)")

    doc.add_page_break()

    # ── 5. CONTENT STRATEGY ──
    add_heading_styled(doc, "5. Content Strategy", level=1, color=CORAL)

    add_heading_styled(doc, "5.1 Topic Clusters — Current Status", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "Five topic clusters were identified in the April 7 strategy. Here is the current coverage status after the blog launch:",
    )

    add_body(doc, "Cluster 1 — Short-Term Rentals in Lipa City (Transactional)", bold=True, color=CORAL)
    cluster1 = [
        ["short term rental lipa city", "High", "Partial — homepage"],
        ["vacation rental lipa batangas", "High", "Partial — homepage + property pages"],
        ["airbnb alternative lipa", "High", "Gap — create 'Book Direct vs Airbnb' page"],
        ["affordable staycation lipa", "High", "Partial — mentioned in blog"],
        ["direct booking lipa city", "Medium", "Gap"],
    ]
    add_styled_table(doc, ["Keyword", "Priority", "Status"], cluster1, col_widths=[3.0, 1.2, 2.6])

    add_body(doc, "Cluster 2 — Things to Do in Lipa City (Informational)", bold=True, color=CORAL)
    cluster2 = [
        ["things to do in lipa city", "High", "COVERED ✓"],
        ["lipa city tourist spots", "High", "COVERED ✓"],
        ["lipa batangas attractions", "Medium", "COVERED ✓"],
        ["mt maculot hiking guide", "Medium", "Partial — mentioned only"],
        ["taal volcano day trip from lipa", "Medium", "Partial — mentioned only"],
    ]
    add_styled_table(doc, ["Keyword", "Priority", "Status"], cluster2, col_widths=[3.0, 1.2, 2.6])

    add_body(doc, "Cluster 3 — Weekend Getaway / Staycation (Informational → Commercial)", bold=True, color=CORAL)
    cluster3 = [
        ["weekend getaway near manila", "High", "COVERED ✓"],
        ["staycation batangas", "High", "Partial"],
        ["family staycation lipa", "Medium", "Gap"],
        ["couple retreat batangas", "Medium", "Gap"],
        ["remote work staycation philippines", "Low", "Gap"],
    ]
    add_styled_table(doc, ["Keyword", "Priority", "Status"], cluster3, col_widths=[3.0, 1.2, 2.6])

    add_body(doc, "Cluster 4 — Travel Planning & Logistics (Informational)", bold=True, color=CORAL)
    cluster4 = [
        ["how to get to lipa from manila", "Medium", "Covered in blog posts"],
        ["lipa city travel guide", "High", "Partial"],
        ["best restaurants in lipa", "High", "Gap — high-potential standalone article"],
        ["lipa city food trip", "Medium", "Gap"],
        ["batangas road trip itinerary", "Medium", "Gap"],
    ]
    add_styled_table(doc, ["Keyword", "Priority", "Status"], cluster4, col_widths=[3.0, 1.2, 2.6])

    add_body(doc, "Cluster 5 — Direct Booking & Value (Commercial)", bold=True, color=CORAL)
    cluster5 = [
        ["book direct vs airbnb", "High", "Gap — TOP PRIORITY"],
        ["save on vacation rental fees", "Medium", "Mentioned, no dedicated page"],
        ["why book direct accommodation", "Medium", "Gap"],
        ["vacation rental no service fee", "Medium", "Gap"],
    ]
    add_styled_table(doc, ["Keyword", "Priority", "Status"], cluster5, col_widths=[3.0, 1.2, 2.6])

    add_heading_styled(doc, "5.2 Priority Content Plan", level=2, color=FOREST_GREEN)
    add_body(doc, "Quick Wins (Week 1-2) — High Impact, Low Effort", bold=True, color=ACCENT_GREEN_LIGHT)
    quickwins = [
        ["1", "Launch post-stay Google review flow (email/SMS with direct GBP link)", "Trust / Local SEO"],
        ["2", "Request indexing of 2 blog posts via GSC URL Inspection", "Indexing"],
        ["3", "Fix 5+ Properties claim (adjust to '2 Properties' or add listings)", "Trust"],
        ["4", "Fix blog author email display on Things to Do article", "E-E-A-T"],
        ["5", "Add /privacy and /terms to main sitemap.xml", "Technical"],
        ["6", "Add self-referencing canonical tags site-wide", "Technical"],
    ]
    add_styled_table(doc, ["#", "Action", "Category"], quickwins, col_widths=[0.4, 5.4, 1.6])

    add_body(doc, "Foundational Content (Month 1) — Must-Have", bold=True, color=ACCENT_GREEN_LIGHT)
    foundational = [
        ["7", "'Why Book Direct vs. Airbnb' comparison page", "Cluster 5", "~1,500 words"],
        ["8", "Expand 2BR property page (add amenities, neighborhood, testimonials)", "Cluster 1", "+1,000 words"],
        ["9", "Expand 1BR property page (same treatment)", "Cluster 1", "+1,000 words"],
        ["10", "'Best Restaurants in Lipa City' blog post", "Cluster 4", "~2,500 words"],
        ["11", "Standalone FAQ page (expand from homepage section)", "Cluster 1", "~1,200 words"],
    ]
    add_styled_table(doc, ["#", "Content Piece", "Cluster", "Target Words"], foundational, col_widths=[0.4, 3.8, 1.4, 1.4])

    add_body(doc, "Authority-Building (Month 2-3) — Scale Organic Traffic", bold=True, color=ACCENT_GREEN_LIGHT)
    authority = [
        ["12", "'Family Staycation in Lipa' guide", "Cluster 3", "~2,000 words"],
        ["13", "'Mt. Maculot Hiking Guide' standalone article", "Cluster 2", "~2,500 words"],
        ["14", "'Batangas Road Trip Itinerary'", "Cluster 4", "~2,500 words"],
        ["15", "'Remote Work Staycation' guide", "Cluster 3", "~1,500 words"],
    ]
    add_styled_table(doc, ["#", "Content Piece", "Cluster", "Target Words"], authority, col_widths=[0.4, 3.8, 1.4, 1.4])

    add_body(doc, "Conversion-Supporting (Month 3+) — Drive Bookings", bold=True, color=ACCENT_GREEN_LIGHT)
    conversion = [
        ["16", "Seasonal landing page: 'Summer in Lipa 2026'", "Cluster 3", "~1,500 words"],
        ["17", "'Holiday Season in Batangas' (December targeting)", "Cluster 3", "~1,500 words"],
        ["18", "Guest testimonial / stories page", "Cluster 1", "~1,000 words"],
    ]
    add_styled_table(doc, ["#", "Content Piece", "Cluster", "Target Words"], conversion, col_widths=[0.4, 3.8, 1.4, 1.4])

    doc.add_page_break()

    # ── 6. RECOMMENDATIONS ──
    add_heading_styled(doc, "6. Recommendations & Next Steps", level=1, color=CORAL)

    add_heading_styled(doc, "6.1 Immediate Actions (Week 1-2)", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "These are high-priority fixes to consolidate the progress made and remove remaining blockers to organic visibility.",
    )
    add_bullet(doc, "Build a post-stay guest email/SMS template with a direct link to the HavenInLipa Google Business Profile review page. Target 25-50 Google reviews within 90 days. This is the single highest-leverage trust action available.", bold_prefix="Launch Google review generation: ")
    add_bullet(doc, "In GSC, use the URL Inspection tool for each of the 2 blog articles and click 'Request Indexing'. This accelerates crawl and visibility.", bold_prefix="Request blog indexing: ")
    add_bullet(doc, "Add <link rel='canonical' href='https://haveninlipa.com/{path}' /> to every page in the Next.js layout. This is defense-in-depth against future duplicate content issues.", bold_prefix="Add canonical tags: ")
    add_bullet(doc, "Update sitemap.xml to include /privacy and /terms URLs (currently only 3 URLs listed).", bold_prefix="Expand main sitemap: ")
    add_bullet(doc, "Update homepage to either show '2 Properties' accurately or add additional listings to back up the claim.", bold_prefix="Fix '5+ Properties' copy: ")
    add_bullet(doc, "Replace the email address byline on the 'Things to Do' article with a proper author name (and create an author bio page for E-E-A-T signals).", bold_prefix="Fix blog author display: ")
    add_bullet(doc, "Rewrite property image alt text with descriptive, keyword-rich descriptions (e.g., 'Spacious 2BR Lipa City vacation rental living room with sofa and TV').", bold_prefix="Improve image alt text: ")

    add_heading_styled(doc, "6.2 Mid-Term Strategy (Month 1-3)", level=2, color=FOREST_GREEN)
    add_body(doc, "These initiatives build the content foundation for sustained organic traffic growth.")
    add_bullet(doc, "This is the highest-priority commercial keyword in Cluster 5 and directly reinforces the site's core value proposition (save 15-20%). Include a calculator showing savings for a typical 3-night stay.", bold_prefix="Publish 'Book Direct vs. Airbnb' comparison page: ")
    add_bullet(doc, "Expand from current 450-650 words to 1,500+ words each. Add detailed amenity lists, nearby attractions linked to blog content, house rules, check-in details, and 3-5 inline testimonials.", bold_prefix="Expand both property pages: ")
    add_bullet(doc, "High search volume topic with strong local intent. Position HavenInLipa as the local expert — this also drives backlinks from restaurants you feature.", bold_prefix="Publish 'Best Restaurants in Lipa' article: ")
    add_bullet(doc, "Cross-link blog articles to property pages and vice versa. Add 'Where to Stay' CTAs in blog posts pointing to specific listings, and 'Things to Do Nearby' links from property pages to blog content.", bold_prefix="Implement internal linking strategy: ")
    add_bullet(doc, "Extract the homepage FAQ into a dedicated /faq page with more questions (cancellations, early check-in, pet policy, extra guests, WiFi speed, payment options). Target FAQ-rich snippets in Google.", bold_prefix="Create standalone FAQ page: ")
    add_bullet(doc, "Integrate a live availability calendar on property pages to reduce booking friction and enable self-serve scheduling (currently requires contact form inquiry).", bold_prefix="Add booking calendar widget: ")

    add_heading_styled(doc, "6.3 Long-Term Growth (Month 3-6)", level=2, color=FOREST_GREEN)
    add_body(doc, "These strategic initiatives scale organic visibility and establish HavenInLipa as the authoritative voice for Lipa City travel.")
    add_bullet(doc, "Publish the Authority-Building batch: Family Staycation, Mt. Maculot Hiking Guide, Batangas Road Trip Itinerary, Remote Work Staycation. Maintain 2-4 posts/month cadence.", bold_prefix="Complete the 10-article content roadmap: ")
    add_bullet(doc, "Partner with Batangas tourism boards, travel bloggers, and local business directories. Reach out to the restaurants featured in the 'Best Restaurants' article — they often reciprocate links.", bold_prefix="Build backlinks via local tourism outreach: ")
    add_bullet(doc, "Publish 'Summer in Lipa 2026' in early May and 'Holiday Season Getaway in Batangas' in October to capture peak booking windows (December, April, May are peak months).", bold_prefix="Seasonal content calendar: ")
    add_bullet(doc, "Track keyword positions monthly in GSC Performance report. Update underperforming content based on Query data. Double down on topics generating impressions/clicks.", bold_prefix="Monthly GSC performance review: ")
    add_bullet(doc, "Run targeted Google Ads for high-intent transactional queries ('vacation rental lipa city', 'lipa city accommodation') during peak booking seasons. Small budget test: ₱10,000-15,000/month.", bold_prefix="Consider Google Ads for peak seasons: ")
    add_bullet(doc, "Add new property pages using the optimized template (1,500+ words with full amenities, neighborhood, reviews, policies) as your portfolio grows.", bold_prefix="Scale property portfolio: ")

    add_heading_styled(doc, "6.4 KPIs to Track", level=2, color=FOREST_GREEN)
    kpi_rows = [
        ["Google reviews count", "4", "25 (90 days)", "GBP"],
        ["Organic clicks per month", "0 (4/13)", "100+ (60 days)", "GSC Performance"],
        ["Organic impressions per month", "TBD", "5,000+ (60 days)", "GSC Performance"],
        ["Indexed pages", "3-5", "15+ (30 days)", "GSC Pages report"],
        ["Blog articles published", "2", "10 (90 days)", "Site audit"],
        ["Property page word count", "450-650", "1,500+ each", "Manual"],
        ["Direct bookings per month", "TBD", "+20% vs baseline", "Internal analytics"],
        ["GBP profile views per month", "TBD", "500+ (90 days)", "GBP Insights"],
    ]
    add_styled_table(
        doc,
        ["KPI", "Current", "90-Day Target", "Source"],
        kpi_rows,
        col_widths=[2.2, 1.2, 2.0, 1.6],
    )

    add_divider(doc)

    closing = doc.add_paragraph()
    closing.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = closing.add_run(
        "This SEO Audit Report (April 15, 2026) was prepared by NetCoreSolutions for HavenInLipa.com. "
        "All findings reflect the site state as of April 15, 2026 and compare against the April 7, 2026 baseline. "
        "For implementation support, contact the NetCoreSolutions team."
    )
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = MED_GRAY
    run.font.name = "Calibri"

    # Save
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    doc.save(OUTPUT_FILE)
    print(f"Report saved: {OUTPUT_FILE}")
    print(f"Size: {os.path.getsize(OUTPUT_FILE)} bytes")


if __name__ == "__main__":
    generate_report()
