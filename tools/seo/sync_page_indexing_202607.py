#!/usr/bin/env python3
"""
Sync the Page Indexing Tracker sheet to the 2026-07-03 GSC indexed-pages export
(31 indexed URLs w/ last-crawled dates supplied by Cedric).

Actions:
  - Upgrade rows now confirmed indexed: status -> Indexed (green pill) + crawl date.
  - Fix Article #17 slug drift (planned '...-where-to-drink' -> live '/lipa-barako-coffee-heritage/').
  - Refresh Last Crawled + Last Checked on rows already Indexed.
  - Add the 2 booking-form endpoints that surfaced indexed but weren't in the table.
  - Never downgrades a row / never touches Page-Not-Published future rows.

In-place patcher; backs up first. Run with the workbook CLOSED.
"""
import os, shutil, sys
from copy import copy
from openpyxl import load_workbook
from openpyxl.styles import Font, Alignment

BASE = "/Volumes/Files and Cloud/Dropbox/VSCode (non-Git)/seo/content for HavenInLipa"
FILE = os.path.join(BASE, "HavenInLipa_SEO_Tracker.xlsx")
BACKUP = os.path.join(BASE, "HavenInLipa_SEO_Tracker.pre-pageindex-jul.backup.xlsx")
SHEET = "Page Indexing Tracker"
TODAY = "2026-07-04"

# rows whose status becomes Indexed this pull -> crawl date + new Action text
UPGRADES = {
    20: ("2026-06-28", "Indexed ✓ (GSC 2026-06-28) — monitor."),
    24: ("2026-06-25", "Indexed ✓ (GSC 2026-06-25) — monitor."),
    25: ("2026-06-25", "Indexed ✓ (GSC 2026-06-25) — monitor."),
    35: ("2026-06-18", "Indexed ✓ (GSC 2026-06-18) — monitor."),
    47: ("2026-06-25", "Indexed ✓ (GSC 2026-06-25) — monitor."),
    48: ("2026-06-26", "Indexed ✓ (GSC 2026-06-26) — monitor."),
    37: ("2026-06-22", "Indexed ✓ (GSC 2026-06-22) — monitor."),
}
# already-Indexed rows -> just refresh crawl date
REFRESH = {
    2: "2026-06-24", 4: "2026-06-26", 5: "2026-06-26", 6: "2026-05-17",
    7: "2026-06-24", 8: "2026-06-24", 9: "2026-05-08", 10: "2026-06-25",
    12: "2026-05-06", 13: "2026-05-17", 14: "2026-06-29", 15: "2026-06-29",
    16: "2026-06-26", 17: "2026-05-19", 18: "2026-06-29", 19: "2026-06-26",
    21: "2026-06-28", 22: "2026-06-26", 23: "2026-06-28", 31: "2026-05-18",
    33: "2026-05-18", 34: "2026-05-17",
}
# Article #17 live slug correction
R37_LIVE_URL = "https://blog.haveninlipa.com/lipa-barako-coffee-heritage/"

NEW_ROWS = [
    ("https://haveninlipa.com/properties/mickey-in-lipa--full-family-house--sleeps-15/book",
     "Booking form (Mickey sleeps-15)", "Cluster 1/6 transactional (booking endpoint)",
     "Indexed", "2026-06-23", TODAY,
     "Decide: keep indexed or noindex booking-form URL (often thin/duplicate).",
     "Auto-generated /book endpoint; surfaced indexed in the 2026-07 GSC pull."),
    ("https://haveninlipa.com/properties/mickey-in-lipa--family-staycation--sleeps-7/book",
     "Booking form (Mickey sleeps-7)", "Cluster 1/6 transactional (booking endpoint)",
     "Indexed", "2026-06-15", TODAY,
     "Decide: keep indexed or noindex booking-form URL (often thin/duplicate).",
     "Auto-generated /book endpoint; surfaced indexed in the 2026-07 GSC pull. "
     "(sleeps-11/book is NOT indexed.)"),
]


def main():
    lock = os.path.join(os.path.dirname(FILE), "~$" + os.path.basename(FILE))
    if os.path.exists(lock):
        sys.exit("ERROR: workbook open in Excel (~$ lock). Close and re-run.")
    shutil.copy2(FILE, BACKUP)
    print(f"Backup: {BACKUP}")

    wb = load_workbook(FILE)
    ws = wb[SHEET]

    # capture the green "Indexed" pill style from an existing Indexed cell (r2, col4)
    pill = ws.cell(2, 4)
    pill_font, pill_fill, pill_align, pill_border = (
        copy(pill.font), copy(pill.fill), copy(pill.alignment), copy(pill.border))

    def set_indexed_pill(r):
        c = ws.cell(r, 4)
        c.value = "Indexed"
        c.font, c.fill, c.alignment, c.border = (
            copy(pill_font), copy(pill_fill), copy(pill_align), copy(pill_border))

    def append_note(r, extra):
        cur = ws.cell(r, 8).value or ""
        ws.cell(r, 8).value = (str(cur) + (" | " if cur else "") + extra).strip()

    # --- upgrades ---
    for r, (crawl, action) in UPGRADES.items():
        if r == 37:
            ws.cell(r, 1).value = R37_LIVE_URL
        set_indexed_pill(r)
        ws.cell(r, 5).value = crawl
        ws.cell(r, 6).value = TODAY
        ws.cell(r, 7).value = action
        note = f"Confirmed indexed (GSC crawl {crawl}); verified {TODAY}."
        if r == 37:
            note += " Live slug is /lipa-barako-coffee-heritage/ (shorter than planned; slug drift corrected)."
        append_note(r, note)

    # --- refresh already-Indexed rows ---
    for r, crawl in REFRESH.items():
        ws.cell(r, 5).value = crawl
        ws.cell(r, 6).value = TODAY

    # --- add new rows (copy styling from body rows r4/r5 for zebra continuity) ---
    start = ws.max_row + 1
    for i, data in enumerate(NEW_ROWS):
        r = start + i
        template = 4 if (r % 2 == 0) else 5     # E8EFE0 / white alternating
        for col in range(1, 9):
            src = ws.cell(template, col)
            dst = ws.cell(r, col, value=data[col - 1])
            dst.font = copy(src.font); dst.fill = copy(src.fill)
            dst.border = copy(src.border); dst.alignment = copy(src.alignment)
        set_indexed_pill(r)   # status col gets the green pill

    # extend auto-filter / freeze if present
    if ws.auto_filter and ws.auto_filter.ref:
        from openpyxl.utils import get_column_letter
        ws.auto_filter.ref = f"A1:{get_column_letter(ws.max_column)}{ws.max_row}"

    wb.save(FILE)
    print(f"Upgraded to Indexed: {sorted(UPGRADES)} (r37 slug corrected).")
    print(f"Crawl dates refreshed on {len(REFRESH)} already-Indexed rows.")
    print(f"Added rows {start}-{ws.max_row}: {[d[0] for d in NEW_ROWS]}")
    print(f"Sheet now {ws.max_row - 1} data rows. Saved: {FILE}")


if __name__ == "__main__":
    main()
