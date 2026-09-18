"""Sync Page Indexing Tracker against the 2026-08-31 GSC indexed-pages pull (44 URLs)."""
import shutil
from datetime import date
import openpyxl

WORKBOOK = "../HavenInLipa_SEO_Tracker.xlsx"
BACKUP = "../HavenInLipa_SEO_Tracker.pre-083126indexsync.backup.xlsx"
TODAY = "2026-08-31"

# URL (normalized, no trailing slash, no protocol/www variance) -> last-crawled date from the GSC pull
INDEXED_44 = {
    "blog.haveninlipa.com/mt-maculot-hiking-guide-2026-trail-tips-routes-where-to-stay-in-lipa": "2026-08-21",
    "blog.haveninlipa.com/indoor-things-to-do-in-lipa-city-when-it-rains": "2026-08-20",
    "haveninlipa.com": "2026-08-19",
    "blog.haveninlipa.com/lipa-barako-coffee-heritage": "2026-08-19",
    "blog.haveninlipa.com": "2026-08-19",
    "blog.haveninlipa.com/casa-de-segunda-lipa-city": "2026-08-19",
    "blog.haveninlipa.com/ninoy-aquino-day-long-weekend-lipa-2026": "2026-08-19",
    "haveninlipa.com/about": "2026-08-17",
    "blog.haveninlipa.com/best-lomi-lipa-city": "2026-08-16",
    "blog.haveninlipa.com/category/travel-and-itineraries": "2026-08-16",
    "blog.haveninlipa.com/how-to-get-to-lipa-city-from-manila-2026-guide": "2026-08-16",
    "blog.haveninlipa.com/family-weekend-batangas-without-beach-crowds": "2026-08-16",
    "blog.haveninlipa.com/romantic-getaway-batangas-lipa-city": "2026-08-16",
    "blog.haveninlipa.com/work-from-lipa-rainy-season-july": "2026-08-15",
    "haveninlipa.com/properties/spacious-2-bedroom": "2026-08-15",
    "blog.haveninlipa.com/15-best-things-to-do-in-lipa-city-batangas-2026-locals-guide": "2026-08-14",
    "blog.haveninlipa.com/lipa-charter-day-history-coffee-town-to-city": "2026-08-13",
    "blog.haveninlipa.com/category/weekend-getaways": "2026-08-10",
    "blog.haveninlipa.com/lipa-vs-tagaytay-an-honest-comparison-from-a-host-who-lives-in-lipa": "2026-08-10",
    "blog.haveninlipa.com/barkada-getaway-near-manila-why-a-whole-house-in-lipa-beats-a-beach-resort-cost-per-head-math-inside": "2026-08-10",
    "blog.haveninlipa.com/category/outdoor-adventures": "2026-08-09",
    "blog.haveninlipa.com/weekend-getaway-in-lipa-city-batangas-your-chill-escape-near-manila": "2026-08-09",
    "haveninlipa.com/properties/cozy-1-bedroom": "2026-08-08",
    "blog.haveninlipa.com/family-staycation-lipa-city-batangas": "2026-08-08",
    "blog.haveninlipa.com/taal-volcano-day-trip-from-lipa-city-2026-updated-guide": "2026-08-08",
    "blog.haveninlipa.com/best-restaurants-cafes-in-lipa-city-batangas-2026-food-guide": "2026-08-08",
    "blog.haveninlipa.com/work-from-lipa-the-affordable-remote-work-staycation-near-manila": "2026-08-06",
    "blog.haveninlipa.com/mickey-in-lipa-coming-soon": "2026-08-06",
    "blog.haveninlipa.com/august-long-weekends-lipa-city-2026": "2026-08-04",
    "blog.haveninlipa.com/category/getting-here": "2026-07-28",
    "haveninlipa.com/properties/mickey-in-lipa--family-staycation--sleeps-7": "2026-07-26",
    "haveninlipa.com/properties/mickey-in-lipa--family-house--sleeps-11": "2026-07-22",
    "blog.haveninlipa.com/category/uncategorized": "2026-07-21",
    "blog.haveninlipa.com/category/booking-tips": "2026-07-15",
    "blog.haveninlipa.com/independence-day-long-weekend-lipa-2026": "2026-07-14",
    "blog.haveninlipa.com/why-book-direct-instead-of-airbnb-a-philippines-hosts-honest-take": "2026-07-05",
    "haveninlipa.com/terms": "2026-07-03",
    "haveninlipa.com/properties/mickey-in-lipa--full-family-house--sleeps-15": "2026-06-26",
    "haveninlipa.com/faq": "2026-06-24",
    "haveninlipa.com/privacy": "2026-06-24",
    "haveninlipa.com/properties/mickey-in-lipa--full-family-house--sleeps-15/book": "2026-06-23",
    "haveninlipa.com/properties/mickey-in-lipa--family-staycation--sleeps-7/book": "2026-06-15",
    "blog.haveninlipa.com/tag/barako-coffee": "2026-05-18",
    "blog.haveninlipa.com/holy-week-in-lipa-city-batangas-a-peaceful-retreat-near-manila": "2026-05-06",
}
assert len(INDEXED_44) == 44, len(INDEXED_44)


def norm(url: str) -> str:
    u = url.strip()
    if u.startswith("(TBD) "):
        u = u[6:]
    u = u.replace("https://", "").replace("http://", "")
    if u.startswith("www."):
        u = u[4:]
    if u.endswith("/"):
        u = u[:-1]
    return u


def main():
    shutil.copy(WORKBOOK, BACKUP)
    wb = openpyxl.load_workbook(WORKBOOK)
    ws = wb["Page Indexing Tracker"]

    headers = [c.value for c in ws[1]]
    col = {h: i + 1 for i, h in enumerate(headers)}

    matched = set()
    changes = []

    for r in range(2, ws.max_row + 1):
        raw_url = ws.cell(r, col["URL"]).value
        if not raw_url:
            continue
        key = norm(raw_url)
        status_cell = ws.cell(r, col["Indexing Status"])
        crawled_cell = ws.cell(r, col["Last Crawled (GSC)"])
        checked_cell = ws.cell(r, col["Last Checked (you)"])
        action_cell = ws.cell(r, col["Action Needed"])
        notes_cell = ws.cell(r, col["Notes"])

        old_status = status_cell.value

        if key in INDEXED_44:
            matched.add(key)
            gsc_date = INDEXED_44[key]
            crawled_cell.value = gsc_date
            checked_cell.value = TODAY

            if old_status in ("Live – verify GSC", "Page Not Published"):
                status_cell.value = "Indexed"
                action_cell.value = f"Indexed ✓ (GSC {gsc_date}) — monitor."
                notes_cell.value = (notes_cell.value or "") + f" | Confirmed indexed in 2026-08-31 GSC Pages pull (crawled {gsc_date})."
                changes.append((raw_url, old_status, "Indexed"))
            elif old_status == "noindexed":
                status_cell.value = "Indexed (contradicts prior noindex — verify tag actually applied)"
                notes_cell.value = (notes_cell.value or "") + f" | FLAG 2026-08-31: still showing Indexed in GSC pull (crawled {gsc_date}) despite noindex assumption — check live source for the noindex meta tag."
                changes.append((raw_url, old_status, status_cell.value))
            elif old_status == "noindex – pending drop":
                notes_cell.value = (notes_cell.value or "") + f" | Still indexed as of 2026-08-31 pull (crawled {gsc_date}) — noindex not yet honored; consider a GSC Removals tool request to speed the drop."
                changes.append((raw_url, old_status, old_status + " (still pending, flagged)"))
            else:
                changes.append((raw_url, old_status, old_status + " (refreshed dates only)"))
        else:
            # Not in the new indexed list
            checked_cell.value = TODAY
            if old_status == "noindexed":
                status_cell.value = "Dropped from index ✓ (noindex honored)"
                notes_cell.value = (notes_cell.value or "") + " | CONFIRMED DROPPED: absent from 2026-08-31 GSC indexed-pages pull."
                changes.append((raw_url, old_status, status_cell.value))
            elif old_status == "Live – verify GSC":
                notes_cell.value = (notes_cell.value or "") + " | FLAG 2026-08-31: still not indexed — absent from the GSC pull. Check Coverage / Crawled-not-indexed report."
                changes.append((raw_url, old_status, old_status + " (still not indexed, flagged)"))
            elif old_status == "Page Not Published":
                pass  # correctly absent, e.g. #26 handled specially below, TBD rows untouched
            # noindex – pending drop rows already handled above when matched; nothing else to do here

    # Special case: article #26 heroes-day — PROJECT_STATUS confirms it published 2026-08-24
    # but it's absent from the 44-page pull (too new to be indexed yet). Flip from
    # "Page Not Published" to "Live – verify GSC" so the tracker reflects reality.
    for r in range(2, ws.max_row + 1):
        raw_url = ws.cell(r, col["URL"]).value
        if raw_url and "heroes-day-weekend-lipa-2026-quiet-itinerary" in raw_url:
            status_cell = ws.cell(r, col["Indexing Status"])
            action_cell = ws.cell(r, col["Action Needed"])
            notes_cell = ws.cell(r, col["Notes"])
            checked_cell = ws.cell(r, col["Last Checked (you)"])
            old = status_cell.value
            status_cell.value = "Live – verify GSC"
            action_cell.value = "Published 2026-08-24 (confirmed live) — not yet indexed as of 2026-08-31 pull; confirm in next GSC pull."
            notes_cell.value = (notes_cell.value or "") + " | Status corrected 2026-08-31: was still marked Page Not Published though it published on schedule 8/24."
            checked_cell.value = TODAY
            changes.append((raw_url, old, status_cell.value))

    # New rows: category archives found indexed but never tracked
    new_category_rows = [
        ("https://blog.haveninlipa.com/category/travel-and-itineraries/", "2026-08-16"),
        ("https://blog.haveninlipa.com/category/weekend-getaways/", "2026-08-10"),
        ("https://blog.haveninlipa.com/category/outdoor-adventures/", "2026-08-09"),
        ("https://blog.haveninlipa.com/category/uncategorized/", "2026-07-21"),
        ("https://blog.haveninlipa.com/category/getting-here/", "2026-07-28"),
    ]
    next_row = ws.max_row + 1
    for url, gsc_date in new_category_rows:
        ws.cell(next_row, col["URL"]).value = url
        ws.cell(next_row, col["Page Type"]).value = "Blog category archive"
        ws.cell(next_row, col["Linked Cluster / Keywords"]).value = "Thin / none (auto-generated archive)"
        ws.cell(next_row, col["Indexing Status"]).value = "Indexed (newly discovered — review)"
        ws.cell(next_row, col["Last Crawled (GSC)"]).value = gsc_date
        ws.cell(next_row, col["Last Checked (you)"]).value = TODAY
        ws.cell(next_row, col["Action Needed"]).value = "Not previously tracked. Decide: add noindex,follow like /tag/ and /author/ archives, or keep if it's earning useful clicks."
        ws.cell(next_row, col["Notes"]).value = f"Surfaced in the 2026-08-31 GSC indexed-pages pull (crawled {gsc_date}); not in the tracker before today."
        changes.append((url, "(not tracked)", "Indexed (newly discovered — review)"))
        next_row += 1

    unmatched_new = [u for u in INDEXED_44 if u not in matched]

    wb.save(WORKBOOK)

    print(f"Backup written: {BACKUP}")
    print(f"Total changes: {len(changes)}")
    for url, old, new in changes:
        print(f"  {url}\n    {old!r} -> {new!r}")
    if unmatched_new:
        print("\nURLs from the 44-list that never matched an existing tracker row (besides the 5 new category rows added):")
        for u in unmatched_new:
            print(" ", u)


if __name__ == "__main__":
    main()
