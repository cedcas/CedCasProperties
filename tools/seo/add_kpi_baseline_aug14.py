#!/usr/bin/env python3
"""
add_kpi_baseline_aug14.py — HavenInLipa SEO Tracker, in-place patcher (2026-08-14)

Reconciles the KPI Dashboard against the VERIFIED May-Jul 2026 GSC exports and
appends a "Qualified Reach & Funnel" tier.

Why this exists (do NOT re-run add_kpi_dashboard.py to do this):
  add_kpi_dashboard.py generates its month columns from recent_months(3), which
  today would seed 2026-06/07/08, rebuild the sheet with the wrong months, and
  discard every value already entered. This script edits cells in place instead.

Verified source data: calendar-month GSC exports (May 1-31, Jun 1-30, Jul 1-31),
cross-checked three ways — the Chart daily sums reconcile against both the
Countries and Devices tab totals for all three months.

Corrections applied:
  * Total Organic Clicks Jul: 244 -> 267. The 244 was the PHILIPPINES row, not
    the total (244 PH + 23 international).
  * Total Impressions Jul: 15,500 -> 17,218 (calendar month, per the
    pull-window rule in PROJECT_STATUS Decisions; the "(28d)" row labels are
    legacy text).
  * Indexed Pages: 23/28/39 -> 22/35/41 (GSC Indexing chart, month-end).
  * Non-branded Clicks: 0/13/102 -> 12/80/267. The old values were sums of the
    Queries EXPORT (which omits anonymised queries). Branded terms drew ZERO
    clicks in all three months, so non-branded == total.
  * Top 3/10/100 + CTR + Avg Position: rounded/stale values made exact.

NOT changed on purpose:
  * Index Coverage Errors stays 1. That row means ERRORS. The 39 "not indexed"
    pages are mostly intentional (14 noindex) or benign; the only true error is
    1 "Redirect error". The strategic number - 18 "Crawled - currently not
    indexed" - gets its own new row instead.
  * GBP rows (Cedric's data, already baselined).
  * Organic Conversions: left EMPTY. "2 bookings" is ambiguous between 2 total
    across 3 months and ~2/month - a 3x swing in conversion rate. Needs Cedric.
"""

import os
import shutil
import sys

import openpyxl
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Font, PatternFill

# ---------------------------------------------------------------- CONFIG
BASE_DIR = "/Volumes/Files and Cloud/Dropbox/VSCode (non-Git)/seo"
CLIENT_FOLDER = os.path.join(BASE_DIR, "content for HavenInLipa")
FILE = os.path.join(CLIENT_FOLDER, "HavenInLipa_SEO_Tracker.xlsx")
BACKUP = os.path.join(CLIENT_FOLDER,
                      "HavenInLipa_SEO_Tracker.pre-aug14baseline.backup.xlsx")
SHEET = "KPI Dashboard"

# Brand palette — copied from add_kpi_dashboard.py (NetCoreSolutions)
CORAL = "FF5371"
FOREST_GREEN = "3B5323"
LIGHT_GREEN = "E8EFE0"
WHITE = "FFFFFF"
DARK_TEXT = "2C2C2C"
POS_GREEN = "C6EFCE"
NEG_RED = "FFC7CE"

# Column letters on the KPI Dashboard
C_APR, C_MAY, C_JUN, C_JUL, C_AUG, C_DELTA = "C", "D", "E", "F", "G", "H"


def style_body(cell, bold=False, fill=None, color=DARK_TEXT, align="left"):
    cell.font = Font(name="Calibri", bold=bold, color=color, size=10)
    if fill:
        cell.fill = PatternFill("solid", fgColor=fill)
    cell.alignment = Alignment(horizontal=align, vertical="center",
                              wrap_text=(align == "left"))


def band_row(ws, row, ncols, text):
    ws.cell(row=row, column=1, value=text)
    for c in range(1, ncols + 1):
        style_body(ws.cell(row=row, column=c), bold=True, fill=FOREST_GREEN,
                   color=WHITE)


def main():
    if not os.path.exists(FILE):
        sys.exit(f"ERROR: workbook not found: {FILE}")
    lock = os.path.join(CLIENT_FOLDER, "~$HavenInLipa_SEO_Tracker.xlsx")
    if os.path.exists(lock):
        sys.exit("ERROR: workbook is open in Excel (lock file present). Close it.")

    shutil.copy2(FILE, BACKUP)
    print(f"Backed up -> {os.path.basename(BACKUP)}")

    wb = openpyxl.load_workbook(FILE)
    pre_sheets = list(wb.sheetnames)
    if SHEET not in pre_sheets:
        sys.exit(f"ERROR: '{SHEET}' sheet missing")
    ws = wb[SHEET]

    # ---- sanity: confirm the column layout is what we expect ----
    expected = {"C3": "2026-04", "D3": "2026-05", "E3": "2026-06", "F3": "2026-07"}
    for coord, want in expected.items():
        got = ws[coord].value
        if got != want:
            sys.exit(f"ERROR: expected {coord}={want!r}, found {got!r}. "
                     "Column layout changed — re-inspect before patching.")

    # ---- 1. corrections to existing rows ----
    # row: {column: value}
    fixes = {
        5:  {C_JUN: 38,     C_JUL: 115},      # Keywords in Top 3
        6:  {C_JUN: 128,    C_JUL: 494},      # Keywords in Top 10
        7:  {C_JUN: 189,    C_JUL: 607},      # Keywords in Top 100
        8:  {C_JUN: 4295,   C_JUL: 17218},    # Total Impressions
        9:  {C_MAY: 22, C_JUN: 35, C_JUL: 41, C_AUG: 41},   # Indexed Pages
        11: {C_MAY: 12, C_JUN: 80, C_JUL: 267},             # Non-branded Clicks
        12: {C_JUL: 267},                                    # Total Organic Clicks
        13: {C_MAY: 0.0132, C_JUN: 0.0186, C_JUL: 0.0155},  # Organic CTR %
        14: {C_JUL: 6.7},                                    # Average Position
        21: {C_AUG: "Pass"},                                 # Core Web Vitals
        22: {C_AUG: 1},                                      # Index Coverage Errors
    }
    for row, cols in fixes.items():
        for col, val in cols.items():
            ws[f"{col}{row}"] = val
    print(f"Corrected {sum(len(v) for v in fixes.values())} cells "
          f"across {len(fixes)} existing KPI rows")

    # ---- 2. clarify the basis of a few 'Source / How to pull' notes ----
    notes = {
        5: 'GSC > Performance > Queries; count position <= 3. Basis: ALL queries '
           'in the calendar-month export (a floor — GSC anonymises rare queries).  '
           '(higher is better)',
        6: 'GSC > Performance > Queries; count position <= 10. Basis: ALL queries '
           'in export (floor).  (higher is better)',
        7: 'GSC > Performance > Queries; count position <= 100. Basis: ALL queries '
           'in export (floor).  (higher is better)',
        11: "GSC > Performance > 'Queries not containing' brand filter > Clicks. "
            "2026-05..07 are DERIVED = total clicks, because branded terms drew "
            "ZERO clicks in all three months.  (higher is better)",
        14: 'GSC > Performance > Average position. 2026-05..07 recomputed '
            'impression-weighted from the Devices tab (derived).  (lower is better)',
        21: "GSC > Core Web Vitals (FIELD data). NOTE: 2026-08 'Pass' is from "
            "PageSpeed LAB data (98 mobile / 100 desktop) — GSC field data may "
            "read 'insufficient data' at this traffic level.",
        22: 'GSC > Pages (Indexing) > ERROR count only (currently 1 Redirect '
            'error). Total not-indexed is a different metric — see the Qualified '
            'Reach & Funnel tier.  (lower is better)',
    }
    for row, text in notes.items():
        ws[f"B{row}"] = text
        style_body(ws.cell(row=row, column=2))

    # ---- 3. make the delta header honest ----
    # Column G ("Mid 2026-08") is a partial month and is deliberately NOT in the
    # delta formulas, which compare F (Jul) to E (Jun).
    ws["H3"] = "Δ Jul vs Jun"

    # ---- 4. append the new tier (append-only; never mid-insert, so existing
    #         formulas and conditional formatting are untouched) ----
    ncols = 8
    old_footnote_row = 28
    ws.cell(row=old_footnote_row, column=1).value = None   # footnote moves to the bottom

    tier_row = 28
    band_row(ws, tier_row, ncols,
             "Qualified Reach & Funnel (added 2026-08-14) - is the reach REAL, "
             "and does it reach the booking pages?")

    # (name, source, higher_is_better, number_format, {col: value_or_formula})
    NEW_ROWS = [
        ("Geo-qualified Impressions",
         'GSC > Performance > filter Query CONTAINS "lipa" > Impressions '
         '(calendar month; export basis = floor).  (higher is better)',
         True, "#,##0",
         {C_MAY: 181, C_JUN: 1254, C_JUL: 4914}),

        ("Geo-qualified Clicks",
         'Same "lipa" query filter > Clicks. THE real reach number '
         '(export basis = floor).  (higher is better)',
         True, "#,##0",
         {C_MAY: 0, C_JUN: 12, C_JUL: 111}),

        ("Geo-qualified CTR %",
         "Auto = Geo-qualified Clicks / Geo-qualified Impressions. Jul was "
         "2.26% vs 0.10% on generic queries - a 23x gap.  (higher is better)",
         True, "0.0%",
         {c: f'=IF(OR({c}30="",{c}29="",{c}29=0),"",{c}30/{c}29)'
          for c in (C_APR, C_MAY, C_JUN, C_JUL, C_AUG)}),

        ("Geo-qualified Keywords in Top 10",
         "Queries export, geo-qualified rows only, position <= 10. Better "
         '"tracked set" proxy than the all-query count above.  (higher is better)',
         True, "0",
         {C_MAY: 13, C_JUN: 74, C_JUL: 199}),

        ("Generic (non-geo) Impressions",
         'Queries export rows NOT naming Lipa/Batangas/a local landmark '
         '("best restaurants near me", foreign-language food queries). '
         "Dilution watch - inflates total impressions at ~0.1% CTR.  "
         "(lower is better)",
         False, "#,##0",
         {C_MAY: 79, C_JUN: 223, C_JUL: 3850}),

        ("Crawled - currently not indexed",
         'GSC > Pages (Indexing) > "Crawled - currently not indexed". Google '
         "crawled these and declined to index them. Current-day snapshot.  "
         "(lower is better)",
         False, "0",
         {C_AUG: 18}),

        ("Blog -> Property Clicks",
         "GA4 stay_match_click + property-link clicks from blog articles. "
         "Requires the Stay Match engine (brief pending).  (higher is better)",
         True, "#,##0", {}),

        ("Blog -> Property CTR %",
         "Auto = Blog -> Property Clicks / Total Organic Clicks (row 12). The "
         "hand-off rate: Jul was ~1.9% by page-level proxy.  (higher is better)",
         True, "0.0%",
         {c: f'=IF(OR({c}35="",{c}12="",{c}12=0),"",{c}35/{c}12)'
          for c in (C_APR, C_MAY, C_JUN, C_JUL, C_AUG)}),

        ("Stay-Match Click Rate %",
         "GA4 stay_match_click / stay_match_view. Break down by the "
         "confidence param in GA4 to retune the scoring weights monthly.  "
         "(higher is better)",
         True, "0.0%", {}),
    ]

    delta_rows = []
    first = tier_row + 1
    for i, (name, source, higher, fmt, values) in enumerate(NEW_ROWS):
        r = first + i
        fill = LIGHT_GREEN if i % 2 == 0 else None

        c = ws.cell(row=r, column=1, value=name)
        style_body(c, bold=True, fill=fill)
        c = ws.cell(row=r, column=2, value=source)
        style_body(c, fill=fill)

        for col in (C_APR, C_MAY, C_JUN, C_JUL, C_AUG):
            cell = ws[f"{col}{r}"]
            if col in values:
                cell.value = values[col]
            style_body(cell, fill=fill, align="center")
            cell.number_format = fmt

        d = ws[f"{C_DELTA}{r}"]
        d.value = f'=IF(OR({C_JUL}{r}="",{C_JUN}{r}=""),"",{C_JUL}{r}-{C_JUN}{r})'
        style_body(d, bold=True, fill=fill, align="center")
        d.number_format = fmt if fmt != "0.0%" else "+0.0%;-0.0%"
        delta_rows.append((r, higher))

    # direction-aware conditional formatting on the delta column
    for r, higher in delta_rows:
        good, bad = (POS_GREEN, NEG_RED) if higher else (NEG_RED, POS_GREEN)
        rng = f"{C_DELTA}{r}:{C_DELTA}{r}"
        ws.conditional_formatting.add(rng, CellIsRule(
            operator="greaterThan", formula=["0"],
            fill=PatternFill("solid", fgColor=good)))
        ws.conditional_formatting.add(rng, CellIsRule(
            operator="lessThan", formula=["0"],
            fill=PatternFill("solid", fgColor=bad)))
    print(f"Appended 'Qualified Reach & Funnel' tier: {len(NEW_ROWS)} rows "
          f"({first}-{first + len(NEW_ROWS) - 1})")

    # ---- 5. footnote, moved below the new tier ----
    fn = first + len(NEW_ROWS) + 1
    ws.cell(row=fn, column=1, value=(
        "Δ Jul vs Jun = last two COMPLETE months (F minus E). The "
        "'Mid 2026-08' column is a partial-month/current-day snapshot and is "
        "deliberately excluded from the delta. Green = improving; direction-aware "
        "(for Average Position, Index Coverage Errors, Crawled-not-indexed and "
        "Generic Impressions, LOWER is better).  |  Pull-window rule: Performance "
        "rows are date-ranged to the calendar month; Indexed Pages, Index Coverage "
        "Errors, Crawled-not-indexed and Core Web Vitals are current-day snapshots. "
        " |  2026-08-14 reconciliation: Jul clicks 244->267 (244 was the Philippines "
        "row, not the total); Indexed Pages 23/28/39->22/35/41 (GSC month-end); "
        "query-level rows are FLOORS because GSC anonymises rare queries (the Jul "
        "export holds 115 of 267 clicks). Organic Conversions intentionally left "
        "blank pending Cedric: '2 bookings' is ambiguous between 2 total across "
        "3 months and ~2/month."))
    ws.cell(row=fn, column=1).font = Font(name="Calibri", italic=True, size=9,
                                         color="888888")
    ws.cell(row=fn, column=1).alignment = Alignment(wrap_text=True, vertical="top")

    # ---- 6. method note on the README tab ----
    if "README" in wb.sheetnames:
        rm = wb["README"]
        r = rm.max_row + 2
        rm.cell(row=r, column=1, value="KPI baseline reconciliation - 2026-08-14")
        rm.cell(row=r, column=1).font = Font(name="Calibri", bold=True, size=11,
                                            color=CORAL)
        for j, line in enumerate([
            "Source: calendar-month GSC exports (May 1-31, Jun 1-30, Jul 1-31), "
            "Domain property. Daily Chart sums reconcile against BOTH the Countries "
            "and Devices tab totals for all three months.",
            "Verified monthly totals - impressions 910 / 4,295 / 17,218; clicks "
            "12 / 80 / 267; CTR 1.32% / 1.86% / 1.55%; avg position 10.2 / 8.4 / 6.7.",
            "CORRECTION - Jul clicks were recorded as 244; that is the Philippines "
            "row. True total is 267 (244 PH + 23 international).",
            "CORRECTION - Indexed Pages were recorded 23/28/39; GSC month-end values "
            "are 22/35/41. The old '31' was the mid-June reading (Jun 12-29).",
            "Average Position is impression-weighted from the Devices tab; GSC's own "
            "aggregation differs slightly. Labelled derived.",
            "Top 3/10/100 use ALL queries in the export and are FLOORS (GSC "
            "anonymises rare queries - the Jul export holds 115 of 267 clicks, 43%). "
            "Geo-qualified equivalents are in the Qualified Reach & Funnel tier.",
            "'Geo-qualified' = the query names Lipa, Batangas, or a local landmark "
            "(Maculot, Taal, Casa de Segunda, Lomi King...). Jul: 4,914 impressions "
            "at 2.26% CTR vs 3,850 generic at 0.10% - so TOTAL impressions is now a "
            "vanity metric. Track the geo-qualified row instead.",
            "Index Coverage Errors stays 1 (one Redirect error). The 39 not-indexed "
            "pages are mostly intentional (14 noindex) or benign; the strategic "
            "number is 18 'Crawled - currently not indexed', now its own row.",
            "Still needed: GBP for Aug, Organic Conversions (bookings count - "
            "ambiguous, see footnote), GSC Core Web Vitals FIELD data, and the "
            "Blog -> Property rows once the Stay Match engine ships.",
        ]):
            c = rm.cell(row=r + 1 + j, column=1, value="- " + line)
            c.font = Font(name="Calibri", size=10, color=DARK_TEXT)
            c.alignment = Alignment(wrap_text=True, vertical="top")
        print("Appended method notes to README")

    wb.save(FILE)

    # ---- verification ----
    assert list(wb.sheetnames) == pre_sheets, "sheet list changed!"
    chk = openpyxl.load_workbook(FILE)
    w = chk[SHEET]
    print("\nVerification")
    print(f"  sheets preserved      : {len(chk.sheetnames)} — {chk.sheetnames == pre_sheets}")
    print(f"  Indexed Pages series  : {w['D9'].value} -> {w['E9'].value} -> {w['F9'].value} (Aug {w['G9'].value})")
    print(f"  Jul clicks            : {w['F12'].value}")
    print(f"  Jul impressions       : {w['F8'].value}")
    print(f"  Geo-qual Jul impr     : {w['F29'].value}")
    print(f"  Crawled-not-indexed   : {w['G34'].value}")
    print(f"  delta header          : {w['H3'].value!r}")
    print(f"  KPI Dashboard rows    : {w.max_row}")
    km = chk["Keyword Master"]
    print(f"  Keyword Master cols   : {km.max_column} (expect 17)")
    ck = chk["Cluster KPIs"]
    print(f"  Cluster KPIs rows     : {ck.max_row}")
    print("\nDone. Reopen in Excel and confirm Cluster KPIs shows no #REF!.")


if __name__ == "__main__":
    main()
