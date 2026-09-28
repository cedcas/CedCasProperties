#!/usr/bin/env python3
"""
Add SEO KPI tracking to the HavenInLipa workbook (in-place patcher).

Adds two sheets to the existing workbook and appends a "how to update" section
to the README:
  1. "KPI Dashboard"  - site-level monthly KPIs (leading / traffic / local / guardrail),
                        one column per month, auto Latest-Delta with green/red cues.
  2. "Cluster KPIs"   - per-cluster rollup, 100% formula-driven from Keyword Master
                        (SUMIF/AVERAGEIFS/COUNTIFS) - zero manual entry.

Why a patcher (not the from-scratch generator): the live workbook has hand-made
edits (Confirmed Live Slug, Article, Lists, To Do with Keywords) that no script
reproduces. This loads the live file, backs it up, adds sheets, and saves.

REUSABILITY: this is written client-agnostic below the CONFIG block. Cluster rows
and Keyword Master column positions are discovered at runtime, not hardcoded. When
a 2nd client needs KPIs, promote this to a shared Tools/ location (ask Cedric where)
and only the CONFIG block changes.

Run only when the workbook is CLOSED in Excel (an open file leaves a ~$ lock and
the save will fail).
"""

import os
import shutil
import sys
from datetime import date

from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import CellIsRule

# --------------------------------------------------------------------------- #
# CONFIG  (the only block that changes per client)
# --------------------------------------------------------------------------- #
BASE_DIR = "/Volumes/Files and Cloud/Dropbox/VSCode (non-Git)/seo"
CLIENT_FOLDER = os.path.join(BASE_DIR, "content for HavenInLipa")
FILE = os.path.join(CLIENT_FOLDER, "HavenInLipa_SEO_Tracker.xlsx")
BACKUP = os.path.join(CLIENT_FOLDER, "HavenInLipa_SEO_Tracker.pre-kpi.backup.xlsx")
KM_SHEET = "Keyword Master"

# --------------------------------------------------------------------------- #
# Brand styling (NetCoreSolutions) - copied from generate_haveninlipa_keyword_tracker.py
# --------------------------------------------------------------------------- #
CORAL = "FF5371"
FOREST_GREEN = "3B5323"
LIGHT_CORAL = "FFE4E9"
LIGHT_GREEN = "E8EFE0"
GRAY = "F2F2F2"
DARK_TEXT = "2C2C2C"
WHITE = "FFFFFF"
POS_GREEN = "C6EFCE"   # good-delta fill
NEG_RED = "FFC7CE"     # bad-delta fill

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


def set_column_widths(ws, widths):
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w


def band_row(ws, row, ncols, text):
    """Full-width forest-green section band across `ncols` columns."""
    ws.cell(row=row, column=1, value=text)
    for c in range(1, ncols + 1):
        style_body(ws.cell(row=row, column=c), bold=True, fill=FOREST_GREEN,
                   color=WHITE, align="left")


# --------------------------------------------------------------------------- #
# Runtime discovery of Keyword Master layout (survives column reordering)
# --------------------------------------------------------------------------- #
def km_geometry(wb):
    ws = wb[KM_SHEET]
    headers = {}
    for cell in ws[1]:
        if cell.value is not None:
            headers[str(cell.value).strip()] = cell.column  # 1-indexed
    last_row = ws.max_row

    def col(name):
        if name not in headers:
            sys.exit(f"ERROR: expected column '{name}' not found in {KM_SHEET}. "
                     f"Found: {list(headers)}")
        return get_column_letter(headers[name])

    geo = {
        "cluster": col("Cluster"),
        "position": col("Current Avg. Position"),
        "impressions": col("Impressions (28d)"),
        "clicks": col("Clicks (28d)"),
        "last_row": last_row,
    }
    # distinct clusters in first-seen order, then sorted by the "Cluster N" prefix
    seen = []
    ci = headers["Cluster"]
    for r in range(2, last_row + 1):
        v = ws.cell(row=r, column=ci).value
        if v and v not in seen:
            seen.append(v)

    def cluster_key(name):
        # pull the integer after "Cluster " for stable C1..C6 ordering
        try:
            return int(str(name).split("Cluster", 1)[1].strip().split()[0].strip(" -"))
        except (IndexError, ValueError):
            return 999
    return geo, sorted(seen, key=cluster_key)


# --------------------------------------------------------------------------- #
# Sheet builders
# --------------------------------------------------------------------------- #
def recent_months(n=3):
    """Last n year-month labels ending with the current month, e.g. ['2026-05', ...]."""
    y, m = date.today().year, date.today().month
    out = []
    for _ in range(n):
        out.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    return list(reversed(out))


# (tier, KPI name, source/how-to-pull, higher_is_better, number_format)
KPI_ROWS = [
    ("Leading Indicators (move first, ~2-8 weeks)", None, None, None, None),
    ("kpi", "Keywords in Top 3", "GSC > Performance > Queries; count position <= 3 (tracked set)", True, "0"),
    ("kpi", "Keywords in Top 10", "GSC > Performance > Queries; count position <= 10", True, "0"),
    ("kpi", "Keywords in Top 100", "GSC > Performance > Queries; count position <= 100", True, "0"),
    ("kpi", "Total Impressions (28d)", "GSC > Performance > last 28 days > Total impressions", True, "#,##0"),
    ("kpi", "Indexed Pages", "GSC > Pages (Indexing) > Indexed count (or Page Indexing Tracker)", True, "0"),
    ("Traffic & Engagement (~1-4 months)", None, None, None, None),
    ("kpi", "Non-branded Organic Clicks", "GSC > Performance > add 'Queries not containing' brand filter > Clicks", True, "#,##0"),
    ("kpi", "Total Organic Clicks (28d)", "GSC > Performance > last 28 days > Total clicks", True, "#,##0"),
    ("kpi", "Organic CTR %", "GSC > Performance > Average CTR", True, "0.0%"),
    ("kpi", "Average Position", "GSC > Performance > Average position (lower is better)", False, "0.0"),
    ("Local / Conversion - Google Business Profile", None, None, None, None),
    ("kpi", "GBP Calls", "GBP > Performance > Calls (monthly)", True, "#,##0"),
    ("kpi", "GBP Direction Requests", "GBP > Performance > Directions", True, "#,##0"),
    ("kpi", "GBP Website Clicks", "GBP > Performance > Website clicks", True, "#,##0"),
    ("kpi", "GBP Profile Views", "GBP > Performance > Views (search + maps)", True, "#,##0"),
    ("Guardrails (regressions here silently kill the rest)", None, None, None, None),
    ("kpi", "Core Web Vitals (Pass/Fail)", "GSC > Core Web Vitals; enter Pass / Needs work / Fail", None, None),
    ("kpi", "Index Coverage Errors", "GSC > Pages (Indexing) > error count (lower is better)", False, "0"),
]


def build_kpi_dashboard(wb):
    if "KPI Dashboard" in wb.sheetnames:
        del wb["KPI Dashboard"]
    ws = wb.create_sheet("KPI Dashboard", index=1)  # right after README
    ws.sheet_view.showGridLines = False

    months = recent_months(3)
    n_month_cols = len(months)
    # columns: A=KPI, B=Source, C..=months, last=Latest Delta
    first_month_col = 3
    last_month_col = first_month_col + n_month_cols - 1
    delta_col = last_month_col + 1
    ncols = delta_col
    widths = [34, 52] + [13] * n_month_cols + [12]
    set_column_widths(ws, widths)

    # Title + subtitle
    ws.cell(row=1, column=1, value="HavenInLipa - SEO KPI Dashboard")
    style_title(ws.cell(row=1, column=1))
    ws.cell(row=2, column=1,
            value="Monthly performance tracking - paste ~15 numbers once a month; "
                  "deltas auto-calc. Keyword-level history lives in 'Tracking Log Template'.")
    style_subtitle(ws.cell(row=2, column=1))

    # Header row (row 3)
    hdr = 3
    header_labels = ["KPI", "Source / How to pull"] + months + ["Latest Δ"]
    for i, label in enumerate(header_labels, start=1):
        style_header(ws.cell(row=hdr, column=i, value=label), fill=FOREST_GREEN)
    ws.row_dimensions[hdr].height = 30

    row = hdr + 1
    zebra = False
    delta_num_rows = []  # rows that carry a numeric Latest-Delta formula
    for tier, name, source, higher_better, fmt in KPI_ROWS:
        if name is None:  # section band
            band_row(ws, row, ncols, tier)
            row += 1
            zebra = False
            continue
        fill = GRAY if zebra else WHITE
        zebra = not zebra
        style_body(ws.cell(row=row, column=1, value=name), bold=True, fill=fill)
        style_body(ws.cell(row=row, column=2, value=source), fill=fill, color="666666")
        for j in range(n_month_cols):
            c = ws.cell(row=row, column=first_month_col + j)
            style_body(c, fill=fill, align="center")
            if fmt:
                c.number_format = fmt
        d = ws.cell(row=row, column=delta_col)
        if higher_better is None or fmt is None:
            # text KPI (e.g. CWV) - no numeric delta
            style_body(d, fill=fill, align="center")
        else:
            last_c = f"{get_column_letter(last_month_col)}{row}"
            prev_c = f"{get_column_letter(last_month_col - 1)}{row}"
            d.value = f"=IF(OR({last_c}=\"\",{prev_c}=\"\"),\"\",{last_c}-{prev_c})"
            style_body(d, fill=fill, align="center")
            d.number_format = fmt if fmt != "0.0%" else "+0.0%;-0.0%"
            delta_num_rows.append((row, higher_better))
        row += 1

    ws.freeze_panes = "C4"

    # Conditional formatting on the Latest-Delta column, per row direction.
    dl = get_column_letter(delta_col)
    for r, higher_better in delta_num_rows:
        good, bad = (POS_GREEN, NEG_RED) if higher_better else (NEG_RED, POS_GREEN)
        rng = f"{dl}{r}:{dl}{r}"
        ws.conditional_formatting.add(
            rng, CellIsRule(operator="greaterThan", formula=["0"],
                            fill=PatternFill("solid", fgColor=good)))
        ws.conditional_formatting.add(
            rng, CellIsRule(operator="lessThan", formula=["0"],
                            fill=PatternFill("solid", fgColor=bad)))

    # footnote
    fn = row + 1
    ws.cell(row=fn, column=1,
            value="Latest Δ = most recent month minus prior month. Green = improving, "
                  "red = worsening (direction-aware: for Average Position and Index "
                  "Coverage Errors, lower is better). Compare year-over-year too, to "
                  "control for seasonality.")
    ws.cell(row=fn, column=1).font = Font(name="Calibri", italic=True, size=9, color="888888")
    ws.merge_cells(start_row=fn, start_column=1, end_row=fn, end_column=ncols)
    return months


def build_cluster_kpis(wb, geo, clusters):
    if "Cluster KPIs" in wb.sheetnames:
        del wb["Cluster KPIs"]
    ws = wb.create_sheet("Cluster KPIs", index=2)  # after KPI Dashboard
    ws.sheet_view.showGridLines = False
    set_column_widths(ws, [40, 14, 16, 14, 13, 13])

    ws.cell(row=1, column=1, value="Cluster KPIs - auto-rollup from Keyword Master")
    style_title(ws.cell(row=1, column=1))
    ws.cell(row=2, column=1,
            value="100% formula-driven. Reflects the latest 28-day snapshot pasted into "
                  "Keyword Master - no manual entry here.")
    style_subtitle(ws.cell(row=2, column=1))

    hdr = 3
    labels = ["Cluster", "Clicks (28d)", "Impressions (28d)", "Avg Position",
              "# Keywords", "# in Top 10"]
    for i, label in enumerate(labels, start=1):
        style_header(ws.cell(row=hdr, column=i, value=label), fill=FOREST_GREEN)
    ws.row_dimensions[hdr].height = 30

    km = f"'{KM_SHEET}'!"
    cl = geo["cluster"]; pos = geo["position"]; imp = geo["impressions"]; clk = geo["clicks"]
    lr = geo["last_row"]
    clu_rng = f"{km}${cl}$2:${cl}${lr}"
    pos_rng = f"{km}${pos}$2:${pos}${lr}"
    imp_rng = f"{km}${imp}$2:${imp}${lr}"
    clk_rng = f"{km}${clk}$2:${clk}${lr}"

    row = hdr + 1
    zebra = False
    for name in clusters:
        fill = LIGHT_GREEN if zebra else WHITE
        zebra = not zebra
        crit = f'"{name}"'
        style_body(ws.cell(row=row, column=1, value=name), bold=True, fill=fill)
        # Clicks
        c = ws.cell(row=row, column=2,
                    value=f"=SUMIF({clu_rng},A{row},{clk_rng})")
        style_body(c, fill=fill, align="center"); c.number_format = "#,##0"
        # Impressions
        c = ws.cell(row=row, column=3,
                    value=f"=SUMIF({clu_rng},A{row},{imp_rng})")
        style_body(c, fill=fill, align="center"); c.number_format = "#,##0"
        # Avg Position - only rows with position > 0; blank-safe
        c = ws.cell(row=row, column=4,
                    value=(f'=IFERROR(AVERAGEIFS({pos_rng},{clu_rng},A{row},'
                           f'{pos_rng},">0"),"-")'))
        style_body(c, fill=fill, align="center"); c.number_format = "0.0"
        # # Keywords
        c = ws.cell(row=row, column=5, value=f"=COUNTIF({clu_rng},A{row})")
        style_body(c, fill=fill, align="center")
        # # in Top 10
        c = ws.cell(row=row, column=6,
                    value=(f'=COUNTIFS({clu_rng},A{row},{pos_rng},">0",'
                           f'{pos_rng},"<=10")'))
        style_body(c, fill=fill, align="center")
        row += 1

    # TOTAL row
    fill = FOREST_GREEN
    style_body(ws.cell(row=row, column=1, value="TOTAL / All clusters"),
               bold=True, fill=fill, color=WHITE)
    for col_i, num in [(2, "#,##0"), (3, "#,##0"), (5, "0"), (6, "0")]:
        L = get_column_letter(col_i)
        c = ws.cell(row=row, column=col_i, value=f"=SUM({L}4:{L}{row-1})")
        style_body(c, bold=True, fill=fill, color=WHITE, align="center")
        c.number_format = num
    c = ws.cell(row=row, column=4, value=f'=IFERROR(AVERAGEIFS({pos_rng},{pos_rng},">0"),"-")')
    style_body(c, bold=True, fill=fill, color=WHITE, align="center"); c.number_format = "0.0"

    ws.freeze_panes = "B4"


def append_readme(wb, months):
    if "README" not in wb.sheetnames:
        return
    ws = wb["README"]
    r = ws.max_row + 2
    ws.cell(row=r, column=2, value="KPI Dashboard - how to update (monthly)")
    style_subtitle(ws.cell(row=r, column=2))
    lines = [
        "Once a month, open 'KPI Dashboard' and paste this month's numbers into the "
        f"newest month column (seeded: {', '.join(months)}). Add a new dated column "
        "each month to grow the trend. Deltas and colors update automatically.",
        "",
        "Where each number comes from (all free tools):",
        "  - Google Search Console (GSC) > Performance: impressions, clicks, CTR, avg "
        "position, and the Top 3/10/100 keyword counts (tracked set).",
        "  - GSC > Pages (Indexing): indexed page count and coverage errors.",
        "  - GSC > Core Web Vitals: Pass / Needs work / Fail.",
        "  - Google Business Profile (GBP) > Performance: calls, direction requests, "
        "website clicks, profile views (the local conversion signals).",
        "",
        "'Cluster KPIs' needs no input - it rolls up automatically from the Keyword "
        "Master columns you already maintain (Clicks/Impressions/Position by cluster).",
        "'Tracking Log Template' is the per-keyword drill-down beneath the dashboard - "
        "log individual keyword movement there when you want detail.",
        "",
        "Read the tiers top-down: impressions rise -> rankings improve -> clicks grow -> "
        "GBP actions follow. If impressions are up but clicks flat, it's a title/CTR "
        "issue; if clicks up but GBP actions flat, it's an intent/match issue.",
    ]
    for i, line in enumerate(lines, start=1):
        c = ws.cell(row=r + i, column=2, value=line)
        c.font = Font(name="Calibri", size=10, color=DARK_TEXT)
        c.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)


def main():
    if not os.path.exists(FILE):
        sys.exit(f"ERROR: workbook not found: {FILE}")
    lock = os.path.join(os.path.dirname(FILE), "~$" + os.path.basename(FILE))
    if os.path.exists(lock):
        sys.exit("ERROR: workbook appears open in Excel (~$ lock present). "
                 "Close it and re-run.")

    shutil.copy2(FILE, BACKUP)
    print(f"Backup created: {BACKUP}")

    wb = load_workbook(FILE)
    geo, clusters = km_geometry(wb)
    print(f"Keyword Master: {geo['last_row'] - 1} data rows; "
          f"columns -> cluster={geo['cluster']} clicks={geo['clicks']} "
          f"impr={geo['impressions']} pos={geo['position']}")
    print(f"Clusters detected ({len(clusters)}): {clusters}")

    months = build_kpi_dashboard(wb)
    build_cluster_kpis(wb, geo, clusters)
    append_readme(wb, months)

    wb.save(FILE)
    print(f"Sheets added: 'KPI Dashboard' (months {months}), 'Cluster KPIs'. "
          f"README updated.")
    print(f"Saved: {FILE}")
    print(f"Final sheet order: {wb.sheetnames}")


if __name__ == "__main__":
    main()
