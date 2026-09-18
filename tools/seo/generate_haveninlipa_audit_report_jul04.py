#!/usr/bin/env python3
"""
Generate the July 4, 2026 SEO DELTA AUDIT REPORT DOCX for HavenInLipa.com
Prepared by: NetCoreSolutions
Baseline chain: Apr 7 -> Apr 15 -> May 8 -> May 31 -> Jun 18 -> Jul 4, 2026 (this report)

Scope: DELTA audit (folder 070426). Live re-crawl of the conversion path since the
6/18 baseline. Competitor re-analysis intentionally skipped (moat unchanged, baseline
< 90 days). Strategy-continuity rule (Cedric, STANDING) applied: SEO Tracker read
first; 6-cluster framework kept; no net-new strategy proposed.

Headline of this run: KPIs (impressions/clicks/traffic) up, but bookings flat (~2/mo)
-> diagnosed as a conversion funnel-leak + measurement gap from the live crawl.

Clones styling/helpers from generate_haveninlipa_audit_report_jun18.py.
"""

import os
import shutil
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import nsdecls
from docx.oxml import parse_xml

CORAL = RGBColor(0xFF, 0x53, 0x71)
FOREST_GREEN = RGBColor(0x3B, 0x53, 0x23)
DARK_TEXT = RGBColor(0x2C, 0x2C, 0x2C)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
MED_GRAY = RGBColor(0x66, 0x66, 0x66)
ACCENT_RED = RGBColor(0xD9, 0x3B, 0x3B)
ACCENT_ORANGE = RGBColor(0xE8, 0x8A, 0x1A)
ACCENT_GREEN = RGBColor(0x0D, 0x8A, 0x4E)

BASE_DIR = "/Volumes/Files and Cloud/Dropbox/VSCode (non-Git)/seo"
LOGO_PATH = os.path.join(BASE_DIR, "Brand Assets", "NCS Logo.png")
# NOTE: This is the CONVERSION DIAGNOSIS report, a companion to (not a replacement
# for) the standard 070426 technical delta audit (HavenInLipa_SEO_Audit_Report_Jul4.docx,
# generated separately). It uses a distinct filename and does NOT repoint the
# unsuffixed "latest" pointer, so re-running never clobbers the canonical delta audit.
OUT_DIR = os.path.join(BASE_DIR, "content for HavenInLipa")
OUT_SUFFIXED = os.path.join(OUT_DIR, "HavenInLipa_Conversion_Diagnosis_Jul4.docx")
OUT_RUN = os.path.join(OUT_DIR, "070426", "HavenInLipa_Conversion_Diagnosis_Jul4.docx")


def shade(cell, hex_color):
    cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>'))


def cell_text(cell, text, bold=False, color=None, size=9, align=None):
    cell.text = ""
    p = cell.paragraphs[0]
    if align:
        p.alignment = align
    run = p.add_run(text)
    run.bold = bold
    run.font.size = Pt(size)
    run.font.name = "Calibri"
    if color:
        run.font.color.rgb = color
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)


def table(doc, headers, rows, widths=None, header_bg="3B5323"):
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.style = "Table Grid"
    for i, h in enumerate(headers):
        c = t.rows[0].cells[i]
        shade(c, header_bg)
        cell_text(c, h, bold=True, color=WHITE, size=9)
    for r_idx, row in enumerate(rows):
        bg = "F2F2F2" if r_idx % 2 == 0 else "FFFFFF"
        for c_idx, val in enumerate(row):
            c = t.rows[r_idx + 1].cells[c_idx]
            shade(c, bg)
            cell_text(c, str(val), size=9)
    if widths:
        for row in t.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = Inches(w)
    return t


def heading(doc, text, level=1, color=None):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.name = "Calibri"
        if color:
            run.font.color.rgb = color
    return h


def body(doc, text, bold=False, italic=False, color=None, size=10.5):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.size = Pt(size)
    run.font.name = "Calibri"
    if color:
        run.font.color.rgb = color
    return p


def bullet(doc, text, bold_prefix="", color=None):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Inches(0.4)
    if bold_prefix:
        rb = p.add_run(bold_prefix)
        rb.bold = True
        rb.font.size = Pt(10)
        rb.font.name = "Calibri"
        if color:
            rb.font.color.rgb = color
    r = p.add_run(text)
    r.font.size = Pt(10)
    r.font.name = "Calibri"
    return p


def generate():
    doc = Document()
    for s in doc.sections:
        s.top_margin = Cm(2); s.bottom_margin = Cm(2)
        s.left_margin = Cm(2); s.right_margin = Cm(2)

    # ---------------- COVER ----------------
    cover = doc.add_paragraph(); cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover.paragraph_format.space_before = Pt(80)
    if os.path.exists(LOGO_PATH):
        cover.add_run().add_picture(LOGO_PATH, width=Inches(2.5))
    t = doc.add_paragraph(); t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    t.paragraph_format.space_before = Pt(40)
    r = t.add_run("SEO DELTA AUDIT REPORT"); r.bold = True; r.font.size = Pt(28)
    r.font.name = "Calibri"; r.font.color.rgb = DARK_TEXT
    st = doc.add_paragraph(); st.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = st.add_run("Conversion Diagnosis - Why Traffic Is Up but Bookings Are Flat")
    r.italic = True; r.font.size = Pt(13); r.font.color.rgb = MED_GRAY; r.font.name = "Calibri"
    cp = doc.add_paragraph(); cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cp.paragraph_format.space_before = Pt(30)
    r = cp.add_run("haveninlipa.com"); r.bold = True; r.font.size = Pt(20)
    r.font.color.rgb = CORAL; r.font.name = "Calibri"
    pr = doc.add_paragraph(); pr.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pr.paragraph_format.space_before = Pt(90)
    r = pr.add_run("Prepared by: NetCoreSolutions"); r.font.size = Pt(11)
    r.font.color.rgb = DARK_TEXT; r.font.name = "Calibri"
    for txt, it, sz, col in [
        ("Date: July 4, 2026", False, 11, DARK_TEXT),
        ("Baseline Chain: Apr 7 -> Apr 15 -> May 8 -> May 31 -> Jun 18 -> Jul 4, 2026", True, 10, MED_GRAY),
        ("Scope: Delta re-crawl (folder 070426). Competitor re-analysis skipped - moat unchanged.", True, 9, MED_GRAY),
    ]:
        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(txt); r.italic = it; r.font.size = Pt(sz)
        r.font.color.rgb = col; r.font.name = "Calibri"
    doc.add_page_break()

    # ---------------- EXECUTIVE SUMMARY ----------------
    heading(doc, "Executive Summary", 1, CORAL)
    body(doc, "Since the June 18 baseline the SEO program is working on every leading and "
              "traffic metric: indexed pages rose from 22 to 31, the weekly content cadence "
              "held, and impressions, clicks, and organic traffic are all trending up. Yet "
              "bookings are flat at roughly two in the last month. A live re-crawl of the "
              "conversion path shows this is not a traffic problem - it is a funnel-leak and "
              "measurement problem, and it is fixable without chasing more traffic.", bold=False)
    body(doc, "Four leaks, in priority order:", bold=True, color=FOREST_GREEN)
    bullet(doc, "the property pages advertise a 5.0 / 180+ review reputation on the homepage "
                "but show an EMPTY reviews section on the pages where people actually book.",
           "Leak 1 - Social proof missing at the point of decision: ", color=ACCENT_RED)
    bullet(doc, "the top organic articles bury booking links ~60% down, use informational "
                "CTAs, link only the old 1BR/2BR (not the new Mickey family houses), and "
                "capture no emails - so most readers leave and never return.",
           "Leak 2 - Best-traffic pages are booking dead-ends: ", color=ACCENT_RED)
    bullet(doc, "no conversion tracking exists, so it is impossible to see which pages or "
                "keywords produced the two bookings - the program is optimizing blind.",
           "Leak 3 - No measurement: ", color=ACCENT_RED)
    bullet(doc, "'View Details' instead of 'Book', no date picker until deep in the flow, "
                "full upfront payment, and vague extra-charge language add hesitation.",
           "Leak 4 - Booking friction: ", color=ACCENT_ORANGE)
    body(doc, "Direction: shift effort from traffic acquisition to conversion - reviews on "
              "property pages, an intent-matched blog-to-booking funnel, real conversion "
              "tracking, and email capture. Four deliverables accompany this report.", bold=True)

    # ---------------- SECTION 1 - DELTA ----------------
    heading(doc, "Section 1 - What Changed Since the June 18 Baseline", 1, CORAL)
    table(doc,
          ["Area", "Change since 6/18", "Status"],
          [["Indexing", "22 -> 31 indexed pages; all 3 Mickey property pages + 2 /book endpoints now indexed", "Good"],
           ["Content", "#10, #14, #15, #17 flipped Requested -> Indexed; weekly cadence holding", "On track"],
           ["KPIs", "Impressions / clicks / organic traffic trending up; Indexed 20->25->31 (May/Jun/Jul)", "Improving"],
           ["Tracker", "Page Indexing Tracker synced; #17 slug drift fixed; Role + Striking-Distance columns added; KPI Dashboard + Cluster KPIs added", "Done"],
           ["Stragglers", "3 /tag/-/author/-www archives still indexed (noindex not yet effective); 2 /book pages indexed", "Verify"],
           ["Conversions", "Traffic up, bookings flat (~2/mo)", "The finding"]],
          widths=[1.1, 4.6, 1.0])
    body(doc, "The content engine and technical base are healthy. Indexing nearly caught up "
              "to the full published set, and the tracker now carries a full measurement "
              "layer (KPI Dashboard, Cluster KPIs, Role, Striking-Distance). The one red "
              "signal is the traffic-to-bookings gap addressed in Section 3.", size=10.5)

    # ---------------- SECTION 2 - COMPETITOR ----------------
    heading(doc, "Section 2 - Competitor Analysis", 1, CORAL)
    body(doc, "Skipped for this delta run, per standing scope. The competitive moat was "
              "confirmed durable in prior runs (no local accommodation rival runs a content "
              "engine) and the baseline is under 90 days old. Re-baseline with a full "
              "competitor pass is due if the baseline crosses ~90 days (roughly end of "
              "August 2026).", italic=True, size=10.5)

    # ---------------- SECTION 3 - CONVERSION DIAGNOSIS ----------------
    heading(doc, "Section 3 - Conversion Diagnosis (from the live crawl, 2026-07-04)", 1, CORAL)
    body(doc, "Pages crawled: homepage, a Mickey property page, and the top-traffic "
              "'Things to Do' article. Findings map cleanly to the KPI cascade "
              "(impressions -> rankings -> traffic -> conversions): the first three links "
              "are working; the break is at conversion.", size=10.5)

    heading(doc, "Leak 1 - Empty reviews at the point of decision", 2, FOREST_GREEN)
    body(doc, "The homepage advertises '5.0 Avg Rating, 280+ Happy Guests, 180+ Five-Star "
              "Reviews, 3-yr Superhost.' Every property page - including the new Mickey pages "
              "- shows a 'What guests say' heading with no reviews beneath it. Trust is "
              "promised globally and absent exactly where the booking decision is made. "
              "Highest-leverage fix. (See Conversion Fix #1.)")
    heading(doc, "Leak 2 - Best-traffic pages are booking dead-ends", 2, FOREST_GREEN)
    body(doc, "The #1 'Things to Do' article - a top organic entry point - places booking "
              "links ~60% down, uses informational CTAs, links only the old Cozy 1BR / "
              "Spacious 2BR (not the new Mickey family houses a family reader would book), "
              "and offers no email capture. Engaged readers who are not ready to book today "
              "are lost. (See Conversion Fix #2 and #4.)")
    heading(doc, "Leak 3 - No conversion measurement", 2, FOREST_GREEN)
    body(doc, "There is no GA4/booking-event tracking; the KPI Dashboard conversion rows are "
              "empty and only GBP proxies exist. It is impossible to attribute the two "
              "bookings to pages or keywords, so the program cannot double down on what "
              "works. Foundational. (See Conversion Fix #3.)")
    heading(doc, "Leak 4 - Booking friction", 2, FOREST_GREEN)
    body(doc, "Homepage property cards say 'View Details' (not 'Book') with no date picker "
              "until deep in the flow; property pages require full upfront payment (no "
              "deposit) and carry vague 'additional charges' language - each adds hesitation "
              "on a PHP 2,400-7,000 decision.")
    body(doc, "Open question to resolve with data: is the growing traffic informational "
              "(things-to-do) or transactional (short-term rental lipa)? If the money "
              "keywords are not the ones ranking, traffic growth will not convert. A GSC "
              "query-to-page pull will confirm; Conversion Fix #3 makes this answerable "
              "going forward.", italic=True, size=10)

    # ---------------- SECTION 4 - RECOMMENDATIONS ----------------
    heading(doc, "Section 4 - Recommendations & Next Steps", 1, CORAL)
    body(doc, "Conversion-first, not more traffic. Four deliverables accompany this report "
              "(folder 070426/):", bold=True)
    table(doc,
          ["Priority", "Action", "Deliverable"],
          [["This week", "Populate empty 'What guests say' sections with real reviews + review schema", "Conversion Fix #1 - Property Page Reviews"],
           ["This week", "Move booking CTAs higher; re-map property links to article intent (family->Mickey, couples->1BR, groups->sleeps-15)", "Conversion Fix #2 - Blog->Booking Funnel"],
           ["This month", "Stand up GA4 + booking events; attribute bookings; fill KPI conversion rows", "Conversion Fix #3 - Conversion Tracking"],
           ["This month", "Add email capture + a 'Lipa Weekend Planner' lead magnet + nurture sequence", "Conversion Fix #4 - Email Capture"],
           ["This quarter", "Reduce booking friction (deposit option, clearer charges, 'Check Availability' + date picker); shift content mix toward commercial intent; light retargeting", "In this report"]],
          widths=[0.9, 4.1, 1.7])
    body(doc, "Sequencing note: Conversion Fix #3 (tracking) unblocks proof for all the "
              "others - stand it up in parallel with the week-one review and funnel fixes so "
              "their impact is measurable.", italic=True, size=10)

    # ---------------- SECTION 5 - KPI SNAPSHOT ----------------
    heading(doc, "Section 5 - KPI Snapshot", 1, CORAL)
    body(doc, "From the SEO Tracker KPI Dashboard (baseline in progress):", size=10.5)
    table(doc,
          ["KPI", "May", "Jun", "Jul", "Read"],
          [["Indexed Pages", "20", "25", "31", "Rising - healthy indexing"],
           ["Impressions / Clicks / Traffic", "-", "-", "up", "Leading + traffic tiers working"],
           ["Bookings (approx.)", "-", "-", "~2", "Flat - the conversion gap"],
           ["Organic Conversion Rate", "-", "-", "not tracked", "Blocked until Conversion Fix #3"]],
          widths=[2.3, 0.7, 0.7, 0.7, 2.3])
    body(doc, "The dashboard's job now is to make the conversion tier real - once tracking "
              "lands, Organic Conversions and Conversion Rate become the headline numbers "
              "for proving ROI, not traffic alone.", size=10.5)

    body(doc, "")
    body(doc, "Prepared by NetCoreSolutions - SEO Delta Audit, July 4, 2026.",
         italic=True, color=MED_GRAY, size=9)

    doc.save(OUT_SUFFIXED)
    os.makedirs(os.path.dirname(OUT_RUN), exist_ok=True)
    doc.save(OUT_RUN)
    print(f"Saved:\n  {OUT_SUFFIXED}\n  {OUT_RUN}")
    print("(Companion doc — does NOT touch the canonical delta audit report or 'latest' pointer.)")


if __name__ == "__main__":
    generate()
