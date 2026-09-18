#!/usr/bin/env python3
"""
Generate the May 8, 2026 Full SEO Audit & Strategy Report DOCX for HavenInLipa.com
Prepared by: NetCoreSolutions
Comparison chain: April 7, 2026 (baseline) -> April 15, 2026 (progress review) -> May 8, 2026 (this report)

Honest progress review framing: live site verification on May 8 surfaced 6 items
reported as shipped that were not actually live. The report reflects the real state.
"""

import os
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

# Brand Colors (NetCoreSolutions)
CORAL = RGBColor(0xFF, 0x53, 0x71)
FOREST_GREEN = RGBColor(0x3B, 0x53, 0x23)
DARK_TEXT = RGBColor(0x2C, 0x2C, 0x2C)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_GRAY = RGBColor(0xF2, 0xF2, 0xF2)
MED_GRAY = RGBColor(0x66, 0x66, 0x66)
ACCENT_RED = RGBColor(0xD9, 0x3B, 0x3B)
ACCENT_ORANGE = RGBColor(0xE8, 0x8A, 0x1A)
ACCENT_GREEN_LIGHT = RGBColor(0x0D, 0x8A, 0x4E)

BASE_DIR = "/Volumes/Files and Cloud/Dropbox/VSCode (non-Git)/seo"
LOGO_PATH = os.path.join(BASE_DIR, "Brand Assets", "NCS Logo.png")
OUTPUT_DIR = os.path.join(BASE_DIR, "content for HavenInLipa")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "HavenInLipa_Full_SEO_Strategy_Report_May8.docx")


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
    run = p.add_run("─" * 80)
    run.font.size = Pt(6)
    run.font.color.rgb = RGBColor(0xCC, 0xCC, 0xCC)


def generate_report():
    doc = Document()

    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2)
        section.right_margin = Cm(2)

    # COVER PAGE
    cover_para = doc.add_paragraph()
    cover_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover_para.paragraph_format.space_before = Pt(80)
    if os.path.exists(LOGO_PATH):
        run = cover_para.add_run()
        run.add_picture(LOGO_PATH, width=Inches(2.5))

    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_para.paragraph_format.space_before = Pt(40)
    run = title_para.add_run("FULL SEO AUDIT & STRATEGY REPORT")
    run.bold = True
    run.font.size = Pt(28)
    run.font.name = "Calibri"
    run.font.color.rgb = DARK_TEXT

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run("Honest Progress Review + Phase 2 Strategy + Phase 3 Content")
    run.italic = True
    run.font.size = Pt(13)
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
    run = date_para.add_run("Date: May 8, 2026")
    run.font.size = Pt(11)
    run.font.color.rgb = DARK_TEXT
    run.font.name = "Calibri"

    baseline = doc.add_paragraph()
    baseline.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = baseline.add_run("Baseline Chain: April 7, 2026 -> April 15, 2026 -> May 8, 2026")
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

    # TABLE OF CONTENTS
    add_heading_styled(doc, "Table of Contents", level=1, color=CORAL)
    toc_items = [
        "1. Executive Summary",
        "2. Progress Since April 15 (Honest Review)",
        "    2.1 Verified Wins",
        "    2.2 Reported-Shipped vs. Actually-Shipped",
        "    2.3 New Findings from Live Verification",
        "3. Website Audit (May 8 State)",
        "    3.1 Site Structure & Pages",
        "    3.2 Content Volume",
        "    3.3 Technical SEO",
        "    3.4 Trust Signals & Brand SERP",
        "4. Competitor Analysis",
        "    4.1 Lipa City STR Market Data (2026)",
        "    4.2 Brand SERP Position",
        "    4.3 Positioning Opportunities",
        "5. Content Strategy",
        "    5.1 Topic Cluster Status",
        "    5.2 Audience Segment Gaps",
        "    5.3 Target Keyword / Topic Set",
        "    5.4 Priority Content Plan",
        "6. SERP & Outline Strategy (Phase 2)",
        "    6.1 Family Staycation in Lipa - Outline",
        "    6.2 Romantic Getaway in Batangas - Outline",
        "    6.3 Property Page Expansion - Template",
        "7. Content Production (Phase 3)",
        "    7.1 Deliverables Summary",
        "    7.2 Approach & Differentiation",
        "8. Recommendations & Next Steps",
        "    8.1 Tier A - Verify & Ship (Week of May 8-22)",
        "    8.2 Tier B - Property Pages + New Content (Late May)",
        "    8.3 Tier C - Sustain + Scale (June+)",
        "    8.4 Tier D - Authority Building (Q3)",
        "    8.5 KPIs to Track",
    ]
    for item in toc_items:
        p = doc.add_paragraph()
        run = p.add_run(item)
        run.font.size = Pt(10.5)
        run.font.name = "Calibri"
        p.paragraph_format.space_after = Pt(2)

    doc.add_page_break()

    # 1. EXECUTIVE SUMMARY
    add_heading_styled(doc, "1. Executive Summary", level=1, color=CORAL)
    add_body(
        doc,
        "This Full SEO Audit & Strategy Report for HavenInLipa.com is a May 8, 2026 follow-up to the "
        "April 15 progress review. It captures the genuine wins of the past 23 days, calls out the "
        "items reported as shipped that were not actually live when verified, and lays out a focused "
        "strategy for the next 90 days. Live site verification was performed on May 8 against "
        "haveninlipa.com, blog.haveninlipa.com, sitemap files, and the brand SERP.",
    )
    add_body(
        doc,
        "The headline: HavenInLipa scaled blog content from 2 articles to 8 in three weeks, an "
        "exceptional content velocity that puts the site ahead of every direct competitor in Lipa's "
        "STR market. The Book Direct article serves as an effective comparison page. Yoast SEO is "
        "active with proper sitemap structure on the blog.",
    )
    add_body(
        doc,
        "However, six of the operational items reported as shipped on April 15 were not live when "
        "verified on May 8 - including the standalone FAQ page, the sitemap fix, the '5+ Properties' "
        "homepage copy correction, and a partial author byline fix. The brand SERP shows aggregators "
        "(Airbnb, Booking, Expedia) and competitor properties dominating queries that should belong "
        "to HavenInLipa. The Google Business Profile remains stuck at 4 reviews / 4.0 stars. These "
        "gaps now define the highest-leverage actions for the next two weeks.",
    )

    add_heading_styled(doc, "Verified Wins (April 15 -> May 8)", level=2, color=FOREST_GREEN)
    wins = [
        ("Blog scaled 2 -> 8 articles:", " Articles 3-9 published. Approximately 25,000+ new words live on blog.haveninlipa.com."),
        ("Audience reach via clusters:", " Cluster 2 (Things to Do) and Cluster 4 (Travel Planning) now near-comprehensive."),
        ("Book Direct comparison page:", " Article #6 serves as the commercial-keyword landing page with FAQ, internal links, and CTAs."),
        ("Yoast SEO active on blog:", " Breadcrumbs visible, sitemap_index.xml live with 4 sub-sitemaps."),
        ("Author byline upgraded:", " New articles use 'Cassandra Kim' as author (up from email-as-author)."),
        ("Privacy + Terms remain full:", " Both pages live with substantive content, last updated April 11."),
        ("Property page reviews growing:", " 2BR moved from 20 -> 21 reviews; 1BR holding at 32 reviews (no decline)."),
    ]
    for prefix, text in wins:
        add_bullet(doc, text, bold_prefix=prefix)

    add_heading_styled(doc, "Reported-Shipped but NOT Live as of May 8", level=2, color=ACCENT_RED)
    not_shipped = [
        ("'5+ Properties' homepage copy:", " Still reads '5+ Properties' despite only 2 listings shown."),
        ("Standalone /faq page:", " Does not exist. Only the homepage FAQ section is present."),
        ("Sitemap fix:", " Main sitemap.xml still lists only 3 URLs - /privacy and /terms NOT added."),
        ("Article #1 author byline:", " First blog article (Apr 7) still shows 'ccastillo@netcoresolutions.com' as author."),
        ("Property page alt text:", " Both property pages still use generic 'photo 1, photo 2' alt text patterns."),
        ("Article #10 (How to Get to Lipa):", " Returns 404 - drafted but not published. Reported as live."),
    ]
    for prefix, text in not_shipped:
        add_bullet(doc, text, bold_prefix=prefix)

    add_heading_styled(doc, "Critical Open Issues", level=2, color=ACCENT_ORANGE)
    priorities = [
        ("Google Business Profile review velocity:", " Still 4 reviews / 4.0 stars. Brand SERP shows aggregators, not own GBP. Single highest-leverage uncovered item."),
        ("Property pages still thin:", " 2BR ~450-500 words; 1BR ~550-600 words. With 8 articles potentially driving traffic, leakage risk is real."),
        ("Holy Week #8 timing miss:", " Published May 4, a month after Easter (Apr 5). Reframe to evergreen for 2027 capture."),
        ("Brand SERP visibility weak:", " 'haven in lipa reviews batangas' returns Airbnb, Booking, Expedia, and competitor properties. HavenInLipa not present."),
        ("Internal linking unaudited:", " 8 articles + 4 main-site pages with no documented linking matrix. Compounding value left on the table."),
    ]
    for prefix, text in priorities:
        add_bullet(doc, text, bold_prefix=prefix)

    add_heading_styled(doc, "Overall SEO Health Score", level=2, color=CORAL)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("April 15 (reported): ")
    run.font.size = Pt(13)
    run.font.name = "Calibri"
    run.font.color.rgb = DARK_TEXT
    run2 = p.add_run("8.0/10")
    run2.bold = True
    run2.font.size = Pt(16)
    run2.font.name = "Calibri"
    run2.font.color.rgb = MED_GRAY
    run3 = p.add_run("    ->    ")
    run3.font.size = Pt(14)
    run3.font.name = "Calibri"
    run4 = p.add_run("May 8 (verified): ")
    run4.font.size = Pt(13)
    run4.font.name = "Calibri"
    run4.font.color.rgb = DARK_TEXT
    run5 = p.add_run("7.5/10")
    run5.bold = True
    run5.font.size = Pt(20)
    run5.font.name = "Calibri"
    run5.font.color.rgb = ACCENT_ORANGE
    run6 = p.add_run("    (-0.5 vs. reported)")
    run6.bold = True
    run6.font.size = Pt(11)
    run6.font.name = "Calibri"
    run6.font.color.rgb = MED_GRAY

    add_body(
        doc,
        "Net progress vs. April 15: roughly sideways. Massive content volume win is offset by "
        "infrastructure debt and weak brand SERP. The score is honest, not flattering - and the "
        "actions to lift it back above 8.5 are mostly small, cheap fixes that compound fast.",
        italic=True,
        color=MED_GRAY,
    )

    doc.add_page_break()

    # 2. PROGRESS SINCE APRIL 15 (HONEST REVIEW)
    add_heading_styled(doc, "2. Progress Since April 15 (Honest Review)", level=1, color=CORAL)

    add_heading_styled(doc, "2.1 SEO Score Breakdown by Category", level=2, color=FOREST_GREEN)
    score_rows = [
        ["Technical Foundation", "7.0", "8.5", "8.0", "-0.5"],
        ["Content Volume", "2.0", "5.0", "8.0", "+3.0"],
        ["On-Page SEO", "6.0", "6.5", "6.5", "0.0"],
        ["Trust & Credibility", "5.0", "7.5", "7.5", "0.0"],
        ["Local SEO", "1.0", "8.0", "7.5", "-0.5"],
        ["Content Strategy", "1.0", "4.0", "8.0", "+4.0"],
        ["Indexing & Visibility", "1.0", "5.5", "6.0", "+0.5"],
        ["OVERALL", "6.0", "8.0", "7.5", "-0.5"],
    ]
    add_styled_table(
        doc,
        ["Category", "Apr 7", "Apr 15", "May 8", "Delta vs Apr 15"],
        score_rows,
        col_widths=[2.4, 0.9, 0.9, 0.9, 1.5],
    )

    add_heading_styled(doc, "2.2 Reported-Shipped vs. Actually-Shipped (Live Verification)", level=2, color=ACCENT_ORANGE)
    add_body(
        doc,
        "Live verification on May 8 inspected the homepage, sitemap.xml, robots.txt, both property "
        "pages, /privacy, /terms, blog homepage, blog sitemap_index.xml, and a sample blog article. "
        "Findings below.",
    )
    verify_rows = [
        ["Add /privacy + /terms to sitemap.xml", "Sitemap still lists only 3 URLs", "NOT shipped"],
        ["Fix '5+ Properties' homepage copy", "Homepage still says '5+ Properties'", "NOT shipped"],
        ["Build standalone /faq page", "Only homepage FAQ section exists", "NOT shipped"],
        ["Fix Article #1 author byline", "Apr 7 article still shows email-as-author", "NOT shipped"],
        ["Rewrite property page image alt text", "Both pages still use 'photo 1, photo 2'", "NOT shipped"],
        ["Add canonical tags site-wide", "Not visible on property page HTML", "Uncertain"],
        ["Publish all 8 articles (3-10)", "Article #10 returns 404; only 3-9 live", "PARTIAL"],
        ["Author byline for new articles", "All new articles show 'Cassandra Kim'", "Shipped"],
        ["Yoast SEO + sitemap on blog", "sitemap_index.xml live with 4 sub-sitemaps", "Shipped"],
        ["Privacy + Terms full content", "Both pages have substantive 650-800 words", "Shipped"],
        ["Book Direct vs Airbnb comparison", "Article #6 serves this function effectively", "Shipped (as blog)"],
    ]
    add_styled_table(
        doc,
        ["Item Reported as Shipped", "Live State on May 8", "Status"],
        verify_rows,
        col_widths=[2.6, 2.8, 1.0],
    )

    add_heading_styled(doc, "2.3 New Findings from Live Verification", level=2, color=FOREST_GREEN)
    new_findings = [
        ("Article #10 not published:", " 'How to Get to Lipa from Manila' (slug: how-to-get-to-lipa-from-manila) returns HTTP 404. Drafted but not pushed."),
        ("Holy Week timing miss:", " Article #8 published May 4. Easter 2026 was April 5 - the demand window had closed a month prior."),
        ("Stripe inconsistency:", " Homepage trust block shows GCash + BPI only. Terms of Service still references Stripe (6% card fee). Reconcile or clarify."),
        ("Brand SERP weakness:", " 'haven in lipa reviews batangas' surfaces Airbnb, Booking.com, Expedia, Hotels.com, Agoda, plus competitors (Baserri De Lipa, The Farm at San Benito). HavenInLipa is absent."),
        ("Property page review counts moving:", " 2BR went 20 -> 21 reviews; 1BR steady at 32. Movement is small but positive."),
        ("Sitemap last-modified suggests no expansion:", " 2BR last modified March 13; 1BR last modified April 5. Property page bodies have not been touched since the original audit."),
    ]
    for prefix, text in new_findings:
        add_bullet(doc, text, bold_prefix=prefix)

    doc.add_page_break()

    # 3. WEBSITE AUDIT
    add_heading_styled(doc, "3. Website Audit (May 8 State)", level=1, color=CORAL)

    add_heading_styled(doc, "3.1 Site Structure & Pages", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "HavenInLipa runs a two-domain architecture: the main site (haveninlipa.com on Next.js / "
        "Vercel) and the blog subdomain (blog.haveninlipa.com on WordPress + Yoast SEO). The split "
        "is intentional and healthy. Total indexable URLs in the ecosystem: approximately 14 "
        "(homepage + 2 property pages + Privacy + Terms + 8 published blog articles + blog category "
        "and tag archives).",
    )
    pages_rows = [
        ["Homepage", "haveninlipa.com", "~2,000", "LocalBusiness + FAQ"],
        ["Spacious 2BR Property", "/properties/spacious-2-bedroom", "~450-500", "VacationRental (proposed)"],
        ["Cozy 1BR Property", "/properties/cozy-1-bedroom", "~550-600", "VacationRental (proposed)"],
        ["Privacy Policy", "/privacy", "~650", "-"],
        ["Terms of Service", "/terms", "~800", "-"],
        ["Blog: 15 Things to Do (Apr 7)", "blog.haveninlipa.com/15-best-...", "~3,500", "Article"],
        ["Blog: Weekend Getaway (Apr 12)", "blog.haveninlipa.com/weekend-...", "~2,500", "Article"],
        ["Blog: Mt. Maculot Hiking (Apr 22)", "blog.haveninlipa.com/mt-maculot-...", "~3,000", "Article"],
        ["Blog: Best Restaurants (Apr 27)", "blog.haveninlipa.com/best-restaurants-...", "~3,000", "Article"],
        ["Blog: Book Direct vs Airbnb (Apr 29)", "blog.haveninlipa.com/why-book-direct-...", "~2,200", "Article + FAQ"],
        ["Blog: Taal Volcano Day Trip (May 1)", "blog.haveninlipa.com/taal-volcano-...", "~2,400", "Article"],
        ["Blog: Holy Week Getaway (May 4)", "blog.haveninlipa.com/holy-week-...", "~2,500", "Article"],
        ["Blog: Remote Work Staycation (May 6)", "blog.haveninlipa.com/work-from-lipa-...", "~2,200", "Article"],
        ["TOTAL ECOSYSTEM", "-", "~26,000+", "-"],
    ]
    add_styled_table(
        doc,
        ["Page", "URL", "Est. Words", "Schema"],
        pages_rows,
        col_widths=[2.3, 2.4, 1.0, 1.4],
    )

    add_heading_styled(doc, "3.2 Content Volume", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "Content volume has grown approximately 19x since April 7 and roughly 2.4x since April 15. "
        "The competitive benchmark for a Lipa STR website with 2 properties is 2,000-5,000 words "
        "across the core site plus 5-10 supporting blog articles. HavenInLipa has cleared the "
        "blog-article target and is now on the higher end of the content depth competitive curve.",
    )
    volume_rows = [
        ["Total ecosystem words", "~1,400", "~10,800", "~26,000+", "+140% vs Apr 15"],
        ["Main site pages", "3", "5", "5", "0"],
        ["Blog articles published", "0", "2", "8", "+6"],
        ["Avg. words per blog article", "-", "~3,000", "~2,700", "Steady"],
        ["Indexed clusters with content", "0", "2", "5 (all)", "Full coverage"],
    ]
    add_styled_table(
        doc,
        ["Metric", "Apr 7", "Apr 15", "May 8", "Change"],
        volume_rows,
        col_widths=[2.4, 1.0, 1.1, 1.1, 1.4],
    )

    add_heading_styled(doc, "3.3 Technical SEO", level=2, color=FOREST_GREEN)
    tech_rows = [
        ["Domain canonicalization (www -> non-www)", "Fixed Apr 15, holding", "OK"],
        ["Vercel auto-domain redirect", "Fixed Apr 15, holding", "OK"],
        ["robots.txt", "Standard config, blocks /admin and /api, references sitemap", "OK"],
        ["Main sitemap.xml", "3 URLs only - /privacy and /terms still missing", "ACTION NEEDED"],
        ["Blog sitemap_index.xml", "Yoast-generated, 4 sub-sitemaps (post/category/tag/author)", "OK"],
        ["GSC verification + sitemap submission", "Verified Apr 15, maintain", "OK"],
        ["Google indexing - blog", "Yoast schema visible; URL Inspection requested for blog", "OK"],
        ["Brand SERP for haveninlipa.com", "Aggregators (Airbnb/Booking) and competitors dominate", "ACTION NEEDED"],
        ["HTTPS / HSTS", "Enabled, holding", "OK"],
        ["CSP / Security headers", "Configured, holding", "OK"],
        ["Self-referencing canonical tags", "Not visible on property page HTML", "ACTION NEEDED"],
        ["Image alt text - blog", "Improved with new articles", "OK"],
        ["Image alt text - property pages", "Generic 'photo 1, photo 2'", "ACTION NEEDED"],
    ]
    add_styled_table(
        doc,
        ["Element", "May 8 State", "Status"],
        tech_rows,
        col_widths=[2.7, 3.4, 1.0],
    )

    add_heading_styled(doc, "3.4 Trust Signals & Brand SERP", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "Trust signals on the homepage are unchanged from April 15. The most important shift this "
        "report adds is the Brand SERP findings - the search results that surface when a prospective "
        "guest searches for HavenInLipa or related branded queries. As of May 8, the brand SERP "
        "weakness is the conversion choke point for any traffic the 8 published articles drive.",
    )
    trust_rows = [
        ["Total guest count claim", "280+ Happy Guests", "Unchanged"],
        ["Five-star review claim", "180+ Five-Star Reviews (across platforms)", "Unchanged"],
        ["Superhost badge", "3 Years Superhost Status displayed", "Unchanged"],
        ["Reviews on 2BR property page", "21 reviews displayed (was 20 on Apr 15)", "+1"],
        ["Reviews on 1BR property page", "32 reviews displayed", "Steady"],
        ["Google Business Profile reviews", "4 reviews / 4.0 stars - flow not launched", "BLOCKER"],
        ["Brand SERP for 'haven in lipa reviews batangas'", "Aggregators dominate; HavenInLipa absent", "BLOCKER"],
        ["Social media presence", "Facebook, Instagram, TikTok, Airbnb Superhost", "Unchanged"],
        ["Payment methods on homepage", "GCash, BPI InstaPay (Stripe in Terms only)", "Inconsistent"],
        ["Response time SLA", "24hr", "Maintained"],
        ["Legal pages (Privacy, Terms)", "Full content, last updated Apr 11", "OK"],
    ]
    add_styled_table(
        doc,
        ["Trust Signal", "May 8 State", "Status"],
        trust_rows,
        col_widths=[2.5, 3.5, 1.0],
    )

    doc.add_page_break()

    # 4. COMPETITOR ANALYSIS
    add_heading_styled(doc, "4. Competitor Analysis", level=1, color=CORAL)

    add_heading_styled(doc, "4.1 Lipa City STR Market Data (2026)", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "April 15 market data still holds. The Lipa City short-term rental market continues to "
        "show oversupply and declining per-listing revenue - opening for direct-booking operators "
        "with content + trust assets to take asymmetric share.",
    )
    market_rows = [
        ["Active listings in Lipa", "146-166 properties"],
        ["Average Daily Rate (ADR)", "$104/night (~PHP 5,800)"],
        ["HavenInLipa ADR (2BR)", "PHP 2,800/night - 52% below market"],
        ["HavenInLipa ADR (1BR)", "PHP 2,000/night - 65% below market"],
        ["Occupancy rate (market avg)", "24-32%"],
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

    add_heading_styled(doc, "4.2 Brand SERP Position (NEW)", level=2, color=ACCENT_ORANGE)
    add_body(
        doc,
        "Live search test on May 8 for 'haven in lipa reviews batangas' returned the following top "
        "results - none of them HavenInLipa:",
    )
    serp_rows = [
        ["1", "Airbnb - City of Lipa Vacation Rentals (4.9)"],
        ["2", "Booking.com - The 10 best resorts in Lipa"],
        ["3", "Expedia - TOP 10 Hotels in Lipa"],
        ["4", "Hotels.com - Top 10 Hotels in Lipa"],
        ["5", "Agoda - 11 Best Hotels in Lipa City, Batangas"],
        ["6", "TripAdvisor - 'haven in lipa' (review of Baserri De Lipa - competitor)"],
        ["7", "Expedia - Best Lipa Resorts from $43"],
        ["8", "culturalcreatives.org - 10 Resort in Lipa Batangas"],
    ]
    add_styled_table(
        doc,
        ["Rank", "Result"],
        serp_rows,
        col_widths=[0.6, 6.2],
    )
    add_body(
        doc,
        "The implication: even when a prospective guest is searching specifically for HavenInLipa "
        "(via the 'haven in lipa' modifier), Google is presenting OTAs and competitors instead. "
        "Closing this gap requires three things: (1) GBP review velocity to make the Knowledge Panel "
        "robust, (2) brand-modifier content (an About page, an outdoor 'haven in lipa' brand "
        "anchor), (3) backlinks from Lipa local sites that specifically reference HavenInLipa by name.",
        italic=True,
    )

    add_heading_styled(doc, "4.3 Positioning Opportunities", level=2, color=FOREST_GREEN)
    add_body(doc, "Airbnb Strengths (Threats to HavenInLipa):", bold=True)
    add_bullet(doc, "Massive brand authority (Domain Rating 90+) and instant trust")
    add_bullet(doc, "146-166 competing listings in Lipa alone")
    add_bullet(doc, "Built-in search, filtering, verified reviews, Superhost badges")
    add_bullet(doc, "Mobile app with push notifications for deal alerts")
    add_bullet(doc, "Guest Favorite badges on 42.2% of listings")

    add_body(doc, "Airbnb Weaknesses (HavenInLipa Opportunities):", bold=True)
    add_bullet(doc, "Service fees 14-20% - HavenInLipa's 'save 15-20%' message is a strong differentiator")
    add_bullet(doc, "Declining market (-24.8% revenue) with oversupply (+130.6%) - hosts struggling, creating opportunity for direct booking alternatives")
    add_bullet(doc, "Generic property descriptions with no local expertise content")
    add_bullet(doc, "No destination content (HavenInLipa now has 8 articles, building real moat)")
    add_bullet(doc, "Cookie-cutter listing format limits brand personality")
    add_bullet(doc, "HavenInLipa's pricing significantly undercuts the Airbnb average - strong value positioning for the 84% domestic majority")

    add_body(doc, "Direct Lipa STR Competitors (May 8 Reality):", bold=True)
    add_bullet(doc, "No direct Lipa STR operator runs a meaningful blog or destination hub - HavenInLipa now has the deepest content moat in the local market")
    add_bullet(doc, "Window to claim topical authority is wide open through summer 2026, then closes if blog cadence stalls")

    doc.add_page_break()

    # 5. CONTENT STRATEGY
    add_heading_styled(doc, "5. Content Strategy", level=1, color=CORAL)

    add_heading_styled(doc, "5.1 Topic Cluster Status (May 8)", level=2, color=FOREST_GREEN)
    add_body(doc, "Cluster 1 - Short-Term Rentals in Lipa City (Transactional)", bold=True, color=CORAL)
    cluster1 = [
        ["short term rental lipa city", "High", "Partial - homepage"],
        ["vacation rental lipa batangas", "High", "Partial - homepage + property pages"],
        ["airbnb alternative lipa", "High", "COVERED via Article #6"],
        ["affordable staycation lipa", "High", "Partial - mentioned in blog"],
        ["direct booking lipa city", "Medium", "COVERED via Article #6"],
    ]
    add_styled_table(doc, ["Keyword", "Priority", "Status"], cluster1, col_widths=[3.0, 1.2, 2.6])

    add_body(doc, "Cluster 2 - Things to Do in Lipa City (Informational)", bold=True, color=CORAL)
    cluster2 = [
        ["things to do in lipa city", "High", "COVERED via Article #1"],
        ["lipa city tourist spots", "High", "COVERED via Article #1"],
        ["mt maculot hiking guide", "Medium", "COVERED via Article #4"],
        ["taal volcano day trip from lipa", "Medium", "COVERED via Article #7"],
        ["lipa batangas attractions", "Medium", "COVERED via Article #1"],
    ]
    add_styled_table(doc, ["Keyword", "Priority", "Status"], cluster2, col_widths=[3.0, 1.2, 2.6])

    add_body(doc, "Cluster 3 - Weekend Getaway / Staycation (Mixed)", bold=True, color=CORAL)
    cluster3 = [
        ["weekend getaway near manila", "High", "COVERED via Article #3"],
        ["staycation batangas", "High", "Partial across articles"],
        ["holy week getaway lipa", "Medium", "COVERED via Article #8 (reframe to evergreen)"],
        ["remote work staycation philippines", "Medium", "COVERED via Article #9"],
        ["family staycation lipa", "High", "GAP - new article #11 (this report)"],
        ["couple retreat batangas", "High", "GAP - new article #12 (this report)"],
        ["barkada group trip lipa", "Medium", "GAP - Tier C"],
    ]
    add_styled_table(doc, ["Keyword", "Priority", "Status"], cluster3, col_widths=[3.0, 1.2, 2.6])

    add_body(doc, "Cluster 4 - Travel Planning & Logistics (Informational)", bold=True, color=CORAL)
    cluster4 = [
        ["best restaurants in lipa", "High", "COVERED via Article #5"],
        ["how to get to lipa from manila", "Medium", "DRAFTED - publish Article #10 (currently 404)"],
        ["lipa city travel guide", "High", "Partial across articles"],
        ["batangas road trip itinerary", "Medium", "GAP - Tier C"],
        ["lipa city food trip", "Medium", "Sub-topic of Article #5"],
    ]
    add_styled_table(doc, ["Keyword", "Priority", "Status"], cluster4, col_widths=[3.0, 1.2, 2.6])

    add_body(doc, "Cluster 5 - Direct Booking & Value (Commercial)", bold=True, color=CORAL)
    cluster5 = [
        ["book direct vs airbnb", "High", "COVERED via Article #6"],
        ["save on vacation rental fees", "Medium", "COVERED via Article #6"],
        ["why book direct accommodation", "Medium", "COVERED via Article #6"],
        ["vacation rental no service fee", "Medium", "Partial coverage"],
    ]
    add_styled_table(doc, ["Keyword", "Priority", "Status"], cluster5, col_widths=[3.0, 1.2, 2.6])

    add_heading_styled(doc, "5.2 Audience Segment Gaps", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "Existing articles speak to the trip TYPE (weekend, day trip, hiking, holy week, remote "
        "work). They do not speak to WHO is traveling. Audience-segment content is the next "
        "high-leverage layer of topical depth.",
    )
    segment_rows = [
        ["Family Staycation in Lipa", "Parents with kids", "3", "High", "DRAFTED in this report (Article #11)"],
        ["Romantic Getaway / Couple Retreat", "Couples / honeymoon", "3", "High", "DRAFTED in this report (Article #12)"],
        ["Barkada / Group Trip to Lipa", "Friends 6+ pax", "3", "High", "Tier C"],
        ["Senior-Friendly Lipa Getaway", "50+ travelers", "3", "Medium", "Tier D"],
        ["Solo Travel Guide to Lipa", "Solo travelers", "3", "Medium", "Tier D"],
        ["Pet-Friendly Stay in Lipa", "Pet owners", "1", "Low-Medium", "Pending policy confirmation"],
    ]
    add_styled_table(
        doc,
        ["Article / Topic", "Audience", "Cluster", "Priority", "Status"],
        segment_rows,
        col_widths=[2.0, 1.4, 0.6, 1.0, 1.8],
    )

    add_heading_styled(doc, "5.3 Target Keyword / Topic Set (Approved)", level=2, color=FOREST_GREEN)
    keyword_rows = [
        ["1", "GBP Review Generation Workflow", "Operational", "Critical"],
        ["2", "Property Page Expansions (2BR + 1BR)", "Transactional", "High"],
        ["3", "Family Staycation in Lipa", "Commercial", "High"],
        ["4", "Romantic Getaway / Couple Retreat in Batangas", "Commercial", "High"],
        ["5", "Internal Linking Strategy", "On-page SEO", "High"],
        ["6", "Barkada / Group Trip to Lipa", "Commercial", "Medium"],
        ["7", "Summer in Lipa 2026 (Seasonal)", "Commercial", "Medium"],
        ["8", "Batangas Road Trip Itinerary (hub)", "Informational", "Medium"],
        ["9", "Senior-Friendly Lipa Getaway", "Commercial", "Low"],
        ["10", "Holiday Season in Batangas (Dec)", "Commercial", "Low (queue Oct)"],
    ]
    add_styled_table(
        doc,
        ["#", "Topic", "Intent", "Priority"],
        keyword_rows,
        col_widths=[0.4, 4.4, 1.4, 1.4],
    )

    add_heading_styled(doc, "5.4 Priority Content Plan", level=2, color=FOREST_GREEN)
    add_body(doc, "Tier A - Now (Week of May 8-22)", bold=True, color=ACCENT_GREEN_LIGHT)
    tier_a = [
        ["1", "Verify and ship the 6 unshipped Apr 15 items (sitemap, FAQ page, '5+' copy, author byline, alt text, canonical tags)", "Technical / Trust"],
        ["2", "Launch GBP Review Generation workflow (single highest-leverage action)", "Local SEO / Trust"],
        ["3", "Publish Article #10 'How to Get to Lipa from Manila' (already drafted)", "Content / Indexing"],
        ["4", "Request indexing in GSC for all 8 published blog articles + Privacy + Terms", "Indexing"],
        ["5", "Audit and execute internal linking matrix across 8 articles + 4 main-site pages", "On-page SEO"],
    ]
    add_styled_table(doc, ["#", "Action", "Category"], tier_a, col_widths=[0.4, 5.6, 1.4])

    add_body(doc, "Tier B - Late May (Property Pages + Audience-Segment Articles)", bold=True, color=ACCENT_GREEN_LIGHT)
    tier_b = [
        ["6", "Expand 2BR property page to 1,500+ words (template in Phase 2 / Section 6)", "Cluster 1"],
        ["7", "Expand 1BR property page to 1,500+ words", "Cluster 1"],
        ["8", "Publish Article #11 'Family Staycation in Lipa' (drafted in Phase 3)", "Cluster 3"],
        ["9", "Publish Article #12 'Romantic Getaway in Batangas' (drafted in Phase 3)", "Cluster 3"],
        ["10", "Backfill internal links from existing articles to new property pages and #11 / #12", "On-page SEO"],
    ]
    add_styled_table(doc, ["#", "Action", "Category"], tier_b, col_widths=[0.4, 5.6, 1.4])

    add_body(doc, "Tier C - June (Sustain + Seasonal)", bold=True, color=ACCENT_GREEN_LIGHT)
    tier_c = [
        ["11", "'Barkada / Group Trip to Lipa' article (~2,000 words)", "Cluster 3"],
        ["12", "'Summer in Lipa 2026' seasonal landing page (peak window May-June)", "Cluster 3"],
        ["13", "'Batangas Road Trip Itinerary' hub article that interlinks #1, #4, #5, #7, #10", "Cluster 4"],
        ["14", "Reframe Article #8 Holy Week to evergreen + queue for Holy Week 2027 indexing push", "Cluster 3"],
    ]
    add_styled_table(doc, ["#", "Action", "Category"], tier_c, col_widths=[0.4, 5.6, 1.4])

    add_body(doc, "Tier D - Q3 (Authority + Scaling)", bold=True, color=ACCENT_GREEN_LIGHT)
    tier_d = [
        ["15", "'Senior-Friendly Lipa Getaway' + 'Solo Travel Guide to Lipa' articles", "Cluster 3"],
        ["16", "Backlink outreach: restaurants featured in #5, hiking groups for #4, Batangas tourism boards", "Authority"],
        ["17", "'Holiday Season in Batangas' (December targeting, publish by mid-Oct)", "Cluster 3"],
        ["18", "Brand SERP monitoring: track when haveninlipa.com starts appearing for 'haven in lipa' queries", "Visibility"],
        ["19", "Add new property pages using the optimized template as portfolio grows", "Cluster 1"],
    ]
    add_styled_table(doc, ["#", "Action", "Category"], tier_d, col_widths=[0.4, 5.6, 1.4])

    doc.add_page_break()

    # 6. SERP & OUTLINE STRATEGY (Phase 2)
    add_heading_styled(doc, "6. SERP & Outline Strategy (Phase 2)", level=1, color=CORAL)
    add_body(
        doc,
        "Two new audience-segment articles and one shared property page template were outlined "
        "based on expected SERP patterns for the target queries. Live SERP fetches were not "
        "available from the audit environment - patterns reflect informed projections based on "
        "standard travel/staycation SERP behavior in the PH market. Verify against live Google "
        "results before content production for tightest alignment.",
        italic=True,
    )

    add_heading_styled(doc, "6.1 Family Staycation in Lipa - Outline Summary", level=2, color=FOREST_GREEN)
    add_body(doc, "Target keywords:", bold=True)
    add_bullet(doc, "family staycation lipa, family-friendly rental lipa city, weekend getaway with kids near manila, kid-friendly batangas")
    add_body(doc, "SERP gaps to exploit:", bold=True)
    add_bullet(doc, "Age-segmented itinerary (toddler / school-age / teen) - missing across SERP")
    add_bullet(doc, "Real budget breakdown for family of 4")
    add_bullet(doc, "Practical 'what to pack for kids' section - long-tail traffic")
    add_bullet(doc, "Family-fit Airbnb vs. HavenInLipa comparison angle")
    add_bullet(doc, "Real-parent voice - aggregator content can't fake this")
    add_body(doc, "Outline structure:", bold=True)
    family_outline = [
        ["H1", "Family Staycation in Lipa City: A Parent's Honest 2-Day Plan (with Budget)"],
        ["H2", "Why Lipa works for families"],
        ["H2", "Picking the right age-fit itinerary (H3 by age band)"],
        ["H2", "The 2-day family plan that works for most families"],
        ["H2", "Where to stay: the family-fit shortlist (HavenInLipa 2BR)"],
        ["H2", "Budget breakdown - family of 4, 2 nights"],
        ["H2", "What to pack for kids in Lipa"],
        ["H2", "Family-friendly food spots in Lipa"],
        ["H2", "Common parent questions (FAQ block)"],
        ["H2", "Book direct, save the Airbnb fee"],
    ]
    add_styled_table(doc, ["Level", "Heading"], family_outline, col_widths=[0.8, 6.0])

    add_heading_styled(doc, "6.2 Romantic Getaway in Batangas - Outline Summary", level=2, color=FOREST_GREEN)
    add_body(doc, "Target keywords:", bold=True)
    add_bullet(doc, "romantic getaway batangas, couple retreat lipa, honeymoon batangas, anniversary getaway near manila")
    add_body(doc, "SERP gaps to exploit:", bold=True)
    add_bullet(doc, "SERP is heavily Tagaytay-skewed - reframe Lipa as the underrated alternative")
    add_bullet(doc, "Anniversary/proposal angle has low coverage and high commercial intent")
    add_bullet(doc, "Pricing transparency - most romantic content hides rates")
    add_bullet(doc, "1BR Cozy Haven is the natural couples fit - feature prominently")
    add_body(doc, "Outline structure:", bold=True)
    couple_outline = [
        ["H1", "Romantic Getaway in Batangas: Why Lipa City Is the Couple Retreat Manila Sleeps On"],
        ["H2", "What makes Lipa romantic (and what doesn't) - honest framing"],
        ["H2", "The 2-day couples itinerary"],
        ["H2", "Romantic dinner spots in Lipa and the Tagaytay rim"],
        ["H2", "Where to stay: the 1BR is built for couples"],
        ["H2", "Anniversary, honeymoon, or proposal? Read this."],
        ["H2", "Budget - 2 nights, two people, all in"],
        ["H2", "Common couple questions (FAQ block)"],
        ["H2", "Book direct, save 15-20%"],
    ]
    add_styled_table(doc, ["Level", "Heading"], couple_outline, col_widths=[0.8, 6.0])

    add_heading_styled(doc, "6.3 Property Page Expansion - Shared Template", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "Both 2BR and 1BR property pages should be rewritten using one shared template to prevent "
        "divergence. Target word count 1,500-1,800 each, plus VacationRental + FAQPage schema, "
        "self-referencing canonical, descriptive image alt text, inline review pull quotes from "
        "the existing 21 (2BR) and 32 (1BR) review pools.",
    )
    prop_outline = [
        ["H1", "[Property name] in Lipa City - [tagline]"],
        ["Hero", "1-sentence positioning + key stats (sleeps, beds, reviews, rate)"],
        ["H2", "The honest description (host voice, not template)"],
        ["H2", "Who this property is best for (H3 by use-case)"],
        ["H2", "What's inside - full amenity tour (H3 by room/area)"],
        ["H2", "The neighborhood (H3 by drive radius)"],
        ["H2", "What guests say (5-8 inline pull quotes from existing reviews)"],
        ["H2", "House rules + check-in/out"],
        ["H2", "Pricing + payment"],
        ["H2", "Frequently asked (8 property-specific questions, FAQPage schema)"],
        ["H2", "Book direct (primary CTA + contact channels)"],
    ]
    add_styled_table(doc, ["Level", "Heading"], prop_outline, col_widths=[0.8, 6.0])

    doc.add_page_break()

    # 7. CONTENT PRODUCTION (Phase 3)
    add_heading_styled(doc, "7. Content Production (Phase 3)", level=1, color=CORAL)

    add_heading_styled(doc, "7.1 Deliverables Summary", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "Phase 3 of this engagement produced 6 publish-ready deliverables, all stored in the "
        "/content for HavenInLipa/050826/ directory. Total new copy: approximately 11,000 words "
        "across articles, property pages, and operational documentation.",
    )
    deliverables = [
        ["1", "11-family-staycation-lipa.md", "~2,300", "Article #11 - Family Staycation in Lipa"],
        ["2", "12-romantic-getaway-batangas.md", "~2,200", "Article #12 - Romantic Getaway in Batangas"],
        ["3", "2br-property-page-rewrite.md", "~1,800", "Spacious 2BR property page rewrite + alt text + JSON-LD"],
        ["4", "1br-property-page-rewrite.md", "~1,700", "Cozy 1BR property page rewrite + alt text + JSON-LD"],
        ["5", "GBP_Review_Workflow.md", "~1,500", "Operational doc: 3-touchpoint review flow + compliance + KPIs"],
        ["6", "Internal_Linking_Strategy.md", "~1,500", "Link matrix + anchor text rules + execution checklist"],
    ]
    add_styled_table(
        doc,
        ["#", "File", "Words", "Description"],
        deliverables,
        col_widths=[0.4, 2.6, 0.8, 3.4],
    )

    add_heading_styled(doc, "7.2 Approach & Differentiation", level=2, color=FOREST_GREEN)
    add_body(doc, "Voice + format choices:", bold=True)
    add_bullet(doc, "Honest, parent-to-parent / friend-to-friend voice. Avoids 'rekindle the spark' and 'perfect family weekend' filler that saturates the SERP.")
    add_bullet(doc, "Real budget tables on every commercial article - aggregator content rarely shows actual numbers; this is a trust differentiator.")
    add_bullet(doc, "Direct comparison to alternatives (Tagaytay for couples, hotels for families) - frames Lipa specifically rather than generically.")
    add_bullet(doc, "Mandatory FAQ block on every article + property page - drives FAQPage schema and answer-engine eligibility.")
    add_bullet(doc, "Property page expansions include JSON-LD VacationRental + FAQPage schema, descriptive alt text per image, self-referencing canonical, and inline pull-quotes from real reviews.")

    add_body(doc, "Internal linking by design:", bold=True)
    add_bullet(doc, "Each new article links to 4-6 existing articles + 1-2 property pages + the Book Direct article")
    add_bullet(doc, "Each property page links to its primary audience-segment article (2BR -> Family, 1BR -> Romantic) plus relevant Cluster 2/4 content")
    add_bullet(doc, "Standardized 'Ready to plan your Lipa trip?' footer block across every article")

    add_body(doc, "Operational documentation:", bold=True)
    add_bullet(doc, "GBP review flow includes 3 message templates (SMS x2 + email), compliance rules, tracking sheet structure, and KPI table with 30/60/90 day targets")
    add_bullet(doc, "Internal linking strategy includes a full link matrix, anchor text patterns, and a phased execution checklist")

    doc.add_page_break()

    # 8. RECOMMENDATIONS & NEXT STEPS
    add_heading_styled(doc, "8. Recommendations & Next Steps", level=1, color=CORAL)

    add_heading_styled(doc, "8.1 Tier A - Verify & Ship (Week of May 8-22)", level=2, color=FOREST_GREEN)
    add_body(
        doc,
        "These are mostly 30-minute fixes that close the gap between what was reported as shipped "
        "and what is actually live. Combined, they recover the 0.5 score gap and remove the "
        "remaining low-hanging blockers.",
    )
    add_bullet(doc, "Add /privacy and /terms URLs to https://haveninlipa.com/sitemap.xml. Currently only 3 URLs listed.", bold_prefix="Expand main sitemap: ")
    add_bullet(doc, "Update homepage trust block - either fix to '2 Properties' (accurate) or add additional listings to back up the '5+' claim.", bold_prefix="Fix '5+ Properties' copy: ")
    add_bullet(doc, "Extract the homepage FAQ section into a dedicated /faq page with FAQPage JSON-LD schema. Expand from 7 to 12+ questions.", bold_prefix="Build /faq page: ")
    add_bullet(doc, "Update Article #1 (15 Best Things to Do, Apr 7) to show 'Cassandra Kim' as author instead of email address. Create author bio page for E-E-A-T.", bold_prefix="Fix Article #1 author byline: ")
    add_bullet(doc, "Replace property page image alt text patterns ('photo 1, photo 2') with descriptive keyword-rich alt text per image. Templates provided in property page rewrite docs.", bold_prefix="Rewrite property page alt text: ")
    add_bullet(doc, "Add <link rel='canonical' href='[exact URL]' /> to every page in the Next.js layout. Verify after deploy.", bold_prefix="Add canonical tags site-wide: ")
    add_bullet(doc, "Push the already-drafted 'How to Get to Lipa from Manila' (Article #10) to live. Currently returns 404.", bold_prefix="Publish Article #10: ")
    add_bullet(doc, "Use GBP Insights to generate the review short link. Set up the 3-touchpoint flow per the GBP_Review_Workflow.md doc. Backfill the past 14 days of guests for T1 SMS.", bold_prefix="Launch GBP review flow: ")
    add_bullet(doc, "In GSC, run URL Inspection -> Request Indexing on each of the 8 published blog articles + /privacy + /terms.", bold_prefix="Request indexing: ")

    add_heading_styled(doc, "8.2 Tier B - Property Pages + New Content (Late May)", level=2, color=FOREST_GREEN)
    add_bullet(doc, "Replace existing 2BR page copy with the 1,800-word rewrite from 2br-property-page-rewrite.md. Includes VacationRental + FAQPage schema and descriptive alt text plan.", bold_prefix="Ship 2BR property page rewrite: ")
    add_bullet(doc, "Same treatment for the 1BR using 1br-property-page-rewrite.md.", bold_prefix="Ship 1BR property page rewrite: ")
    add_bullet(doc, "Push 11-family-staycation-lipa.md to WordPress with the full image set per the existing Blogger Guide format. Add to the blog navigation.", bold_prefix="Publish Article #11 - Family Staycation: ")
    add_bullet(doc, "Push 12-romantic-getaway-batangas.md to WordPress with full image set.", bold_prefix="Publish Article #12 - Romantic Getaway: ")
    add_bullet(doc, "Audit existing 8 articles for outbound links per Internal_Linking_Strategy.md. Add the standard footer block + at least 2 in-body internal links per article that don't already meet the floor.", bold_prefix="Internal linking execution: ")

    add_heading_styled(doc, "8.3 Tier C - Sustain + Scale (June)", level=2, color=FOREST_GREEN)
    add_bullet(doc, "~2,000 words. Targets the 6+ pax angle that the 2BR property uniquely serves.", bold_prefix="'Barkada / Group Trip to Lipa' article: ")
    add_bullet(doc, "Peak booking window is now (May-June). Time-sensitive content with strong commercial intent.", bold_prefix="'Summer in Lipa 2026' seasonal landing page: ")
    add_bullet(doc, "Hub article that interlinks Articles #1, #4, #5, #7, and #10 (once #10 is live). Builds topical authority across Cluster 4.", bold_prefix="'Batangas Road Trip Itinerary' hub article: ")
    add_bullet(doc, "Strip 2026 references, treat as evergreen, push for indexing now. Easter 2027 = March 28; queue a refresh by mid-February 2027 for the 2027 demand window.", bold_prefix="Reframe Article #8 Holy Week to evergreen: ")

    add_heading_styled(doc, "8.4 Tier D - Authority Building (Q3)", level=2, color=FOREST_GREEN)
    add_bullet(doc, "Senior-Friendly Lipa Getaway and Solo Travel Guide to Lipa - lower volume but underserved audiences with high direct-booking intent.", bold_prefix="Audience-segment depth: ")
    add_bullet(doc, "Outreach to restaurants featured in Article #5 - they often reciprocate links. Hiking community sites for Article #4. Batangas tourism boards for travel-guide articles. Local Lipa business directories.", bold_prefix="Backlink outreach: ")
    add_bullet(doc, "Publish 'Holiday Season in Batangas' by mid-October to capture December peak booking lead-times.", bold_prefix="Holiday Season content: ")
    add_bullet(doc, "Monthly check on 'haven in lipa', 'haveninlipa.com', and 'haven in lipa reviews' SERP positions. Track when own-domain results start surfacing above aggregators.", bold_prefix="Brand SERP monitoring: ")
    add_bullet(doc, "Run targeted Google Ads for 'vacation rental lipa city' and 'lipa city accommodation' during peak booking seasons. Small test budget: PHP 10,000-15,000/month.", bold_prefix="Consider Google Ads for peak seasons: ")
    add_bullet(doc, "Add new property pages using the optimized template (1,500+ words with full amenities, neighborhood, reviews, policies, schema) as portfolio grows.", bold_prefix="Scale property portfolio: ")

    add_heading_styled(doc, "8.5 KPIs to Track", level=2, color=FOREST_GREEN)
    kpi_rows = [
        ["Google reviews count", "4", "12", "25 (90 days)", "GBP"],
        ["Star average", "4.0", "4.5+", "4.7+ (90 days)", "GBP"],
        ["Organic clicks per month", "TBD (verify in GSC)", "200+", "500+ (90 days)", "GSC Performance"],
        ["Organic impressions per month", "TBD", "10,000+", "25,000+ (90 days)", "GSC Performance"],
        ["Indexed pages", "5-8", "13+ (30 days)", "16+ (90 days, with new articles)", "GSC Pages"],
        ["Blog articles published", "8 (3-9 + #1)", "10 (#10 + #11 by late May)", "12+ (90 days)", "Site audit"],
        ["Property page word count", "450-600", "1,500+ each", "Maintained", "Manual"],
        ["Direct bookings per month", "TBD baseline", "+10%", "+20% vs Apr baseline", "Internal analytics"],
        ["GBP profile views per month", "TBD", "250+", "500+ (90 days)", "GBP Insights"],
        ["Brand SERP position for 'haven in lipa'", "Aggregators", "Mixed", "HavenInLipa #1 organic", "Manual"],
    ]
    add_styled_table(
        doc,
        ["KPI", "May 8 (Today)", "30-Day Target", "90-Day Target", "Source"],
        kpi_rows,
        col_widths=[1.8, 1.4, 1.3, 1.7, 1.0],
    )

    add_divider(doc)

    closing = doc.add_paragraph()
    closing.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = closing.add_run(
        "This Full SEO Audit & Strategy Report (May 8, 2026) was prepared by NetCoreSolutions for "
        "HavenInLipa.com. All findings reflect live site verification on May 8, 2026 against "
        "haveninlipa.com, blog.haveninlipa.com, sitemap files, and the brand SERP. Comparisons are "
        "made to the April 7 baseline and April 15 progress review. Phase 3 deliverables are stored "
        "in /content for HavenInLipa/050826/. For implementation support, contact the "
        "NetCoreSolutions team."
    )
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = MED_GRAY
    run.font.name = "Calibri"

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    doc.save(OUTPUT_FILE)
    print(f"Report saved: {OUTPUT_FILE}")
    print(f"Size: {os.path.getsize(OUTPUT_FILE)} bytes")


if __name__ == "__main__":
    generate_report()
