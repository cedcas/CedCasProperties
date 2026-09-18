#!/usr/bin/env python3
"""
Generate a professional SEO Audit Report DOCX for HavenInLipa.com
Prepared by: NetCoreSolutions
"""

import os
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

# ── Brand Colors ──────────────────────────────────────────────────────────────

CORAL = RGBColor(0xFF, 0x53, 0x71)
FOREST_GREEN = RGBColor(0x3B, 0x53, 0x23)
DARK_TEXT = RGBColor(0x2C, 0x2C, 0x2C)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_GRAY = RGBColor(0xF2, 0xF2, 0xF2)
MED_GRAY = RGBColor(0x66, 0x66, 0x66)
ACCENT_RED = RGBColor(0xD9, 0x3B, 0x3B)
ACCENT_ORANGE = RGBColor(0xE8, 0x8A, 0x1A)
ACCENT_YELLOW = RGBColor(0xCC, 0xA3, 0x00)
ACCENT_GREEN_LIGHT = RGBColor(0x0D, 0x8A, 0x4E)

LOGO_PATH = "/Users/cedricpcastillo/Documents/VSCode/seo/Brand Assets/NCS Logo.png"
OUTPUT_DIR = "/Users/cedricpcastillo/Documents/VSCode/seo/content for HavenInLipa"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "HavenInLipa_SEO_Audit_Report.docx")

# ── Helpers ───────────────────────────────────────────────────────────────────


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

    # Header row
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        set_cell_shading(cell, header_bg)
        set_cell_text(cell, h, bold=True, color=WHITE, size=9)

    # Data rows
    for r_idx, row in enumerate(rows):
        bg = "F2F2F2" if r_idx % 2 == 0 else "FFFFFF"
        for c_idx, val in enumerate(row):
            cell = table.rows[r_idx + 1].cells[c_idx]
            set_cell_shading(cell, bg)
            set_cell_text(cell, str(val), size=9)

    # Column widths
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


def add_score_box(doc, label, score, max_score=10, color=CORAL):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(f"  {label}: ")
    run.bold = True
    run.font.size = Pt(12)
    run.font.name = "Calibri"
    run.font.color.rgb = DARK_TEXT

    run2 = p.add_run(f"{score}/{max_score}")
    run2.bold = True
    run2.font.size = Pt(14)
    run2.font.name = "Calibri"
    run2.font.color.rgb = color
    return p


def add_divider(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run("\u2500" * 80)
    run.font.size = Pt(6)
    run.font.color.rgb = RGBColor(0xCC, 0xCC, 0xCC)


# ── Main ──────────────────────────────────────────────────────────────────────


def generate_report():
    doc = Document()

    # ── Page Margins ──
    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)

    # ── Default Font ──
    style = doc.styles["Normal"]
    font = style.font
    font.name = "Calibri"
    font.size = Pt(10.5)
    font.color.rgb = DARK_TEXT

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # COVER PAGE
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    # Logo
    if os.path.exists(LOGO_PATH):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_logo = p_logo.add_run()
        run_logo.add_picture(LOGO_PATH, width=Inches(2.5))

    # Spacer
    for _ in range(4):
        doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("SEO AUDIT REPORT")
    run.bold = True
    run.font.size = Pt(32)
    run.font.color.rgb = CORAL
    run.font.name = "Calibri"

    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run2 = p2.add_run("haveninlipa.com")
    run2.bold = True
    run2.font.size = Pt(22)
    run2.font.color.rgb = FOREST_GREEN
    run2.font.name = "Calibri"

    doc.add_paragraph()

    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run3 = p3.add_run("Prepared by: NetCoreSolutions")
    run3.font.size = Pt(12)
    run3.font.color.rgb = MED_GRAY
    run3.font.name = "Calibri"

    p4 = doc.add_paragraph()
    p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run4 = p4.add_run("Date: April 7, 2026")
    run4.font.size = Pt(12)
    run4.font.color.rgb = MED_GRAY
    run4.font.name = "Calibri"

    p5 = doc.add_paragraph()
    p5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run5 = p5.add_run("CONFIDENTIAL")
    run5.bold = True
    run5.font.size = Pt(11)
    run5.font.color.rgb = ACCENT_RED
    run5.font.name = "Calibri"

    doc.add_page_break()

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TABLE OF CONTENTS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    add_heading_styled(doc, "Table of Contents", level=1, color=CORAL)
    doc.add_paragraph()

    toc_items = [
        "1. Executive Summary",
        "2. Website Audit",
        "    2.1 Site Structure",
        "    2.2 SEO Elements",
        "    2.3 Content Volume",
        "    2.4 Trust Signals",
        "    2.5 Critical Issues",
        "3. Competitor Analysis",
        "    3.1 Market Overview",
        "    3.2 HavenInLipa vs Market",
        "    3.3 Airbnb Strengths & Weaknesses",
        "4. Content Strategy",
        "    4.1 Topic Clusters",
        "    4.2 Priority Content Roadmap",
        "    4.3 Content Gap Analysis",
        "5. Recommendations & Next Steps",
        "    5.1 Immediate Actions (Week 1\u20132)",
        "    5.2 Mid-Term (Month 1\u20133)",
        "    5.3 Long-Term (Month 3\u20136)",
    ]
    for item in toc_items:
        p = doc.add_paragraph(item)
        p.paragraph_format.space_after = Pt(2)
        for run in p.runs:
            run.font.size = Pt(10.5)
            run.font.name = "Calibri"
            if not item.startswith("    "):
                run.bold = True

    doc.add_page_break()

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 1. EXECUTIVE SUMMARY
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    add_heading_styled(doc, "1. Executive Summary", level=1, color=CORAL)

    add_body(doc, (
        "This report presents a comprehensive SEO audit for HavenInLipa.com, a short-term "
        "rental property website based in Lipa City, Batangas, Philippines. The site offers "
        "two vacation rental properties: a Spacious 2BR unit (\u20B12,800/night, 9 pax) and a "
        "Cozy 1BR unit (\u20B12,000/night, 5 pax). Built on Next.js with Tailwind CSS and "
        "hosted on Vercel, the site leverages a modern tech stack but has critical content "
        "and SEO gaps that limit its organic search visibility."
    ))

    add_heading_styled(doc, "Key Findings", level=2, color=FOREST_GREEN)

    findings = [
        ("Overall SEO Score: 6/10 \u2014 ",
         "Strong technical foundation with modern stack, but critical content gaps hold back organic performance."),
        ("Perfect guest ratings: ",
         "5.0-star rating across 51 verified reviews and 200+ happy guests \u2014 a powerful trust signal not fully leveraged for SEO."),
        ("Minimal content footprint: ",
         "Only 3 indexed pages with approximately 1,400 total words. Competitor benchmark is 2,000\u20135,000+ words."),
        ("No blog or content hub: ",
         "Zero informational content targeting top-of-funnel travel queries for Lipa City."),
        ("Broken legal pages: ",
         "Privacy Policy, Terms of Service, and Booking Policy pages all link to # (non-functional)."),
        ("No Google Business Profile: ",
         "Missing a critical local SEO asset for appearing in Maps and local search results."),
        ("Competitive opportunity: ",
         "With 171 Airbnb listings in Lipa and -23% YoY revenue decline, HavenInLipa can differentiate through direct booking savings and local expertise content."),
    ]
    for bold_part, rest in findings:
        add_bullet(doc, rest, bold_prefix=bold_part)

    add_heading_styled(doc, "Overall SEO Health Score", level=2, color=FOREST_GREEN)
    add_score_box(doc, "Current SEO Score", "6", color=ACCENT_ORANGE)

    doc.add_page_break()

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 2. WEBSITE AUDIT
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    add_heading_styled(doc, "2. Website Audit", level=1, color=CORAL)

    # 2.1 Site Structure
    add_heading_styled(doc, "2.1 Site Structure", level=2, color=FOREST_GREEN)

    add_body(doc, (
        "HavenInLipa.com has a minimal site structure with only 3 indexed pages. "
        "The site lacks a blog, FAQ section, and working legal pages."
    ))

    add_styled_table(doc,
        ["Element", "Status", "Details"],
        [
            ["Pages Indexed", "3", "Homepage + 2 property pages"],
            ["Sitemap.xml", "\u2705 Present", "3 URLs, daily/weekly frequency"],
            ["Robots.txt", "\u2705 Present", "Allows all, blocks /admin/ and /api/"],
            ["Blog/Content Hub", "\u274C Missing", "Zero informational content"],
            ["Legal Pages", "\u274C Broken", "Privacy, Terms, Booking all link to #"],
        ],
        col_widths=[1.8, 1.2, 3.5],
    )

    doc.add_paragraph()

    # 2.2 SEO Elements
    add_heading_styled(doc, "2.2 SEO Elements", level=2, color=FOREST_GREEN)

    add_body(doc, (
        "Core on-page SEO elements are well-implemented across all three pages. "
        "Schema markup is a standout strength with LocalBusiness + FAQ on the homepage "
        "and VacationRental on property pages."
    ))

    add_styled_table(doc,
        ["Element", "Homepage", "2BR Page", "1BR Page"],
        [
            ["Title Tag", "\u2705", "\u2705", "\u2705"],
            ["Meta Description", "\u2705", "\u2705", "\u2705"],
            ["H1", "\u2705", "\u2705", "\u2705"],
            ["Open Graph", "\u2705", "\u2705", "\u2705"],
            ["Twitter Cards", "\u2705", "\u2705", "\u2705"],
            ["Schema Markup", "\u2705 LocalBusiness + FAQ", "\u2705 VacationRental", "\u2705 VacationRental"],
            ["Canonical Tags", "\u26A0\uFE0F Not detected", "\u26A0\uFE0F Not detected", "\u26A0\uFE0F Not detected"],
            ["Image Alt Text", "\u2705", "\u2705", "\u2705"],
        ],
        col_widths=[1.8, 1.6, 1.6, 1.6],
    )

    doc.add_paragraph()

    # 2.3 Content Volume
    add_heading_styled(doc, "2.3 Content Volume", level=2, color=FOREST_GREEN)

    add_body(doc, (
        "Content volume is critically low across all pages. The total indexed word count "
        "of approximately 1,400 words falls far below the competitor benchmark of 2,000\u20135,000+ words."
    ))

    add_styled_table(doc,
        ["Page", "Word Count", "Assessment"],
        [
            ["Homepage", "~730 words", "Thin \u2014 needs expansion"],
            ["Spacious 2BR Property", "~300\u2013400 words", "Minimal \u2014 lacks detail"],
            ["Cozy 1BR Property", "~300\u2013400 words", "Minimal \u2014 lacks detail"],
            ["Total Indexed", "~1,400 words", "Below competitor benchmark"],
            ["Competitor Benchmark", "2,000\u20135,000+ words", "Target range"],
        ],
        col_widths=[2.5, 1.8, 2.5],
    )

    doc.add_paragraph()

    # 2.4 Trust Signals
    add_heading_styled(doc, "2.4 Trust Signals", level=2, color=FOREST_GREEN)

    add_body(doc, "HavenInLipa has strong trust signals that should be better leveraged for SEO and conversion:")

    trust_signals = [
        ("51 verified guest reviews: ", "All rated 5.0 stars \u2014 exceptional social proof."),
        ("\"200+ Happy Guests\" stat: ", "Displayed on homepage, reinforces credibility."),
        ("Social media presence: ", "Active on Facebook, Instagram, and TikTok."),
        ("Contact form with 24hr response SLA: ", "Sets clear response expectations."),
        ("GCash + BPI payment options: ", "Local payment methods build trust with Filipino travelers."),
    ]
    for bold_part, rest in trust_signals:
        add_bullet(doc, rest, bold_prefix=bold_part)

    doc.add_paragraph()

    # 2.5 Critical Issues
    add_heading_styled(doc, "2.5 Critical Issues", level=2, color=FOREST_GREEN)

    add_body(doc, (
        "The following 12 issues were identified, categorized by severity: "
        "\U0001F534 Critical, \U0001F7E1 Important, \U0001F7E2 Minor."
    ))

    add_styled_table(doc,
        ["#", "Issue", "Severity", "Impact"],
        [
            ["1", "No blog/content hub", "\U0001F534 Critical", "Zero organic traffic for informational queries"],
            ["2", "Broken legal pages (Privacy, Terms, Booking)", "\U0001F534 Critical", "Trust & compliance risk"],
            ["3", "No house rules/policies on property pages", "\U0001F7E1 Important", "Booking friction, guest expectations unclear"],
            ["4", "No check-in/check-out times displayed", "\U0001F7E1 Important", "Missing key decision-making info"],
            ["5", "No cancellation policy visible", "\U0001F7E1 Important", "Booking hesitation for risk-averse travelers"],
            ["6", "Thin homepage content (~730 words)", "\U0001F7E1 Important", "Weak topical authority signal"],
            ["7", "No reviews displayed on homepage", "\U0001F7E1 Important", "Underutilized social proof"],
            ["8", "\"5+ Properties\" claim but only 2 shown", "\U0001F7E1 Important", "Credibility gap"],
            ["9", "No booking calendar widget", "\U0001F7E1 Important", "Conversion friction"],
            ["10", "No canonical tags detected", "\U0001F7E2 Minor", "Potential duplicate content risk"],
            ["11", "No Google Analytics detected", "\U0001F7E2 Minor", "No performance tracking"],
            ["12", "Broken #testimonials footer link", "\U0001F7E2 Minor", "Poor UX, broken internal link"],
        ],
        col_widths=[0.4, 3.0, 1.2, 2.2],
    )

    doc.add_page_break()

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 3. COMPETITOR ANALYSIS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    add_heading_styled(doc, "3. Competitor Analysis", level=1, color=CORAL)

    add_body(doc, (
        "The Lipa City short-term rental market is dominated by Airbnb listings. "
        "This analysis benchmarks HavenInLipa against the broader Lipa market data "
        "to identify positioning opportunities."
    ))

    # 3.1 Market Overview
    add_heading_styled(doc, "3.1 Market Overview", level=2, color=FOREST_GREEN)

    add_styled_table(doc,
        ["Metric", "Value"],
        [
            ["Active Listings in Lipa", "171"],
            ["Average Daily Rate", "$103/night"],
            ["Occupancy Rate", "24.4%"],
            ["Median Annual Revenue", "$7,325"],
            ["YoY Revenue Change", "-23.0%"],
            ["Domestic Travelers", "83.1%"],
            ["Top Demographic", "Gen Z (50%)"],
            ["Peak Season", "December, April, May"],
        ],
        col_widths=[3.0, 3.0],
    )

    doc.add_paragraph()

    # 3.2 HavenInLipa vs Market
    add_heading_styled(doc, "3.2 HavenInLipa vs Market", level=2, color=FOREST_GREEN)

    add_styled_table(doc,
        ["Metric", "HavenInLipa", "Market Median", "Top 25%"],
        [
            ["ADR (2BR)", "~$50/night", "$40/night", "$110+/night"],
            ["ADR (1BR)", "~$36/night", "$40/night", "$110+/night"],
            ["Rating", "5.0\u2605", "\u2014", "4.89\u2605"],
            ["Reviews", "51", "\u2014", "\u2014"],
        ],
        col_widths=[1.5, 1.8, 1.8, 1.5],
    )

    doc.add_paragraph()

    # 3.3 Airbnb Strengths & Weaknesses
    add_heading_styled(doc, "3.3 Airbnb Strengths & Weaknesses", level=2, color=FOREST_GREEN)

    add_body(doc, "Airbnb Strengths (Threats to HavenInLipa):", bold=True)
    airbnb_strengths = [
        "Massive brand authority and domain rating (DR 90+)",
        "Built-in search, filtering, and booking infrastructure",
        "Instant trust through verified reviews and Superhost badges",
        "171 competing listings in the Lipa market",
        "Mobile app with push notifications for deal alerts",
    ]
    for item in airbnb_strengths:
        add_bullet(doc, item)

    add_body(doc, "Airbnb Weaknesses (Opportunities for HavenInLipa):", bold=True)
    airbnb_weaknesses = [
        "High service fees (14\u201320%) \u2014 direct booking saves guests money",
        "Generic property descriptions \u2014 HavenInLipa can offer richer local content",
        "No local expertise content (travel guides, restaurant recs, itineraries)",
        "Declining market (-23% YoY) means hosts are looking for alternatives",
        "No personalized guest communication pre-booking",
        "Cookie-cutter listing format limits brand differentiation",
    ]
    for item in airbnb_weaknesses:
        add_bullet(doc, item)

    doc.add_page_break()

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 4. CONTENT STRATEGY
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    add_heading_styled(doc, "4. Content Strategy", level=1, color=CORAL)

    # 4.1 Topic Clusters
    add_heading_styled(doc, "4.1 Topic Clusters", level=2, color=FOREST_GREEN)

    add_body(doc, (
        "Five core topic clusters have been identified to build topical authority "
        "and capture organic search traffic across the travel decision funnel."
    ))

    clusters = [
        ("Cluster 1: Short-Term Rentals in Lipa City",
         ["short term rental lipa city", "vacation rental lipa batangas", "airbnb alternative lipa",
          "affordable staycation lipa", "private pool villa lipa"]),
        ("Cluster 2: Things to Do in Lipa City",
         ["things to do in lipa city", "lipa city tourist spots", "lipa batangas attractions",
          "mt maculot hiking guide", "taal volcano day trip from lipa"]),
        ("Cluster 3: Weekend Getaway / Staycation",
         ["weekend getaway near manila", "staycation batangas", "family staycation lipa",
          "couple retreat batangas", "remote work staycation philippines"]),
        ("Cluster 4: Travel Planning & Logistics",
         ["how to get to lipa from manila", "lipa city travel guide", "best restaurants in lipa",
          "lipa city food trip", "batangas road trip itinerary"]),
        ("Cluster 5: Direct Booking & Value",
         ["book direct vs airbnb", "save on vacation rental fees", "why book direct accommodation",
          "direct booking benefits philippines", "vacation rental no service fee"]),
    ]

    for cluster_name, keywords in clusters:
        add_body(doc, cluster_name, bold=True, color=FOREST_GREEN)
        for kw in keywords:
            add_bullet(doc, kw, level=0)

    doc.add_paragraph()

    # 4.2 Priority Content Roadmap
    add_heading_styled(doc, "4.2 Priority Content Roadmap", level=2, color=FOREST_GREEN)

    add_styled_table(doc,
        ["Priority", "Content Piece", "Target Keyword", "Intent", "Effort"],
        [
            ["1 \u2014 High", "Homepage SEO Overhaul", "short term rental lipa city", "Transactional", "Medium"],
            ["2 \u2014 High", "Things to Do in Lipa City Guide", "things to do in lipa city", "Informational", "Medium"],
            ["3 \u2014 High", "Weekend Getaway Near Manila", "weekend getaway near manila", "Commercial", "Medium"],
            ["4 \u2014 High", "Mt. Maculot Hiking Guide", "mt maculot hiking guide", "Informational", "Medium"],
            ["5 \u2014 High", "Best Restaurants in Lipa City", "best restaurants lipa city", "Informational", "Medium"],
            ["6 \u2014 High", "Why Book Direct vs Airbnb", "book direct vs airbnb", "Commercial", "Low"],
            ["7 \u2014 Medium", "Taal Volcano Day Trip Guide", "taal volcano day trip from lipa", "Informational", "Medium"],
            ["8 \u2014 Medium", "Holy Week Getaway in Lipa", "holy week getaway batangas", "Seasonal", "Low"],
            ["9 \u2014 Medium", "Remote Work Staycation Guide", "remote work staycation philippines", "Informational", "Low"],
            ["10 \u2014 Medium", "How to Get to Lipa from Manila", "how to get to lipa from manila", "Informational", "Low"],
        ],
        col_widths=[1.0, 2.2, 2.0, 1.0, 0.8],
    )

    doc.add_paragraph()

    # 4.3 Content Gap Analysis
    add_heading_styled(doc, "4.3 Content Gap Analysis", level=2, color=FOREST_GREEN)

    add_body(doc, "Critical Gaps (Must Fix):", bold=True, color=ACCENT_RED)
    critical_gaps = [
        "No blog or content hub \u2014 zero informational content for organic traffic",
        "No location/destination content \u2014 missing \"things to do\" and travel guide pages",
        "No comparison content \u2014 no \"direct booking vs Airbnb\" differentiation",
        "No FAQ page \u2014 despite FAQ schema on homepage, no dedicated FAQ content",
        "No seasonal content \u2014 missing peak season (Dec, Apr, May) travel content",
    ]
    for item in critical_gaps:
        add_bullet(doc, item)

    add_body(doc, "Content Depth Gaps:", bold=True, color=ACCENT_ORANGE)
    depth_gaps = [
        "Property pages at 300\u2013400 words \u2014 need expansion to 1,500+ words with amenity details, nearby attractions, house rules",
        "Homepage at ~730 words \u2014 needs expansion with neighborhood info, booking benefits, testimonial highlights",
        "No guest review content on property pages \u2014 reviews exist but are not displayed where they matter most",
        "No photo galleries with alt text \u2014 image SEO opportunity missed",
        "No area guide integration \u2014 property pages should link to local attraction content",
    ]
    for item in depth_gaps:
        add_bullet(doc, item)

    add_body(doc, "Trust & Conversion Gaps:", bold=True, color=ACCENT_YELLOW)
    trust_gaps = [
        "No Google Business Profile \u2014 missing local search visibility and Maps presence",
        "No cancellation/refund policy published \u2014 booking friction for cautious travelers",
        "No check-in/check-out times visible \u2014 key decision-making information missing",
        "\"5+ Properties\" claim with only 2 shown \u2014 credibility concern",
        "No booking calendar widget \u2014 forces users to contact for availability instead of self-serve",
    ]
    for item in trust_gaps:
        add_bullet(doc, item)

    doc.add_page_break()

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 5. RECOMMENDATIONS & NEXT STEPS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    add_heading_styled(doc, "5. Recommendations & Next Steps", level=1, color=CORAL)

    # 5.1 Immediate Actions
    add_heading_styled(doc, "5.1 Immediate Actions (Week 1\u20132)", level=2, color=FOREST_GREEN)

    add_body(doc, (
        "These are high-priority fixes that should be addressed immediately to resolve "
        "trust issues and establish baseline SEO infrastructure."
    ))

    immediate_actions = [
        ("Fix broken legal pages: ", "Create and publish proper Privacy Policy, Terms of Service, and Booking Policy pages with actual content."),
        ("Add house rules and policies: ", "Include check-in/check-out times, house rules, and cancellation policy on each property page."),
        ("Implement canonical tags: ", "Add self-referencing canonical tags to all pages to prevent potential duplicate content issues."),
        ("Set up Google Analytics 4: ", "Install GA4 tracking to monitor traffic, user behavior, and conversion events."),
        ("Create Google Business Profile: ", "Set up and verify a GBP listing for HavenInLipa to appear in local search and Google Maps."),
        ("Add reviews to homepage: ", "Display a curated selection of the 51 five-star reviews on the homepage for immediate social proof."),
        ("Fix #testimonials footer link: ", "Ensure the testimonials anchor link in the footer navigates to the correct section."),
    ]
    for bold_part, rest in immediate_actions:
        add_bullet(doc, rest, bold_prefix=bold_part)

    # 5.2 Mid-Term
    add_heading_styled(doc, "5.2 Mid-Term Strategy (Month 1\u20133)", level=2, color=FOREST_GREEN)

    add_body(doc, (
        "These initiatives build the content foundation needed for organic traffic growth "
        "and improved search visibility."
    ))

    midterm_actions = [
        ("Launch blog with 5 high-priority articles: ", "Publish the top 5 content pieces from the priority roadmap, starting with \"Things to Do in Lipa City\" and \"Weekend Getaway Near Manila\"."),
        ("Implement internal linking strategy: ", "Cross-link blog articles to property pages and vice versa, creating a cohesive content ecosystem."),
        ("Add booking calendar widget: ", "Integrate an availability calendar on property pages to reduce booking friction and enable self-serve scheduling."),
        ("Expand property descriptions: ", "Enhance property pages from 300\u2013400 words to 1,500+ words with detailed amenity lists, nearby attractions, and guest testimonials."),
        ("Set up Google Search Console monitoring: ", "Configure GSC to track indexing status, search queries, and click-through rates."),
    ]
    for bold_part, rest in midterm_actions:
        add_bullet(doc, rest, bold_prefix=bold_part)

    # 5.3 Long-Term
    add_heading_styled(doc, "5.3 Long-Term Growth (Month 3\u20136)", level=2, color=FOREST_GREEN)

    add_body(doc, (
        "These strategic initiatives scale organic visibility and establish HavenInLipa "
        "as the authoritative voice for Lipa City travel and accommodation."
    ))

    longterm_actions = [
        ("Publish remaining 5 articles: ", "Complete the full 10-article content roadmap, covering seasonal and logistics content."),
        ("Build backlinks via local tourism sites: ", "Partner with Batangas tourism boards, travel bloggers, and local business directories for quality backlinks."),
        ("Create seasonal content calendar: ", "Plan content around peak seasons (December holidays, April/May summer, Holy Week) for timely organic traffic."),
        ("Monitor rankings and iterate: ", "Track keyword positions monthly, update content based on SERP changes, and double down on winning topics."),
        ("Consider Google Ads for transactional keywords: ", "Run targeted PPC campaigns for high-intent queries like \"vacation rental lipa city\" during peak booking seasons."),
        ("Expand to more properties: ", "As the portfolio grows, add new property pages following the optimized template established for existing listings."),
    ]
    for bold_part, rest in longterm_actions:
        add_bullet(doc, rest, bold_prefix=bold_part)

    add_divider(doc)

    # Footer note
    add_body(doc, (
        "This SEO Audit Report was prepared by NetCoreSolutions for HavenInLipa.com. "
        "All findings and recommendations are based on data collected as of April 2026. "
        "For questions or implementation support, contact the NetCoreSolutions team."
    ), italic=True, color=MED_GRAY, size=9)

    # ── Save ──
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    doc.save(OUTPUT_FILE)
    print(f"Report saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    generate_report()
