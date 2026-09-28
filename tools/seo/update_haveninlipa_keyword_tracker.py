#!/usr/bin/env python3
"""
Update existing HavenInLipa_Keyword_Tracker.xlsx in place.
- Adds an 'Indexing Status' column to Keyword Master (inserted at column G,
  shifting existing tracking columns right so any saved user values stay attached).
- Adds a new 'GSC Troubleshooting' sheet placed after 'GSC Setup Steps'.
- Preserves all user-entered values in existing cells.
"""

import os
import shutil
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

BASE_DIR = "/Volumes/Files and Cloud/Dropbox/VSCode (non-Git)/seo"
FILE = os.path.join(BASE_DIR, "content for HavenInLipa", "HavenInLipa_Keyword_Tracker.xlsx")

CORAL = "FF5371"
FOREST_GREEN = "3B5323"
LIGHT_GREEN = "E8EFE0"
GRAY = "F2F2F2"
DARK_TEXT = "2C2C2C"
WHITE = "FFFFFF"

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


# ---------------------------------------------------------------------------
# 1. Add 'Indexing Status' column to Keyword Master
# ---------------------------------------------------------------------------

def add_indexing_status_column(wb):
    ws = wb["Keyword Master"]
    # Insert a new column at position G (7). This shifts GSC Tracked? + all
    # tracking columns to the right, preserving any user-entered values.
    ws.insert_cols(7)

    # Header row
    header_cell = ws.cell(row=1, column=7, value="Indexing Status")
    style_header(header_cell)

    # Determine data range (assume data starts at row 2; iterate while col A has a keyword)
    max_row = ws.max_row
    for r in range(2, max_row + 1):
        if ws.cell(row=r, column=1).value is None:
            continue
        zebra = GRAY if r % 2 == 0 else WHITE
        cell = ws.cell(row=r, column=7, value="")
        style_body(cell, fill=zebra, align="center")

    # Set width for new column and keep others reasonable
    ws.column_dimensions[get_column_letter(7)].width = 22

    # Note for the user inside the workbook (place at the unused N column header? skip - keep clean)


# ---------------------------------------------------------------------------
# 2. Add 'GSC Troubleshooting' sheet
# ---------------------------------------------------------------------------

TROUBLESHOOTING_SECTIONS = [
    ("Quick context (read first)", [
        "Google Search Console is PASSIVE reporting, not active keyword tracking. Searching for a keyword inside GSC does NOT 'add' or 'save' it.",
        "GSC only shows queries where (a) someone actually searched on Google, (b) your site appeared in the results, and (c) at least one impression was recorded during your selected date range.",
        "If a keyword shows no data, it usually means the page is not indexed yet, the page is not ranking in the top ~100, the content is too new, or the keyword has very low monthly search volume in the Philippines.",
    ]),
    ("Decision tree - if a keyword shows zero data in GSC", [
        "STEP 1: Check if the page exists and is reachable.",
        "  - Paste the target URL into a browser. Does it load? If 404 -> the page must be published first.",
        "STEP 2: Check if the page is indexed.",
        "  - GSC -> URL Inspection bar (top) -> paste the full URL.",
        "  - 'URL is on Google' = indexed. Proceed to Step 3.",
        "  - 'URL is not on Google' = not indexed. Click 'Request Indexing'. Wait 1-7 days. Recheck. No further action needed.",
        "  - 'Crawled - currently not indexed' = Google chose NOT to index it. Content needs improvement: more depth, original angles, internal links, better title/meta. Re-request after edits.",
        "  - 'Discovered - currently not indexed' = Google knows about it but hasn't crawled yet. Patience. Internal links from indexed pages speed this up.",
        "STEP 3: If indexed, widen the date range.",
        "  - Performance -> Search results -> Date -> 'Last 6 months' (or 'Last 12 months' for older sites).",
        "  - Country filter: Philippines.",
        "  - Re-check for the keyword. New articles often show no data in the 28-day default view.",
        "STEP 4: Filter by PAGE instead of by query.",
        "  - Add a 'Page' filter -> paste the article's URL.",
        "  - GSC will now show ALL queries that page is appearing for. You'll often find variations you weren't tracking (e.g., 'lipa city staycation' instead of 'staycation in lipa city').",
        "  - Add any high-value variations as new rows in the Keyword Master sheet.",
        "STEP 5: If still zero data after 8 weeks of being indexed...",
        "  - The page is likely ranking beyond position 100 (GSC stops tracking at ~position 100).",
        "  - Action: improve the page (more relevant content, faster load, more internal links, better title/meta) OR retire the keyword if it has no realistic shot.",
        "STEP 6: Sanity-check the keyword has real PH search volume.",
        "  - Open Google Trends -> filter to Philippines -> last 12 months. If the keyword shows a flat line, the keyword itself has near-zero searches. Replace with a higher-volume variation.",
    ]),
    ("How to mark each keyword in the Indexing Status column", [
        "Use one of these exact values so the column stays filterable:",
        "  - 'Indexed'                    = URL inspection says 'URL is on Google'.",
        "  - 'Not Indexed - Requested'    = You clicked Request Indexing; waiting on Google.",
        "  - 'Not Indexed'                = Page is not on Google and you have not yet requested indexing.",
        "  - 'Crawled Not Indexed'        = Google saw it and declined. Needs content improvement.",
        "  - 'Discovered Not Indexed'     = Google knows but hasn't crawled. Add internal links.",
        "  - 'Page Not Published'         = No live URL exists yet (e.g., gap/draft keywords).",
        "  - 'N/A - Brand Term'           = Homepage / brand-only keywords; track separately.",
    ]),
    ("Recommended weekly + monthly cadence", [
        "Weekly (Mondays, 15-20 min):",
        "  1. Performance -> Search results -> Last 28 days -> Country: Philippines.",
        "  2. Sort Queries by Impressions desc -> export to Excel.",
        "  3. For HIGH-priority keywords: update Clicks / Impressions / CTR / Avg Position in the Keyword Master sheet.",
        "  4. Update Last Reviewed.",
        "Monthly (1st of the month, 30-45 min):",
        "  1. Performance -> Search results -> Last 6 months -> Export.",
        "  2. URL-Inspect any new articles published in the last month -> update Indexing Status column.",
        "  3. Copy the current Keyword Master snapshot into Tracking Log Template as a tab named 'YYYY-MM'.",
        "  4. Promote climbing keywords to Priority Focus, retire stagnant ones.",
        "Quarterly:",
        "  1. Compare Tracking Log tabs across the last 3 months.",
        "  2. Identify the top 3 climbing pages -> double-down with internal links from other pages.",
        "  3. Identify the bottom 3 declining pages -> diagnose and either refresh or deprecate.",
    ]),
    ("Common confusions, cleared up", [
        "Q: 'I searched a keyword in GSC. Is it now being tracked?'",
        "A: No. GSC has nothing to add or save. It only reports what Google already observed.",
        "Q: 'Should I keep checking the same dead keyword every week?'",
        "A: No. If a keyword has zero data after 8 weeks and the target page is indexed, move it to monthly checks. Use the time on keywords that are climbing.",
        "Q: 'Can I add a keyword I want to rank for but don't yet?'",
        "A: Yes - in the Keyword Master sheet, not in GSC. GSC will report on it automatically once impressions start. To actively track keywords you don't yet rank for, use Ahrefs Webmaster Tools (free), SE Ranking, or SEMrush.",
        "Q: 'Some queries show as (other) or get hidden. Why?'",
        "A: Google anonymizes very low-volume queries for privacy. The impressions still count in totals but the exact query is hidden. Nothing you can do about it.",
        "Q: 'My homepage gets impressions for the brand term but is ranked #5. Is that bad?'",
        "A: Yes - your own brand SERP should be #1. Usually means thin homepage content, weak title tag, or a third-party (Airbnb/Booking) ranking above you. Fix the homepage title and add structured data.",
    ]),
    ("Free tools to pair with GSC (recommended order)", [
        "1. Google Trends (https://trends.google.com) - free - validates if a PH keyword has real search interest.",
        "2. Ahrefs Webmaster Tools (https://ahrefs.com/webmaster-tools) - free for verified domain - shows keywords you rank for + estimated search volumes + backlinks.",
        "3. Google Keyword Planner (inside Google Ads, no spend required) - free - shows monthly search volumes for PH.",
        "4. PageSpeed Insights - free - flags page speed issues that hurt rankings.",
    ]),
]


def add_troubleshooting_sheet(wb):
    # Remove old sheet if it exists (in case of re-run)
    if "GSC Troubleshooting" in wb.sheetnames:
        del wb["GSC Troubleshooting"]

    ws = wb.create_sheet("GSC Troubleshooting")
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 4
    ws.column_dimensions["B"].width = 125

    row = 2
    ws.cell(row=row, column=2, value="GSC Troubleshooting - When Keywords Show No Data")
    style_title(ws.cell(row=row, column=2), color=CORAL)
    ws.row_dimensions[row].height = 28
    row += 1
    ws.cell(row=row, column=2, value="Use this sheet whenever a keyword in Keyword Master is not showing data in Search Console.")
    style_subtitle(ws.cell(row=row, column=2))
    row += 2

    for title, lines in TROUBLESHOOTING_SECTIONS:
        ws.cell(row=row, column=2, value=title)
        style_subtitle(ws.cell(row=row, column=2), color=CORAL)
        ws.row_dimensions[row].height = 22
        row += 1
        for line in lines:
            ws.cell(row=row, column=2, value=line)
            c = ws.cell(row=row, column=2)
            c.font = Font(name="Calibri", size=10)
            c.alignment = Alignment(wrap_text=True, vertical="top", indent=1)
            ws.row_dimensions[row].height = 30
            row += 1
        row += 1

    # Reorder so GSC Troubleshooting sits right after GSC Setup Steps
    sheet_order = ["README", "Keyword Master", "Priority Focus (60-Day)",
                   "GSC Setup Steps", "GSC Troubleshooting",
                   "Blogger Brief", "Tracking Log Template"]
    existing = wb.sheetnames
    new_order = [name for name in sheet_order if name in existing]
    # Append any sheets not in the planned order (defensive)
    for name in existing:
        if name not in new_order:
            new_order.append(name)
    wb._sheets = [wb[name] for name in new_order]


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    if not os.path.exists(FILE):
        raise SystemExit(f"File not found: {FILE}")

    # Safety backup (separate from the one we already made manually)
    backup = FILE.replace(".xlsx", ".pre-update.xlsx")
    shutil.copy2(FILE, backup)
    print(f"Backup: {backup}")

    wb = load_workbook(FILE)
    print(f"Loaded sheets: {wb.sheetnames}")

    add_indexing_status_column(wb)
    add_troubleshooting_sheet(wb)

    wb.save(FILE)
    print(f"Updated: {FILE}")
    print(f"Final sheets: {wb.sheetnames}")


if __name__ == "__main__":
    main()
