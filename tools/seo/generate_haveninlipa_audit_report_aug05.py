#!/usr/bin/env python3
"""
August 5, 2026 SEO DELTA AUDIT REPORT DOCX for HavenInLipa.com
Prepared by: NetCoreSolutions
Baseline chain: Apr 7 -> Apr 15 -> May 8 -> May 31 -> Jun 18 -> Jul 4 -> Aug 5, 2026

Scope: DELTA (folder 080526). Live re-crawl focused on VERIFYING Cedric's two
conversion fixes (reviews on the 3 Mickey pages; Mickey CTAs added to Jun-Aug
articles) + the content delta since 7/4. Competitor re-analysis skipped (moat
unchanged; baseline < 90 days). Continuity rule applied.

Clones styling/helpers from generate_haveninlipa_audit_report_jul04.py.
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
ACCENT_GREEN = RGBColor(0x0D, 0x8A, 0x4E)
ACCENT_ORANGE = RGBColor(0xE8, 0x8A, 0x1A)

BASE_DIR = "/Volumes/Files and Cloud/Dropbox/VSCode (non-Git)/seo"
LOGO_PATH = os.path.join(BASE_DIR, "Brand Assets", "NCS Logo.png")
OUT_DIR = os.path.join(BASE_DIR, "content for HavenInLipa")
OUT_SUFFIXED = os.path.join(OUT_DIR, "HavenInLipa_SEO_Audit_Report_Aug5.docx")
OUT_LATEST = os.path.join(OUT_DIR, "HavenInLipa_SEO_Audit_Report.docx")
OUT_RUN = os.path.join(OUT_DIR, "080526", "HavenInLipa_SEO_Audit_Report_Aug5.docx")
BACKUP_LATEST = os.path.join(OUT_DIR, "HavenInLipa_SEO_Audit_Report.pre-aug5.backup.docx")


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
    r = st.add_run("Conversion-Fix Verification & Content Delta - Changes Since July 4")
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
        ("Date: August 5, 2026", False, 11, DARK_TEXT),
        ("Baseline Chain: Apr 7 -> Apr 15 -> May 8 -> May 31 -> Jun 18 -> Jul 4 -> Aug 5, 2026", True, 10, MED_GRAY),
        ("Scope: Delta re-crawl (folder 080526). Competitor re-analysis skipped - moat unchanged.", True, 9, MED_GRAY),
    ]:
        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(txt); r.italic = it; r.font.size = Pt(sz)
        r.font.color.rgb = col; r.font.name = "Calibri"
    doc.add_page_break()

    # ---------------- EXECUTIVE SUMMARY ----------------
    heading(doc, "Executive Summary", 1, CORAL)
    body(doc, "Updated 2026-08-09 after Cedric shipped the remaining conversion work. ALL "
              "FOUR conversion fixes from the July 4 diagnosis are now live and verified on "
              "the site. The content engine also kept running (~6 new articles; "
              "blog sitemap 18 -> 24 URLs) and organic traffic continued climbing (244 clicks "
              "in July vs 2 in April).")
    body(doc, "Verified live this run:", bold=True, color=FOREST_GREEN)
    bullet(doc, "reviews expanded on all 3 Mickey pages - sleeps-7: 3, sleeps-11: 4, "
                "sleeps-15: 3 (up from 1/2/1).", "Reviews: ", color=ACCENT_GREEN)
    bullet(doc, "Mickey CTAs extended to the top pre-June evergreens - #1 Things-to-Do, #3 "
                "Weekend Getaway, #7 Taal all now carry an after-intro callout + a 5-property "
                "'Where to Stay' box.", "Blog->booking funnel: ", color=ACCENT_GREEN)
    bullet(doc, "cards now read 'Check Availability' (zero 'View Details' remain); itemized "
                "DB-driven fees ('covers N', extra-guest fee, 'no hidden fees'); sticky "
                "booking CTA on property pages.", "Booking friction: ", color=ACCENT_GREEN)
    bullet(doc, "GA4 (G-2SV2PXYB7T) firing on both domains; check_availability data-hooks "
                "live in HTML; booking_confirmed / book_click fire client-side (confirm in "
                "GA4 DebugView).", "Conversion tracking: ", color=ACCENT_GREEN)
    body(doc, "Small remaining polish: per-review star ratings + aggregate line + Review "
              "schema on the Mickey pages (SERP stars/CTR); confirm the remaining 'Additional "
              "charge' copy is itemized (not vague); finish + mark the GA4 key events. "
              "Baseline chain nears 90 days - plan a Full re-baseline run with a competitor "
              "pass around end of August.", bold=True)

    # ---------------- SECTION 1 - CONTENT DELTA ----------------
    heading(doc, "Section 1 - Content Delta Since July 4", 1, CORAL)
    body(doc, "The weekly Monday cadence held. New articles now live (blog post-sitemap "
              "grew from ~18 to 24 URLs):", size=10.5)
    table(doc,
          ["Article", "Topic", "Status"],
          [["#16 Rainy-Day Lipa", "indoor things to do when it rains", "Live"],
           ["#19 Work From Lipa (rainy season)", "workation / remote-work angle", "Live"],
           ["#20 Lipa vs Tagaytay", "commercial-intent comparison", "Live"],
           ["#21 Casa de Segunda", "heritage house", "Live"],
           ["#22 Carmel / Pilgrimage", "religious/heritage guide", "Live"],
           ["#23 August Long Weekends 2026", "seasonal booking hook", "Live"]],
          widths=[2.4, 3.3, 0.9])
    body(doc, "No pages removed; sitemap integrity clean. Many June-August posts show a "
              "2026-08-05 lastmod - consistent with Cedric's bulk CTA edit (Fix #2). "
              "Note: #20 Lipa vs Tagaytay is a commercial-intent piece - the kind of "
              "bottom-funnel content that attracts readers closer to booking.", size=10.5)

    # ---------------- SECTION 2 - COMPETITOR ----------------
    heading(doc, "Section 2 - Competitor Analysis", 1, CORAL)
    body(doc, "Skipped per standing delta scope (moat unchanged; baseline < 90 days). "
              "NOTE: the baseline chain is approaching the ~90-day re-baseline threshold - a "
              "full run with a fresh competitor pass is advisable around end of August 2026.",
         italic=True, size=10.5)

    # ---------------- SECTION 3 - CONVERSION-FIX VERIFICATION ----------------
    heading(doc, "Section 3 - Conversion-Fix Verification (live crawl, 2026-08-09)", 1, CORAL)
    body(doc, "All four July-4 conversion fixes are now implemented; each is verified against "
              "the live site below.", size=10.5)

    heading(doc, "Fix #1 - Reviews on property pages: VERIFIED, expanded", 2, FOREST_GREEN)
    body(doc, "Reviews grew on all three Mickey pages: sleeps-7 now 3 (Bart, Jasmin, "
              "Micaela), sleeps-11 now 4 (Alvin, Allyssa Marie, Miguelito, Xavier), sleeps-15 "
              "now 3 (Reina, Kaye, Edzel) - up from 1/2/1 in July. Remaining polish: "
              "per-review star ratings + an aggregate line + Review/AggregateRating JSON-LD "
              "(SERP stars / CTR), and extend reviews to the 1BR/2BR pages.")

    heading(doc, "Fix #2 - Blog->booking funnel: VERIFIED, extended to pre-June evergreens", 2, FOREST_GREEN)
    body(doc, "The Mickey CTAs now reach the high-traffic pre-June evergreens. Verified on "
              "#1 Things-to-Do (uses the drafted after-intro callout + a 5-property 'Where to "
              "Stay' box), #3 Weekend Getaway, and #7 Taal - each with an above-the-fold "
              "callout plus the full property box. This closes the coverage + placement gaps "
              "flagged in July. Minor: a couple of mid-article 'Where to Stay' mentions still "
              "name only 1BR/2BR (the main CTA boxes carry all five).")

    heading(doc, "Booking friction: VERIFIED (all 4)", 2, FOREST_GREEN)
    body(doc, "(1) Card CTA relabeled - 'Check Availability' throughout, zero 'View Details' "
              "remain. (2) Availability surfaced earlier - prominent Check-Availability CTAs "
              "on cards and property pages. (3) Itemized, DB-driven fees - 'covers N guests', "
              "extra-guest / per-guest fee, and 'no hidden fees' shown at the decision point. "
              "(4) Sticky booking CTA present on property pages. Deposit/partial-payment was "
              "deliberately excluded (would break the payment model). One check: confirm the "
              "remaining 'Additional charge' strings are the itemized values, not vague copy.")

    heading(doc, "Conversion tracking (GTAG): VERIFIED (instrumented)", 2, FOREST_GREEN)
    body(doc, "GA4 (G-2SV2PXYB7T) fires on both haveninlipa.com and blog.haveninlipa.com "
              "(gtag.js; cross-domain configured). The check_availability data-analytics hooks "
              "are live in the rendered HTML with per-property attribution. booking_confirmed "
              "and book_click fire client-side (JS) - confirm in GA4 DebugView and mark "
              "booking_confirmed + generate_lead as key events. Once collecting, the KPI "
              "Dashboard's Organic Conversions + Conversion Rate rows fill and the ~0.8% "
              "baseline becomes measurable and improvable.")

    # ---------------- SECTION 4 - RECOMMENDATIONS ----------------
    heading(doc, "Section 4 - Recommendations & Next Steps", 1, CORAL)
    body(doc, "All four fixes are live - remaining work is polish + measurement:", bold=True)
    table(doc,
          ["Priority", "Action"],
          [["Quick win", "Add per-review star ratings + aggregate line + Review/AggregateRating schema on the 3 Mickey pages (SERP stars, CTR lift)."],
           ["Quick win", "Confirm the remaining 'Additional charge' copy shows itemized values, not vague wording."],
           ["Measure", "In GA4 DebugView confirm booking_confirmed + book_click fire; mark booking_confirmed + generate_lead as key events; finish the pending events (generate_lead, check_availability, book_click)."],
           ["Ongoing", "Extend reviews to the 1BR/2BR pages; add Mickey CTAs to the remaining evergreens (#5, #10); lead-magnet / email capture (Fix #4) when ready."],
           ["Strategic", "Baseline chain nears 90 days - promote to a FULL re-baseline run with a competitor pass around end of August 2026."]],
          widths=[1.1, 5.6])

    # ---------------- SECTION 5 - KPI SNAPSHOT ----------------
    heading(doc, "Section 5 - KPI Snapshot", 1, CORAL)
    body(doc, "From the SEO Tracker KPI Dashboard:", size=10.5)
    table(doc,
          ["KPI", "Apr", "May", "Jun", "Jul", "Read"],
          [["Total Organic Clicks", "2", "12", "80", "244", "Strong upward trend"],
           ["Keywords in Top 3", "6", "8", "37", "110", "Rankings compounding"],
           ["Indexed Pages", "-", "20", "25", "31", "Healthy indexing"],
           ["Bookings (approx.)", "-", "-", "-", "~2", "Flat - the conversion gap"],
           ["Organic Conversion Rate", "-", "-", "-", "~0.8%*", "*rough (2/244); auto once GA4 live"]],
          widths=[2.1, 0.55, 0.55, 0.55, 0.55, 2.4])
    body(doc, "Traffic is doing its job (244 organic clicks in July vs 2 in April). The "
              "story of the next quarter is converting that traffic - the fixes verified "
              "here are the first proof points; tracking will let us measure the lift.",
         size=10.5)

    # ---------------- APPENDIX A - CTA DRAFT ----------------
    doc.add_page_break()
    heading(doc, "Appendix A - Paste-Ready CTA Update for Article #1 (Things to Do)", 1, CORAL)
    body(doc, "IMPLEMENTED 2026-08-05 - now live on #1 (using this exact copy) and extended "
              "to #3 and #7. Kept here as the reference/template for the remaining evergreens "
              "(#5, #10). Full version with clickable URLs is in "
              "080526/CTA_Update_Article1_ThingsToDo.md.", size=10.5)
    heading(doc, "A) New contextual callout - place right after the intro (above the fold)", 2, FOREST_GREEN)
    body(doc, "\"Staying overnight in Lipa? Book direct with host Melody and save 15-20% vs "
              "Airbnb - no platform fees. Families love the Disney-themed Mickey in Lipa "
              "house (sleeps up to 7, from PHP 2,400/night), about 10 minutes from most of "
              "this list. [See rates & check dates >]\"", italic=True, size=10)
    heading(doc, "B) Replace the 'Where to Stay' section with all 5 units (families first)", 2, FOREST_GREEN)
    bullet(doc, "Mickey in Lipa - Family Staycation - Disney-themed, sleeps up to 7, from PHP 2,400/night")
    bullet(doc, "Mickey in Lipa - Family House - sleeps up to 11, from PHP 4,200/night")
    bullet(doc, "Mickey in Lipa - Full Family House - sleeps up to 15, from PHP 6,500/night")
    bullet(doc, "Cozy 1BR - sleeps up to 5, solar backup during brownouts, from PHP 2,000/night (couples/solo)")
    bullet(doc, "Spacious 2BR - sleeps up to 9, from PHP 2,800/night")
    heading(doc, "C) Update the end-of-article CTA", 2, FOREST_GREEN)
    body(doc, "\"Ready to plan your Lipa trip? Traveling with kids or the barkada? The Mickey "
              "in Lipa family houses (sleeps 7/11/15) are a hit - or keep it simple with the "
              "Cozy 1BR (couples/solo) or Spacious 2BR (small groups). [Book direct and save "
              ">] . [Message Melody >] - usually replies within the hour.\"", italic=True, size=10)
    body(doc, "Apply the same three edits to the other top pre-June evergreens (#3 Weekend "
              "Getaway, #5 Restaurants, #7 Taal, #10 How to Get to Lipa), matching the lead "
              "property to each article's intent.", size=10)

    body(doc, "")
    body(doc, "Prepared by NetCoreSolutions - SEO Delta Audit, August 5, 2026.",
         italic=True, color=MED_GRAY, size=9)

    if os.path.exists(OUT_LATEST) and not os.path.exists(BACKUP_LATEST):
        shutil.copy2(OUT_LATEST, BACKUP_LATEST)
        print(f"Backed up prior latest -> {BACKUP_LATEST}")
    else:
        print("Backup skipped (pre-aug5 backup already exists — preserving true prior state).")
    doc.save(OUT_SUFFIXED)
    doc.save(OUT_LATEST)
    os.makedirs(os.path.dirname(OUT_RUN), exist_ok=True)
    doc.save(OUT_RUN)
    print(f"Saved:\n  {OUT_SUFFIXED}\n  {OUT_LATEST}\n  {OUT_RUN}")


if __name__ == "__main__":
    generate()
