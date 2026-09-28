#!/usr/bin/env python3
"""
Generate a professional Full SEO Audit & Strategy Report DOCX for HavenInLipa.com
"""

from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
import os

# -- Brand Colors --
CORAL_PINK = RGBColor(0xFF, 0x53, 0x71)
FOREST_GREEN = RGBColor(0x3B, 0x53, 0x23)
DARK_TEXT = RGBColor(0x2D, 0x2D, 0x2D)
ACCENT_RED = RGBColor(0xD9, 0x3B, 0x3B)
ACCENT_GREEN = RGBColor(0x0D, 0x8A, 0x4E)
ACCENT_ORANGE = RGBColor(0xE8, 0x8A, 0x1A)
LIGHT_GRAY = RGBColor(0xF2, 0xF2, 0xF2)
MED_GRAY = RGBColor(0x66, 0x66, 0x66)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)


# -- Helpers (same pattern as generate_report.py) --

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


def add_styled_table(doc, headers, rows, col_widths=None, header_color="3B5323"):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"

    # Header row
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        set_cell_shading(cell, header_color)
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


def add_score_box(doc, label, score, max_score=10, color=CORAL_PINK):
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


# -- Main --

def generate_report():
    doc = Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)

    # Default Font
    style = doc.styles["Normal"]
    font = style.font
    font.name = "Calibri"
    font.size = Pt(10.5)
    font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    # ========================================================================
    # COVER PAGE
    # ========================================================================

    # Try to add logo
    logo_path = "/Users/cedricpcastillo/Documents/VSCode/seo/Brand Assets/NCS Logo.png"
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_logo = p_logo.add_run()
        run_logo.add_picture(logo_path, width=Inches(2.5))

    for _ in range(4):
        doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("FULL SEO AUDIT &\nSTRATEGY REPORT")
    run.bold = True
    run.font.size = Pt(30)
    run.font.color.rgb = FOREST_GREEN
    run.font.name = "Calibri"

    doc.add_paragraph()

    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run2 = p2.add_run("haveninlipa.com")
    run2.bold = True
    run2.font.size = Pt(22)
    run2.font.color.rgb = CORAL_PINK
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
    run4 = p4.add_run("Date: April 6, 2026")
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

    # ========================================================================
    # TABLE OF CONTENTS
    # ========================================================================

    add_heading_styled(doc, "Table of Contents", level=1, color=FOREST_GREEN)
    doc.add_paragraph()

    toc_items = [
        "1. Executive Summary",
        "2. Website Audit",
        "    2.1 Site Structure & Architecture",
        "    2.2 SEO Health Assessment",
        "    2.3 Content & Trust Signals",
        "    2.4 Technical SEO Findings",
        "3. Competitor Analysis",
        "    3.1 Airbnb Market Overview",
        "    3.2 Market Data & Trends",
        "    3.3 Competitive Advantages",
        "4. Content Strategy",
        "    4.1 Topic Clusters",
        "    4.2 Priority Roadmap",
        "    4.3 Keyword Strategy",
        "5. SERP & Outline Strategy",
        "6. Content Production",
        "    6.1 Content Summary Table",
        "    6.2 Approach & Differentiation",
        "7. Recommendations & Next Steps",
        "    7.1 Immediate Actions (Week 1-2)",
        "    7.2 Mid-Term (Month 1-3)",
        "    7.3 Long-Term (Month 3-6)",
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

    # ========================================================================
    # 1. EXECUTIVE SUMMARY
    # ========================================================================

    add_heading_styled(doc, "1. Executive Summary", level=1, color=FOREST_GREEN)

    add_body(doc, (
        "This report presents a comprehensive SEO audit and content strategy for HavenInLipa.com, "
        "a short-term rental property in Lipa City, Batangas, Philippines. HavenInLipa operates two "
        "properties managed by host Melody: a Spacious 2BR Getaway (P2,800/night, up to 9 guests) "
        "and a Cozy 1BR Haven (P2,000/night, up to 5 guests, 400 Mbps WiFi, solar-powered)."
    ))

    add_heading_styled(doc, "Key Findings", level=2, color=CORAL_PINK)

    findings = [
        ("Design quality: ", "7.5/10 overall. Clean, modern interface with good visual appeal, but critical SEO gaps limit organic discoverability."),
        ("No blog or content infrastructure: ", "The site lacks a blog, FAQ section, schema markup, and sitemap.xml -- representing the largest missed opportunity for organic traffic."),
        ("Broken legal pages: ", "Privacy Policy, Terms of Service, and Booking Policy pages return errors or are non-functional."),
        ("Strong trust signals: ", "51+ verified 5-star reviews, 4.9 rating, 200+ guests hosted -- but these are not being leveraged for SEO."),
        ("Direct booking advantage: ", "Guests save 15-20% vs Airbnb by booking direct, but this value proposition is under-marketed."),
        ("Competitor landscape: ", "Airbnb dominates with 171 active listings in Lipa, $103 ADR, but 24.4% occupancy suggests market softness."),
    ]
    for bold_part, rest in findings:
        add_bullet(doc, rest, bold_prefix=bold_part)

    add_heading_styled(doc, "Overall Assessment", level=2, color=CORAL_PINK)

    add_score_box(doc, "Website Design Quality", "7.5", color=ACCENT_GREEN)
    add_score_box(doc, "SEO Readiness", "3.5", color=ACCENT_RED)
    add_score_box(doc, "Projected Score (Post-Implementation)", "8.5", color=ACCENT_GREEN)

    add_heading_styled(doc, "What We Delivered", level=2, color=CORAL_PINK)

    add_body(doc, (
        "This engagement produced 10 publish-ready content pieces totaling approximately 17,300 words, "
        "complete with SEO metadata (title tags, meta descriptions, URL slugs), internal linking suggestions, "
        "and FAQ sections optimized for featured snippets and AI search visibility."
    ))

    doc.add_page_break()

    # ========================================================================
    # 2. WEBSITE AUDIT
    # ========================================================================

    add_heading_styled(doc, "2. Website Audit", level=1, color=FOREST_GREEN)

    add_heading_styled(doc, "2.1 Site Structure & Architecture", level=2, color=CORAL_PINK)

    add_styled_table(doc,
        ["Element", "Current Status", "Assessment"],
        [
            ["Site Type", "Single-page scrolling + 2 property pages", "Limited keyword targeting"],
            ["Sitemap.xml", "Not found", "MISSING -- CRITICAL"],
            ["Blog / Content Hub", "None", "CRITICAL GAP"],
            ["FAQ Section", "None", "MISSING -- HIGH PRIORITY"],
            ["Schema Markup", "None detected", "MISSING -- HIGH PRIORITY"],
            ["Legal Pages", "Broken (Privacy, Terms, Booking Policy)", "NEEDS IMMEDIATE FIX"],
            ["Property Pages", "2 pages (2BR + 1BR)", "Good but incomplete"],
            ["Internal Linking", "Minimal, mostly navigation-based", "NEEDS EXPANSION"],
        ],
        col_widths=[1.8, 2.5, 2.2]
    )

    doc.add_paragraph()
    add_heading_styled(doc, "2.2 SEO Health Assessment", level=2, color=CORAL_PINK)

    add_styled_table(doc,
        ["Category", "Score", "Priority", "Notes"],
        [
            ["Site Architecture", "5/10", "HIGH", "Single-page + 2 property pages; needs blog and more pages"],
            ["Content Depth", "4/10", "HIGH", "Property descriptions are adequate but no supporting content"],
            ["Technical SEO", "3/10", "CRITICAL", "Missing sitemap, schema, broken legal pages"],
            ["Internal Linking", "3/10", "HIGH", "Minimal cross-linking; no content to link between"],
            ["Local SEO", "2/10", "CRITICAL", "No Google Business Profile optimization, no location schema"],
            ["Content Marketing", "1/10", "CRITICAL", "No blog, guides, or educational content"],
            ["Trust Signals", "8/10", "GOOD", "51+ reviews, 4.9 rating, 200+ guests -- strong foundation"],
            ["Visual Design", "7.5/10", "GOOD", "Clean, modern, appealing property photography"],
            ["Mobile Responsiveness", "7/10", "MODERATE", "Generally responsive design"],
            ["Booking Experience", "6/10", "MODERATE", "Direct messaging works but lacks calendar/widget"],
        ],
        col_widths=[1.5, 0.8, 1.0, 3.2]
    )

    doc.add_paragraph()
    add_heading_styled(doc, "2.3 Content & Trust Signals", level=2, color=CORAL_PINK)

    add_body(doc, "Properties Offered:", bold=True)
    add_bullet(doc, "Spacious 2BR Getaway -- P2,800/night, 9 guests, Netflix, WiFi, free parking, full kitchen")
    add_bullet(doc, "Cozy 1BR Haven -- P2,000/night, 5 guests, 400 Mbps WiFi, Netflix, solar-powered, full kitchen")

    doc.add_paragraph()
    add_body(doc, "Trust Signals Present:", bold=True)
    add_bullet(doc, "51+ verified 5-star reviews across platforms")
    add_bullet(doc, "4.9 average rating")
    add_bullet(doc, "200+ guests successfully hosted")
    add_bullet(doc, "Named host (Melody) -- personal touch and accountability")
    add_bullet(doc, "Direct communication channels (no chatbots)")

    doc.add_paragraph()
    add_body(doc, "Brand Voice & Tone:", bold=True)
    add_bullet(doc, "Casual, warm, and inviting -- like a friend recommending their favorite spot")
    add_bullet(doc, "Direct and honest about pricing and what to expect")
    add_bullet(doc, "Local expertise positioned as a key differentiator")

    doc.add_paragraph()
    add_heading_styled(doc, "2.4 Technical SEO Findings", level=2, color=CORAL_PINK)

    add_styled_table(doc,
        ["Element", "Status", "Impact", "Action Required"],
        [
            ["Title Tags", "Present (basic)", "MEDIUM", "Optimize with target keywords per page"],
            ["Meta Descriptions", "Present (basic)", "MEDIUM", "Rewrite for CTR optimization"],
            ["H1 Tags", "Present", "LOW", "Already functional"],
            ["Schema Markup", "None detected", "HIGH", "Implement LocalBusiness, VacationRental, Review, FAQPage"],
            ["Sitemap.xml", "Missing", "HIGH", "Create and submit to Google Search Console"],
            ["Open Graph Tags", "Not detected", "MEDIUM", "Add for social sharing (Facebook, Instagram)"],
            ["Image Alt Text", "Partial", "MEDIUM", "Add descriptive alt text to all property images"],
            ["Page Speed", "Adequate", "LOW", "Monitor after adding blog content"],
            ["SSL Certificate", "Present (HTTPS)", "LOW", "Good -- no action needed"],
            ["Legal Pages", "Broken/Empty", "HIGH", "Fix Privacy Policy, Terms, Booking Policy pages"],
        ],
        col_widths=[1.5, 1.2, 0.8, 3.0]
    )

    doc.add_page_break()

    # ========================================================================
    # 3. COMPETITOR ANALYSIS
    # ========================================================================

    add_heading_styled(doc, "3. Competitor Analysis", level=1, color=FOREST_GREEN)

    add_heading_styled(doc, "3.1 Airbnb Market Overview -- Lipa City", level=2, color=CORAL_PINK)

    add_body(doc, (
        "Airbnb is the primary competitor for HavenInLipa.com. As the dominant booking platform for "
        "short-term rentals, it represents both the main competition and the main discovery channel "
        "for potential guests. Understanding the Airbnb landscape in Lipa is critical for positioning."
    ))

    add_styled_table(doc,
        ["Metric", "Value"],
        [
            ["Active Listings in Lipa", "171"],
            ["Average Daily Rate (ADR)", "$103 USD"],
            ["Occupancy Rate", "24.4%"],
            ["Revenue per Available Room (RevPAR)", "$25.15"],
            ["Average Revenue per Listing", "$764/month"],
            ["Year-over-Year Trend", "-23% (market declining)"],
            ["Dominant Guest Type", "83% domestic travelers"],
            ["Primary Demographic", "50% Gen Z"],
            ["Peak Season", "Holy Week, Christmas, Summer"],
        ],
        col_widths=[2.5, 4.0]
    )

    doc.add_paragraph()
    add_heading_styled(doc, "3.2 Market Data & Trends", level=2, color=CORAL_PINK)

    add_bullet(doc, "The -23% YoY decline suggests market saturation or softening demand, but top-performing listings still thrive.", bold_prefix="Market Trend: ")
    add_bullet(doc, "At 24.4%, most Lipa listings are underperforming. This creates opportunity for well-marketed, differentiated properties.", bold_prefix="Low Occupancy: ")
    add_bullet(doc, "83% domestic travelers means marketing should be in Filipino/English, targeting Manila-based weekenders.", bold_prefix="Domestic Focus: ")
    add_bullet(doc, "Half of Airbnb guests in the area are Gen Z -- content strategy should reflect this demographic's preferences.", bold_prefix="Gen Z Dominant: ")

    doc.add_paragraph()
    add_heading_styled(doc, "3.3 Competitive Advantages vs Airbnb", level=2, color=CORAL_PINK)

    add_styled_table(doc,
        ["Factor", "Airbnb", "HavenInLipa (Direct)"],
        [
            ["Service Fees", "12-20% added to guest", "0% -- no platform fees"],
            ["Guest Savings", "Full platform price", "15-20% cheaper (direct)"],
            ["Communication", "Platform messaging (delays)", "Direct contact with Melody"],
            ["Local Expertise", "Generic listing info", "Personal recommendations, local tips"],
            ["Payment Options", "Credit card only", "GCash, bank transfer, flexible"],
            ["Personalization", "Standardized experience", "Custom requests accommodated"],
            ["Discovery", "High (platform traffic)", "Low (needs SEO/content strategy)"],
            ["Trust Building", "Platform reviews", "Personal relationship + reviews"],
        ],
        col_widths=[1.5, 2.5, 2.5]
    )

    doc.add_page_break()

    # ========================================================================
    # 4. CONTENT STRATEGY
    # ========================================================================

    add_heading_styled(doc, "4. Content Strategy", level=1, color=FOREST_GREEN)

    add_heading_styled(doc, "4.1 Topic Clusters", level=2, color=CORAL_PINK)

    add_body(doc, (
        "Content is organized into five strategic topic clusters, each designed to capture "
        "different stages of the guest journey from awareness to booking."
    ))

    clusters = [
        ["Property & Booking", "Homepage, Book Direct vs Airbnb", "Conversion / Transactional"],
        ["Travel Guide / Local", "Things to Do, How to Get to Lipa", "Informational / Navigational"],
        ["Attractions & Activities", "Mt. Maculot Guide, Taal Volcano, Restaurants", "Informational"],
        ["Lifestyle / Remote Work", "Remote Work Staycation", "Informational / Commercial"],
        ["Seasonal", "Holy Week Getaway, Weekend Getaway", "Commercial / Transactional"],
    ]

    add_styled_table(doc,
        ["Cluster", "Content Pieces", "Search Intent"],
        clusters,
        col_widths=[1.8, 2.7, 2.0]
    )

    doc.add_paragraph()
    add_heading_styled(doc, "4.2 Priority Roadmap", level=2, color=CORAL_PINK)

    add_body(doc, "Quick Wins (Week 1-2):", bold=True)
    add_bullet(doc, "Create and submit sitemap.xml to Google Search Console")
    add_bullet(doc, "Add schema markup (LocalBusiness, VacationRental, Review)")
    add_bullet(doc, "Fix broken legal pages (Privacy, Terms, Booking Policy)")
    add_bullet(doc, "Add FAQ section with FAQPage schema to homepage")
    add_bullet(doc, "Complete property pages (house rules, check-in/out, cancellation)")

    doc.add_paragraph()
    add_body(doc, "Foundational Content (Month 1):", bold=True)
    add_bullet(doc, "Publish homepage rewrite with SEO optimization")
    add_bullet(doc, "Launch blog section on website")
    add_bullet(doc, "Publish first 5 blog articles (prioritize Topics 2, 6, 3, 4, 5)")

    doc.add_paragraph()
    add_body(doc, "Growth Content (Month 2-3):", bold=True)
    add_bullet(doc, "Publish remaining 5 blog articles")
    add_bullet(doc, "Build internal linking strategy across all content")
    add_bullet(doc, "Set up Google Business Profile")

    doc.add_paragraph()
    add_heading_styled(doc, "4.3 Keyword Strategy", level=2, color=CORAL_PINK)

    add_styled_table(doc,
        ["Keyword", "Search Intent", "Competition", "Priority"],
        [
            ["short-term rental Lipa City Batangas", "Transactional", "Low", "HIGH"],
            ["things to do in Lipa City", "Informational", "Low-Medium", "HIGH"],
            ["weekend getaway near Manila Batangas", "Commercial", "Medium", "HIGH"],
            ["Mt Maculot hiking guide", "Informational", "Medium", "HIGH"],
            ["best restaurants Lipa City", "Informational", "Low", "MEDIUM"],
            ["Airbnb alternative Philippines", "Commercial", "Medium", "HIGH"],
            ["Taal Volcano day trip", "Informational", "Medium", "MEDIUM"],
            ["Holy Week getaway Batangas", "Commercial", "Low-Medium", "MEDIUM"],
            ["remote work staycation Philippines", "Commercial", "Low", "MEDIUM"],
            ["how to get to Lipa from Manila", "Informational", "Low", "HIGH"],
        ],
        col_widths=[2.5, 1.3, 1.2, 1.0]
    )

    doc.add_page_break()

    # ========================================================================
    # 5. SERP & OUTLINE STRATEGY
    # ========================================================================

    add_heading_styled(doc, "5. SERP & Outline Strategy", level=1, color=FOREST_GREEN)

    add_body(doc, (
        "Each of the 10 content topics was analyzed against top-ranking search results to identify "
        "common patterns, structural elements, and gaps that our content could exploit for competitive advantage."
    ))

    add_heading_styled(doc, "SERP Analysis Summary", level=2, color=CORAL_PINK)

    add_styled_table(doc,
        ["#", "Topic / Keyword", "Content Type", "Competition", "Our Angle"],
        [
            ["1", "Homepage (short-term rental Lipa)", "Landing Page", "Low", "Local expertise + direct booking savings"],
            ["2", "Things to Do in Lipa City", "Listicle / Guide", "Low-Medium", "Insider tips with costs, hours, practical details"],
            ["3", "Weekend Getaway Lipa", "Destination Guide", "Medium", "Budget-focused, 48-hour itinerary included"],
            ["4", "Mt. Maculot Hiking Guide", "How-to Guide", "Medium", "2026 updated info, difficulty breakdown, gear list"],
            ["5", "Best Restaurants Lipa", "Listicle / Review", "Low", "Local favorites + price ranges + insider tips"],
            ["6", "Book Direct vs Airbnb", "Comparison / Opinion", "Medium", "Fee breakdown with actual savings calculations"],
            ["7", "Taal Volcano Day Trip", "Itinerary Guide", "Medium", "From Lipa angle (unique positioning)"],
            ["8", "Holy Week Getaway", "Seasonal Guide", "Low-Medium", "Religious + leisure combo, family-friendly"],
            ["9", "Remote Work Staycation", "Lifestyle Guide", "Low", "400 Mbps WiFi proof, actual workspace details"],
            ["10", "How to Get to Lipa", "Utility / Directions", "Low", "Multi-modal options with exact fares/times"],
        ],
        col_widths=[0.3, 1.8, 1.2, 1.0, 2.2]
    )

    doc.add_paragraph()
    add_body(doc, "Key SERP Patterns Observed:", bold=True)
    add_bullet(doc, "Top-ranking local content tends to be thin and outdated -- significant opportunity for comprehensive, current guides")
    add_bullet(doc, "Few competitors include practical details (costs, hours, exact directions) -- this is our differentiation angle")
    add_bullet(doc, "FAQ sections with schema markup consistently earn featured snippet placements for local queries")
    add_bullet(doc, "Most Lipa/Batangas content is generic travel blog content -- localized expertise from a resident host is a strong E-E-A-T signal")

    doc.add_page_break()

    # ========================================================================
    # 6. CONTENT PRODUCTION
    # ========================================================================

    add_heading_styled(doc, "6. Content Production", level=1, color=FOREST_GREEN)

    add_heading_styled(doc, "6.1 Content Summary Table", level=2, color=CORAL_PINK)

    add_body(doc, (
        "All 10 content pieces have been written and are publish-ready. Each includes SEO metadata "
        "(title tag, meta description, URL slug), FAQ sections, internal linking suggestions, and "
        "a natural integration of HavenInLipa's booking CTA."
    ))

    add_styled_table(doc,
        ["#", "Title", "Slug", "Words", "Target Keyword"],
        [
            ["1", "Homepage Rewrite", "/", "~1,500", "short-term rental Lipa City Batangas"],
            ["2", "15 Things to Do in Lipa", "/blog/things-to-do-in-lipa-city-batangas", "~2,500", "things to do in Lipa City"],
            ["3", "Weekend Getaway", "/blog/weekend-getaway-lipa-city-batangas", "~1,800", "weekend getaway near Manila Batangas"],
            ["4", "Mt. Maculot Guide", "/blog/mt-maculot-hiking-guide", "~2,000", "Mt Maculot hiking guide"],
            ["5", "Best Restaurants", "/blog/best-restaurants-lipa-city-batangas", "~1,800", "best restaurants Lipa City"],
            ["6", "Book Direct vs Airbnb", "/blog/why-book-direct-instead-of-airbnb", "~1,500", "Airbnb alternative Philippines"],
            ["7", "Taal Volcano Day Trip", "/blog/taal-volcano-day-trip-from-lipa", "~1,500", "Taal Volcano day trip"],
            ["8", "Holy Week Getaway", "/blog/holy-week-getaway-lipa-city-batangas", "~1,500", "Holy Week getaway Batangas"],
            ["9", "Remote Work Staycation", "/blog/remote-work-staycation-lipa-city", "~1,500", "remote work staycation Philippines"],
            ["10", "How to Get to Lipa", "/blog/how-to-get-to-lipa-from-manila", "~1,200", "how to get to Lipa from Manila"],
        ],
        col_widths=[0.3, 1.5, 2.0, 0.6, 2.1]
    )

    doc.add_paragraph()
    add_body(doc, "Total: approximately 17,300 words across 10 publish-ready content pieces.", bold=True)

    doc.add_paragraph()
    add_heading_styled(doc, "6.2 Approach & Differentiation", level=2, color=CORAL_PINK)

    add_body(doc, "Content Approach:", bold=True)
    add_bullet(doc, "Casual, conversational tone matching HavenInLipa's brand voice -- like a friend giving recommendations")
    add_bullet(doc, "Every article includes practical details that competitors skip: exact costs, hours, insider tips, and current 2026 information")
    add_bullet(doc, "Natural integration of HavenInLipa booking CTAs without being pushy or sales-heavy")
    add_bullet(doc, "FAQ sections on every article, designed for FAQPage schema markup and featured snippet capture")

    doc.add_paragraph()
    add_body(doc, "Content Differentiation Strategy:", bold=True)
    add_bullet(doc, "Local expertise: Written from the perspective of a Lipa-based host, not a generic travel blogger", bold_prefix="E-E-A-T Advantage: ")
    add_bullet(doc, "Complete 2026 pricing, routes, and logistics that competitors' outdated content lacks", bold_prefix="Freshness: ")
    add_bullet(doc, "Every piece links to related articles and property pages, building topical authority", bold_prefix="Internal Linking: ")
    add_bullet(doc, "FAQ sections, structured content, and comprehensive coverage designed for AI search citation", bold_prefix="AI Search Ready: ")

    doc.add_page_break()

    # ========================================================================
    # 7. RECOMMENDATIONS & NEXT STEPS
    # ========================================================================

    add_heading_styled(doc, "7. Recommendations & Next Steps", level=1, color=FOREST_GREEN)

    add_heading_styled(doc, "7.1 Immediate Actions (Week 1-2)", level=2, color=CORAL_PINK)

    immediate_actions = [
        ("Create and submit sitemap.xml ", "to Google Search Console -- this is the single most important technical fix"),
        ("Add schema markup: ", "LocalBusiness, VacationRental, Review, and FAQPage schemas across the site"),
        ("Fix broken legal pages: ", "Privacy Policy, Terms of Service, and Booking Policy must be functional"),
        ("Add FAQ section with schema ", "to the homepage -- targets featured snippet opportunities immediately"),
        ("Complete property pages: ", "Add house rules, check-in/check-out procedures, cancellation policy, and amenity details"),
        ("Publish homepage rewrite: ", "Replace current homepage content with the SEO-optimized version (Article 1)"),
    ]
    for bold_part, rest in immediate_actions:
        add_bullet(doc, rest, bold_prefix=bold_part)

    doc.add_paragraph()
    add_heading_styled(doc, "7.2 Mid-Term Strategy (Month 1-3)", level=2, color=CORAL_PINK)

    midterm_actions = [
        ("Launch blog ", "with first 5 articles -- prioritize Topics 2 (Things to Do), 6 (Book Direct), 3 (Weekend Getaway), 4 (Mt. Maculot), and 5 (Restaurants)"),
        ("Set up Google Business Profile ", "for HavenInLipa with complete information, photos, and review management"),
        ("Implement internal linking strategy ", "across all published content, connecting blog posts to property pages and each other"),
        ("Add booking calendar/widget ", "to the website for real-time availability checks and easier booking flow"),
        ("Set up Google Search Console ", "to monitor indexing, rankings, and search performance for all new content"),
        ("Create social sharing infrastructure: ", "Add Open Graph tags and social sharing buttons to all blog posts"),
    ]
    for bold_part, rest in midterm_actions:
        add_bullet(doc, rest, bold_prefix=bold_part)

    doc.add_paragraph()
    add_heading_styled(doc, "7.3 Long-Term Growth (Month 3-6)", level=2, color=CORAL_PINK)

    longterm_actions = [
        ("Publish remaining 5 articles ", "(Topics 7-10 plus any seasonal updates) to complete the initial content library"),
        ("Build backlinks ", "via local tourism sites, travel bloggers, Batangas tourism boards, and hiking community forums"),
        ("Create seasonal content calendar: ", "Plan content around Holy Week, Christmas, summer break, and long weekends throughout 2026-2027"),
        ("Expand property listings: ", "As new properties are added, create dedicated pages with full SEO optimization"),
        ("Monitor rankings and iterate: ", "Track keyword positions, traffic, and conversion rates; update content based on performance data"),
        ("Consider Google Ads ", "for high-intent transactional keywords like 'rental Lipa City' and 'Batangas accommodation' to supplement organic growth"),
        ("Explore video content: ", "Property walkthrough videos for YouTube can drive significant traffic and support booking conversion"),
    ]
    for bold_part, rest in longterm_actions:
        add_bullet(doc, rest, bold_prefix=bold_part)

    doc.add_paragraph()
    add_divider(doc)

    # Final note
    add_body(doc, (
        "This report and all 10 content pieces were prepared by NetCoreSolutions as part of a "
        "comprehensive SEO audit and content strategy engagement for HavenInLipa.com. "
        "All content is publish-ready and optimized for both traditional search engines and "
        "AI-powered search platforms."
    ), italic=True, color=MED_GRAY)

    # -- Save --
    output_path = "/Users/cedricpcastillo/Documents/VSCode/seo/content for HavenInLipa/HavenInLipa_Full_SEO_Strategy_Report.docx"
    doc.save(output_path)
    print(f"Report saved to: {output_path}")


if __name__ == "__main__":
    generate_report()
