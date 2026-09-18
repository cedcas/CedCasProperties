#!/usr/bin/env python3
"""
Generate the June 18, 2026 SEO DELTA AUDIT REPORT DOCX for HavenInLipa.com
Prepared by: NetCoreSolutions
Baseline chain: Apr 7 -> Apr 15 -> May 8 -> May 31 -> Jun 18, 2026 (this report)

Scope: DELTA audit (folder 061826). Re-crawl of the live site checking ONLY
changes since the 2026-05-31 full run + the 6/2-6/3 tracker/report work.
Competitor re-analysis intentionally skipped per scope decision (moat unchanged).
Strategy-continuity rule (Cedric, 2026-05-31, STANDING): keyword tracker read
first; 6-cluster framework kept; no net-new strategy proposed.

Reuses the styling/helpers from generate_haveninlipa_audit_report_may31.py.
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
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "HavenInLipa_SEO_Audit_Report_Jun18.docx")
OUTPUT_FILE_LATEST = os.path.join(OUTPUT_DIR, "HavenInLipa_SEO_Audit_Report.docx")
OUTPUT_FILE_RUN = os.path.join(OUTPUT_DIR, "061826", "HavenInLipa_SEO_Audit_Report_Jun18.docx")


# ---------- helpers (mirrored from the May 31 generator) ----------
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
    run = p.add_run("-" * 80)
    run.font.size = Pt(6)
    run.font.color.rgb = RGBColor(0xCC, 0xCC, 0xCC)


def generate_report():
    doc = Document()

    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2)
        section.right_margin = Cm(2)

    # ---------------- COVER PAGE ----------------
    cover_para = doc.add_paragraph()
    cover_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover_para.paragraph_format.space_before = Pt(80)
    if os.path.exists(LOGO_PATH):
        run = cover_para.add_run()
        run.add_picture(LOGO_PATH, width=Inches(2.5))

    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_para.paragraph_format.space_before = Pt(40)
    run = title_para.add_run("SEO DELTA AUDIT REPORT")
    run.bold = True
    run.font.size = Pt(28)
    run.font.name = "Calibri"
    run.font.color.rgb = DARK_TEXT

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run("Live-Site Re-Crawl & Remediation - Changes Since the May 31 Full Run")
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
    run = date_para.add_run("Date: June 18, 2026")
    run.font.size = Pt(11)
    run.font.color.rgb = DARK_TEXT
    run.font.name = "Calibri"

    baseline = doc.add_paragraph()
    baseline.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = baseline.add_run("Baseline Chain: Apr 7 -> Apr 15 -> May 8 -> May 31 -> Jun 18, 2026")
    run.italic = True
    run.font.size = Pt(10)
    run.font.color.rgb = MED_GRAY
    run.font.name = "Calibri"

    scope = doc.add_paragraph()
    scope.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = scope.add_run("Scope: Delta re-crawl (folder 061826). Competitor re-analysis skipped - moat unchanged.")
    run.italic = True
    run.font.size = Pt(9)
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

    # ---------------- TABLE OF CONTENTS ----------------
    add_heading_styled(doc, "Table of Contents", level=1, color=CORAL)
    toc_items = [
        "1. Executive Summary",
        "2. Website Audit (Delta - What Changed Since May 31)",
        "    2.1 Mickey in Lipa - LAUNCHED",
        "    2.2 Publishing Cadence - On Schedule",
        "    2.3 Content Inconsistencies Found & Fixed",
        "    2.4 P0 Remediations - Still Holding",
        "    2.5 Corrected Finding (/properties/1-5)",
        "3. Keyword Tracker Reconciliation",
        "    3.1 Slug Drift - Fixed",
        "    3.2 Mickey Keyword -> URL Mapping",
        "    3.3 Continuity Note",
        "4. Competitor Position (Carry-Forward)",
        "5. Findings & Resolution Log",
        "6. Recommendations & Next Steps",
        "    6.1 Immediate (Client-Owned)",
        "    6.2 Continue the Plan",
        "    6.3 KPIs to Track",
    ]
    for item in toc_items:
        p = doc.add_paragraph()
        run = p.add_run(item)
        run.font.size = Pt(10.5)
        run.font.name = "Calibri"
        p.paragraph_format.space_after = Pt(2)
    doc.add_page_break()

    # ---------------- 1. EXECUTIVE SUMMARY ----------------
    add_heading_styled(doc, "1. Executive Summary", level=1, color=CORAL)
    add_body(doc,
        "This is a DELTA audit of HavenInLipa.com, run June 18, 2026 (folder 061826). Rather than repeat "
        "the full Phase 1-3 run completed only 18 days earlier (May 31), it re-crawls the live site and "
        "reports ONLY what changed since then. Per the standing strategy-continuity rule, the keyword "
        "tracker was read first; the 6-cluster framework is unchanged and no net-new strategy is proposed. "
        "Competitor re-analysis was intentionally skipped - the structural moat (no local accommodation "
        "rival runs a content engine) is unchanged.")
    add_body(doc, "Headline change:", bold=True)
    add_bullet(doc, "Three live, bookable, fully-schema'd property pages with real photos went live "
                    "(sleeps 7 / 11 / 15). As of May 31 this was renders-only and explicitly photo-blocked. "
                    "The 'renders-only' constraint is now retired.", bold_prefix="Mickey in Lipa LAUNCHED: ")
    add_body(doc, "Other deltas:", bold=True)
    add_bullet(doc, "Weekly Monday cadence is running on schedule - #15 (Jun 8) and #16 (Jun 15) are live; "
                    "#11 and #12 are also live, closing the old 'live slug unconfirmed' item.",
               bold_prefix="Cadence: ")
    add_bullet(doc, "Two live issues were caught and fixed during the session - the #13 teaser was still "
                    "pushing a waitlist while the booking pages were live (conversion leak), and the #8 "
                    "Holy Week article had gone 404. Both resolved (teaser -> launch post; #8 reframed "
                    "evergreen and restored).", bold_prefix="Caught & fixed: ")
    add_bullet(doc, "Tracker slug drift recurred on #11/#12/#13/#16 and the Mickey rows; the Page Indexing "
                    "sheet was synced and the Mickey keywords mapped to the right URLs.",
               bold_prefix="Tracker: ")
    add_bullet(doc, "All P0 technical remediations from the May run (FAQ schema, property schema, "
                    "tag/author noindex) are still holding - no regressions.", bold_prefix="Health: ")
    add_bullet(doc, "The earlier '/properties/1-5 broken links' concern was a FALSE ALARM - those strings "
                    "are CDN image paths, not navigable links.", bold_prefix="Correction: ")
    add_divider(doc)

    # ---------------- 2. WEBSITE AUDIT (DELTA) ----------------
    add_heading_styled(doc, "2. Website Audit (Delta - What Changed Since May 31)", level=1, color=CORAL)

    add_heading_styled(doc, "2.1 Mickey in Lipa - LAUNCHED", level=2, color=FOREST_GREEN)
    add_body(doc, "Three live property pages, all HTTP 200, all carrying full VacationRental + Offer + "
                  "LocalBusiness JSON-LD, all with real photos:")
    add_styled_table(doc,
        ["Config", "Max / Base pax", "Beds", "Night", "Live URL slug"],
        [
            ["Family Staycation", "7 / 5", "1BR, 2-floor", "P2,400", "mickey-in-lipa--family-staycation--sleeps-7"],
            ["Family House", "11 / 9", "2BR, 2-floor", "P4,200", "mickey-in-lipa--family-house--sleeps-11"],
            ["Full Family House", "15 / 13", "3BR, 2-floor", "P7,000", "mickey-in-lipa--full-family-house--sleeps-15"],
        ],
        col_widths=[1.6, 1.1, 1.2, 0.8, 2.8])
    add_body(doc, "Occupancy convention (resolved with client): the live 'Sleeps 7/11/15' is MAX occupancy; "
                  "the documented 5/9/13 is the BASE pax included in the nightly rate, with an extra-guest fee "
                  "beyond base. Both numbers are real - the project record now stores both. 'Sleeps N' is "
                  "kept in title tags (search-friendly); the page body must state 'rate for M'. "
                  "Per-extra-guest fee amounts are pending from Melody for on-page documentation.", italic=True)

    add_heading_styled(doc, "2.2 Publishing Cadence - On Schedule", level=2, color=FOREST_GREEN)
    add_styled_table(doc,
        ["#", "Article", "Target Monday", "Status", "Live slug"],
        [
            ["15", "Independence Day Long Weekend", "Jun 8", "LIVE", "independence-day-long-weekend-lipa-2026"],
            ["16", "What to Do When It Rains", "Jun 15", "LIVE", "indoor-things-to-do-in-lipa-city-when-it-rains"],
            ["17", "Lipa Barako Coffee Heritage", "Jun 22", "Next up", "(scheduled)"],
        ],
        col_widths=[0.4, 2.4, 1.1, 0.8, 2.6])
    add_body(doc, "#11 (family staycation) and #12 (romantic getaway) are also live and in the sitemap - this "
                  "resolves the long-standing 'live slugs unconfirmed for #11-14' open item.", italic=True)

    add_heading_styled(doc, "2.3 Content Inconsistencies Found & Fixed", level=2, color=FOREST_GREEN)
    add_bullet(doc, "The #13 'coming soon' teaser still pushed a waitlist ('join the early-access list / "
                    "message Melody') while the three booking pages were already live - a direct conversion "
                    "leak. FIXED: converted to a launch post with a top update note, three clickable property "
                    "links, and a book-direct CTA (verified live).", bold_prefix="#13 teaser: ")
    add_bullet(doc, "The Holy Week article had gone 404 (it was indexed on 6/2). It was rescheduled to 2027 "
                    "but left as a hard 404, which loses equity and would break an internal link from #22 "
                    "(Carmel, Jul 27). FIXED: reframed evergreen and kept live (200, index/follow, back in "
                    "sitemap) - re-promote ~Feb 2027.", bold_prefix="#8 Holy Week (404): ")

    add_heading_styled(doc, "2.4 P0 Remediations - Still Holding", level=2, color=FOREST_GREEN)
    add_styled_table(doc,
        ["May-run P0 / fix", "Re-verified June 18"],
        [
            ["FAQPage JSON-LD on /faq", "Present"],
            ["VacationRental + Offer schema on all property pages", "Present (incl. 3 Mickey configs)"],
            ["/tag/ + /author/ archives noindex,follow", "Confirmed on all 4 archives"],
            ["Property URLs in dynamic sitemap.xml", "Present (10 URLs incl. 3 Mickey configs)"],
        ],
        col_widths=[4.0, 3.0])

    add_heading_styled(doc, "2.5 Corrected Finding (/properties/1-5)", level=2, color=FOREST_GREEN)
    add_body(doc,
        "An initial pass flagged homepage links to /properties/1 - /properties/5 returning 404. On "
        "inspection of the raw HTML these are NOT anchors - they are image storage folder paths in the "
        "Vercel Blob CDN (e.g. .../public.blob.vercel-storage.com/properties/5/BRG06859-HDR....jpeg). The "
        "real navigation links use slugs and resolve 200. No broken links and no leftover demo listings on "
        "the homepage. Recorded here for the audit trail.", italic=True)
    add_divider(doc)

    # ---------------- 3. TRACKER RECONCILIATION ----------------
    add_heading_styled(doc, "3. Keyword Tracker Reconciliation", level=1, color=CORAL)

    add_heading_styled(doc, "3.1 Slug Drift - Fixed", level=2, color=FOREST_GREEN)
    add_body(doc, "Live slugs had again diverged from the tracker's target URLs (Yoast lengthens planned "
                  "slugs at publish). A 'Confirmed Live Slug' column was added to Keyword Master, and the "
                  "Page Indexing Tracker (previously untouched) was synced:")
    add_styled_table(doc,
        ["#", "Tracker had", "Live slug", "Status set"],
        [
            ["11", "family-staycation-lipa", "family-staycation-lipa-city-batangas", "Live - verify GSC"],
            ["12", "romantic-getaway-batangas", "romantic-getaway-batangas-lipa-city", "Live - verify GSC"],
            ["13", "coming-soon-disney-inspired-...", "mickey-in-lipa-coming-soon", "Live - verify GSC"],
            ["16", "what-to-do-in-lipa-...-rains", "indoor-things-to-do-in-lipa-...-rains", "Live - verify GSC"],
            ["8", "(listed Indexed)", "restored evergreen, live", "Indexed"],
        ],
        col_widths=[0.4, 2.3, 2.7, 1.6])

    add_heading_styled(doc, "3.2 Mickey Keyword -> URL Mapping", level=2, color=FOREST_GREEN)
    add_body(doc, "The Mickey keyword rows previously pointed at a non-existent /properties/mickey-in-lipa. "
                  "They were mapped by intent - transactional 'X rental' terms to the matching booking page, "
                  "branded/Disney terms to the launch-post hub - and three property rows were added to the "
                  "Page Indexing sheet:")
    add_styled_table(doc,
        ["Keyword", "Intent", "Mapped to"],
        [
            ["full house rental lipa", "Transactional", "sleeps-15 (Full Family House)"],
            ["family house rental lipa city", "Transactional", "sleeps-11 (Family House)"],
            ["mickey in lipa", "Branded", "launch post hub (links all 3)"],
            ["disney-inspired house lipa", "Commercial", "launch post hub"],
            ["disney themed rental philippines", "Commercial", "launch post hub"],
            ["bella vita lipa rental", "Local/Branded", "launch post hub"],
        ],
        col_widths=[2.7, 1.3, 3.0])
    add_body(doc, "Tracker backed up before edits as HavenInLipa_Keyword_Tracker.pre-061826sync.backup.xlsx.",
             italic=True)

    add_heading_styled(doc, "3.3 Continuity Note", level=2, color=FOREST_GREEN)
    add_body(doc, "No net-new keywords were introduced. The only shift is activation: the Mickey launch turns "
                  "the previously-parked Cluster 6 (Branded/Property) and two Cluster 1 (transactional) "
                  "keywords from parked into live, now pointed at real URLs. This is keyword activation plus "
                  "correct URL assignment - not new strategy.")
    add_divider(doc)

    # ---------------- 4. COMPETITOR POSITION ----------------
    add_heading_styled(doc, "4. Competitor Position (Carry-Forward)", level=1, color=CORAL)
    add_body(doc, "Competitor re-analysis was intentionally out of scope for this delta. The May 31 finding "
                  "stands: no local accommodation competitor (Lakeview Resort, JET Hotel, The Farm at San "
                  "Benito, Cintai Corito's Garden) runs a content/SEO engine on planning or 'things to do' "
                  "intent. HavenInLipa remains the only Lipa lodging brand ranking on informational and "
                  "planning intent - a durable structural moat. The Mickey launch widens it: branded "
                  "Disney-themed-rental terms have no local competitor at all.")
    add_divider(doc)

    # ---------------- 5. FINDINGS & RESOLUTION LOG ----------------
    add_heading_styled(doc, "5. Findings & Resolution Log", level=1, color=CORAL)
    add_styled_table(doc,
        ["Finding (Jun 18)", "Severity", "Status", "Resolution / Owner"],
        [
            ["Mickey config: live 7/11/15 vs documented 5/9/13", "Info", "RESOLVED",
             "Both real - max vs base-in-rate. Docs now store both. Client confirmed."],
            ["#13 teaser pushes waitlist while pages live", "High", "FIXED",
             "Converted to launch post: top update, 3 linked configs, book-direct CTA. Client; verified live."],
            ["#8 Holy Week returns 404", "High", "FIXED",
             "Reframed evergreen + kept live (200, index/follow, in sitemap). Client; verified."],
            ["Tracker slug drift (#11/#12/#13/#16 + Mickey)", "Med (hygiene)", "RESOLVED",
             "Confirmed-slug column + Page Indexing sync + Mickey URL mapping. NCS."],
            ["/properties/1-5 'broken links'", "-", "FALSE ALARM",
             "CDN image paths, not anchors. No action."],
            ["P0 fixes from May run", "-", "HOLDING",
             "FAQ schema, property schema, archive noindex all re-verified present."],
            ["Per-extra-guest fees not on property pages", "Low", "OPEN",
             "Awaiting fee amounts from Melody to document base vs max + fee."],
        ],
        col_widths=[2.4, 0.9, 0.9, 2.8])
    add_divider(doc)

    # ---------------- 6. RECOMMENDATIONS ----------------
    add_heading_styled(doc, "6. Recommendations & Next Steps", level=1, color=CORAL)

    add_heading_styled(doc, "6.1 Immediate (Client-Owned)", level=2, color=FOREST_GREEN)
    add_bullet(doc, "Supply per-extra-guest fees for each Mickey config; document 'sleeps up to N (rate for "
                    "M)' on the property pages and standardize the occupancy wording site-wide (homepage "
                    "cards currently show base pax, property titles show max).")
    add_bullet(doc, "Confirm GSC indexing for the seven newly-live pages now flagged 'Live - verify GSC' "
                    "(#11, #12, #15, #16, and the 3 Mickey config pages); request indexing where needed.")
    add_bullet(doc, "Finish wiring the Mickey launch post: add in-body links to it from #11 and #14, and "
                    "cross-link the three config pages to each other.")

    add_heading_styled(doc, "6.2 Continue the Plan", level=2, color=FOREST_GREEN)
    add_bullet(doc, "Sustain the weekly Monday cadence: #17 Barako Coffee (Jun 22) next, through #26 (Aug 24).")
    add_bullet(doc, "Run the R1 'Things to Do' quarterly refresh as pre-scheduled (Aug 31).")
    add_bullet(doc, "Publish the gap articles #27/#28/#29 in September; after #28 publishes, wire the hub "
                    "links from #1/#4/#5/#7/#10.")
    add_bullet(doc, "Re-confirm each live slug against the sitemap at publish (the recurring drift point); "
                    "paste it back into the 'Confirmed Live Slug' column.")

    add_heading_styled(doc, "6.3 KPIs to Track", level=2, color=FOREST_GREEN)
    add_styled_table(doc,
        ["KPI", "Source", "Cadence"],
        [
            ["Indexing status of newly-live pages", "GSC URL Inspection", "Per publish / weekly"],
            ["Impressions / clicks per tracked keyword", "GSC Performance", "Weekly (Mon)"],
            ["Mickey config booking inquiries (direct vs OTA)", "Client / booking form", "Monthly"],
            ["Rich-result eligibility (VacationRental/Offer)", "GSC Enhancements", "Monthly"],
            ["Brand SERP for 'mickey in lipa'", "GSC / manual", "Weekly"],
        ],
        col_widths=[3.2, 2.0, 1.5])
    add_divider(doc)

    closing = doc.add_paragraph()
    closing.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = closing.add_run("Prepared by NetCoreSolutions  |  June 18, 2026  |  Delta Audit (061826)  |  CONFIDENTIAL")
    run.font.size = Pt(9)
    run.font.color.rgb = MED_GRAY
    run.font.name = "Calibri"

    doc.save(OUTPUT_FILE)
    doc.save(OUTPUT_FILE_LATEST)
    os.makedirs(os.path.dirname(OUTPUT_FILE_RUN), exist_ok=True)
    doc.save(OUTPUT_FILE_RUN)
    print("Saved:", OUTPUT_FILE)
    print("Saved (latest):", OUTPUT_FILE_LATEST)
    print("Saved (run copy):", OUTPUT_FILE_RUN)


if __name__ == "__main__":
    generate_report()
