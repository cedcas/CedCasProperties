#!/usr/bin/env python3
"""
Build HavenInLipa_Featured_Image_Inventory.xlsx

Consolidates the featured-image spec for Articles 1-29 into one workbook, with the
brand-lockup instruction (centered HavenInLipa logo + URL) appended to the
"What to Shoot or Source" column so each cell is a paste-ready image prompt.

Sources:
  040826/01-homepage-short-term-rental-lipa.md      (title/slug only - no image spec on file)
  040826/02-things-to-do-lipa-city.md               (title/slug only - no image spec on file)
  040826/Blogger_Guide_All_Articles.md              (Articles 3-10)
  050826/11..14-*.md                                (Articles 11-14 header block)
  050826/15..26-*.md                                (Articles 15-26 "## Featured image" block)
  053126/27..29-*.md                                (Articles 27-29 "## Featured image" block)
"""

from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "HavenInLipa_Featured_Image_Inventory.xlsx"

# --- Brand palette (NCS) -----------------------------------------------------
CORAL = "E8734A"
FOREST = "2F5D50"
LIGHT = "F3F1EC"
BAND = "FAF8F5"

URL = "https://HavenInLipa.com"

BRAND_OVERLAY = (
    "\n\n--- BRAND LOCKUP (required on every featured image) ---\n"
    "Compose the shot so the exact center of the 1200 x 630 frame is visually calm and "
    "uncluttered - no faces, no text, no busy detail in the middle third. Place the "
    "HavenInLipa logo dead center of the frame, sized about 22-26% of the image width, "
    "with the URL HavenInLipa.com set immediately below it in a clean sans-serif, lightly "
    "letter-spaced. Treat the logo + URL as one locked unit on the same optical center, "
    "tight spacing. If the center of the background is bright or busy, add a soft dark "
    "radial scrim (or a subtle rounded plate at roughly 35% opacity) behind the lockup so "
    "it stays readable. Use the white/knockout logo with white URL text on dark backgrounds; "
    "the full-color logo with near-black URL text on light backgrounds. Keep the entire "
    "lockup inside the middle 60% of the frame so it survives 1:1, 4:5, and 16:9 social "
    "crops. Nothing may overlap the logo - no headlines, no stickers, no badges."
)

# --- Inventory ---------------------------------------------------------------
# (num, title, slug, filename, alt, what_to_shoot, where_to_source, spec_status, source_file)
ROWS = [
    (
        1,
        "Short-Term Rental in Lipa City, Batangas — Affordable Stays | HavenInLipa",
        "/ (homepage)",
        "01-homepage-short-term-rental-lipa-featured.jpg",
        "Short-term rental in Lipa City Batangas - affordable stays with HavenInLipa",
        "Bright, welcoming daylight shot of a HavenInLipa property — living room or exterior, "
        "clean styling, a hint of Lipa greenery through the window. Should read \"this is a real "
        "home run by a real person,\" not a hotel. Avoid stock hotel-lobby or resort imagery.",
        "Original shot at the 1BR or 2BR. This is the homepage/social share card — it is the image "
        "that appears when haveninlipa.com itself is shared, so it carries the most weight.",
        "PROPOSED — no prior spec on file",
        "040826/01-homepage-short-term-rental-lipa.md",
    ),
    (
        2,
        "15 Best Things to Do in Lipa City, Batangas (2026 Local's Guide)",
        "things-to-do-in-lipa-city-batangas",
        "02-things-to-do-lipa-city-featured.jpg",
        "15 best things to do in Lipa City Batangas - 2026 local's guide",
        "A wide, sunlit Lipa City establishing shot that carries several attractions in one frame — "
        "San Sebastian Cathedral facade, or the Lipa skyline with green highland hills behind it. "
        "Bright, inviting, guide-like. Should say \"there is more here than you thought.\"",
        "Original scouting shot from a Lipa vantage point. Backup: Cathedral exterior in late "
        "afternoon light, no crowds in frame.",
        "PROPOSED — no prior spec on file",
        "040826/02-things-to-do-lipa-city.md",
    ),
    (
        3,
        "Weekend Getaway in Lipa City, Batangas — Your Chill Escape Near Manila",
        "weekend-getaway-lipa-city-batangas",
        "03-weekend-getaway-lipa-featured.jpg",
        "Weekend getaway in Lipa City Batangas - chill escape near Manila",
        "A scenic road or highway view heading south (SLEX / STAR Tollway) with green Batangas hills, "
        "or a cozy cafe scene in Lipa City. The \"we're getting out of Manila\" feeling.",
        "",
        "Spec on file",
        "040826/Blogger_Guide_All_Articles.md",
    ),
    (
        4,
        "Mt. Maculot Hiking Guide 2026 — Trail Tips, Routes + Where to Stay in Lipa",
        "mt-maculot-hiking-guide",
        "04-mt-maculot-hiking-guide-featured.jpg",
        "Mt Maculot Rockies viewpoint overlooking Taal Lake - hiking guide 2026",
        "The iconic Rockies viewpoint at Mt. Maculot with a hiker sitting on the edge, Taal Lake in "
        "the background. Early light, clear air, the classic Rockies silhouette.",
        "",
        "Spec on file",
        "040826/Blogger_Guide_All_Articles.md",
    ),
    (
        5,
        "Best Restaurants & Cafes in Lipa City, Batangas — 2026 Food Guide",
        "best-restaurants-lipa-city-batangas",
        "05-best-restaurants-lipa-featured.jpg",
        "Best restaurants and food in Lipa City Batangas - 2026 food guide",
        "A close-up of a bowl of lomi noodles, or a spread of Filipino dishes on a table. Warm, "
        "appetite-forward, shot in natural light. Real Batangas food, not generic Asian-fusion stock.",
        "",
        "Spec on file",
        "040826/Blogger_Guide_All_Articles.md",
    ),
    (
        6,
        "Why Book Direct Instead of Airbnb? (A Philippine Host's Honest Take)",
        "why-book-direct-instead-of-airbnb",
        "06-why-book-direct-vs-airbnb-featured.jpg",
        "Why book direct instead of Airbnb - save on fees with HavenInLipa",
        "A split-screen concept: one side an OTA fees/checkout screen, the other a direct message "
        "thread with a host. Or a clean graphic built around \"Book Direct = Save 20%\". NCS coral + "
        "forest green if graphic-treated.",
        "Canva graphic is fine here — this one is a concept, not a photograph.",
        "Spec on file",
        "040826/Blogger_Guide_All_Articles.md",
    ),
    (
        7,
        "Taal Volcano Day Trip from Lipa City — 2026 Updated Guide",
        "taal-volcano-day-trip-from-lipa",
        "07-taal-volcano-day-trip-featured.jpg",
        "Taal Volcano day trip from Lipa City Batangas - 2026 updated guide",
        "The iconic Taal Volcano island in the middle of Taal Lake — shot from Tagaytay Ridge or from "
        "a boat on the lake. Clear day, strong horizon, the shape everyone recognizes.",
        "",
        "Spec on file",
        "040826/Blogger_Guide_All_Articles.md",
    ),
    (
        8,
        "Holy Week in Lipa City, Batangas — A Peaceful Retreat Near Manila",
        "holy-week-getaway-lipa-city-batangas",
        "08-holy-week-getaway-lipa-featured.jpg",
        "Holy Week in Lipa City Batangas - peaceful retreat near Manila",
        "San Sebastian Cathedral in Lipa City during golden hour, or a serene church interior. "
        "Reverent and quiet — peaceful retreat, not a crowded procession.",
        "Note: this article was reframed evergreen (June 2026 delta). Keep the image season-neutral — "
        "avoid dated Holy Week signage or year markers.",
        "Spec on file",
        "040826/Blogger_Guide_All_Articles.md",
    ),
    (
        9,
        "Work From Lipa: The Affordable Remote Work Staycation Near Manila",
        "remote-work-staycation-lipa-city",
        "09-remote-work-staycation-lipa-featured.jpg",
        "Remote work staycation in Lipa City - work from anywhere with 400 Mbps WiFi",
        "A laptop on a desk near a window with a green/nature view outside — the \"work from anywhere\" "
        "aesthetic. Clean desk, no clutter, real daylight.",
        "Original shot at the 1BR. Distinguish it from Article #19 (rainy-season version) — this one "
        "is bright and dry.",
        "Spec on file",
        "040826/Blogger_Guide_All_Articles.md",
    ),
    (
        10,
        "How to Get to Lipa City from Manila — Complete 2026 Guide",
        "how-to-get-to-lipa-from-manila",
        "10-how-to-get-to-lipa-from-manila-featured.jpg",
        "How to get to Lipa City from Manila - drive bus or Grab 2026 guide",
        "A highway/expressway shot (SLEX or STAR Tollway) with a green \"Lipa\" exit sign, or a bus at "
        "a terminal. Wayfinding energy — the reader is deciding how to get here.",
        "",
        "Spec on file",
        "040826/Blogger_Guide_All_Articles.md",
    ),
    (
        11,
        "Family Staycation in Lipa City: A Parent's Honest 2-Day Plan (with Budget)",
        "family-staycation-lipa-city-batangas",
        "11-family-staycation-lipa-featured.jpg",
        "Family staycation in Lipa City Batangas - 2-day getaway near Manila for parents and kids",
        "A family of four enjoying a meal together at a Lipa restaurant garden, or the family relaxing "
        "in a vacation rental's living room. Warm, sunlit, parents-and-kids-together energy — the "
        "\"we're glad we came\" moment.",
        "Original shot at the 2BR preferred. Should read Filipino-family-real, not stock-family-posed.",
        "Spec on file",
        "050826/Blogger_Guide_Articles_11_12.md",
    ),
    (
        12,
        "Romantic Getaway in Batangas: Why Lipa City Is the Couple Retreat Manila Sleeps On",
        "romantic-getaway-batangas-lipa-city",
        "12-romantic-getaway-batangas-featured.jpg",
        "Romantic getaway in Batangas - Lipa City couple retreat near Manila",
        "A couple at a cozy Lipa cafe at golden hour, or a candlelit table for two in a garden setting "
        "with soft string lights. Intimate, slow, two-people-only. Avoid anything that could read as a "
        "family-of-four scene.",
        "Original staged shot at the 1BR, or a golden-hour cafe scene. Keep it clearly couple-coded so "
        "it doesn't collide with Article #11's family imagery.",
        "Spec on file",
        "050826/Blogger_Guide_Articles_11_12.md",
    ),
    (
        13,
        "Coming Soon to HavenInLipa: A Disney-Inspired Family House in Lipa City "
        "(and What's Next for the Portfolio)",
        "coming-soon-disney-inspired-family-house-lipa",
        "13-coming-soon-disney-themed-house-lipa-featured.jpg",
        "Disney-inspired family house in Lipa City coming soon to HavenInLipa - Mickey Mouse themed "
        "living room",
        "The Mickey Mouse-accented gallery wall and lounge area of the Mickey in Lipa ground floor — "
        "the \"wow on entry\" moment. Use the GF Open Area render showing the gallery wall, ring "
        "chandelier, and lounge sofa.",
        "Mickey in Lipa render library (renders only — no exterior photos yet). Mickey in Lipa is now "
        "live and bookable, so the image should not read \"waitlist / coming soon.\"",
        "Spec on file",
        "050826/Blogger_Guide_Articles_13_14.md",
    ),
    (
        14,
        "A Family Weekend in Batangas Without the Beach Crowds (And the New Lipa Rental You'll Want "
        "to Bookmark)",
        "family-weekend-batangas-without-beach-crowds",
        "14-family-weekend-batangas-without-beach-crowds-featured.jpg",
        "Family weekend in Batangas without the beach crowds - Lipa City itinerary near Manila",
        "A family enjoying a relaxed afternoon in a Lipa cafe garden or at a Mt. Maculot lookout — calm, "
        "sunlit, no crowds. The whole point is the absence of a crowded beach, so keep sand and shoreline "
        "out of frame entirely.",
        "Original shot. Differentiate visually from Article #11 — this one leans outdoor/lookout, #11 "
        "leans indoor/table.",
        "Spec on file",
        "050826/14-family-weekend-batangas-without-beach-crowds.md",
    ),
    (
        15,
        "Independence Day Long Weekend in Lipa City (Jun 12–14, 2026): A 3-Day Slow-Travel Plan from Manila",
        "independence-day-long-weekend-lipa-2026",
        "15-independence-day-long-weekend-lipa-featured.jpg",
        "Independence Day long weekend in Lipa City Batangas - 3-day getaway near Manila",
        "A quiet golden-hour view of a Lipa village street with a Philippine flag visible on a porch or "
        "window, soft warm light, no crowds. Alternative: a hand holding a small Philippine flag in front "
        "of a Lipa landscape (cathedral, hills, cool morning). Avoid: anything that looks parade-y, "
        "military, or politicized. Tone is patriotic-but-peaceful, not patriotic-and-loud.",
        "Unsplash search \"Philippine flag\" + Lipa-shot composite, or original shot during a scouting walk. "
        "Cafe de Lipa's Facebook page sometimes posts holiday-themed shots — credit if reused.",
        "Spec on file",
        "050826/15-independence-day-long-weekend-lipa.md",
    ),
    (
        16,
        "What to Do in Lipa City When It Rains: 12 Honest Indoor Picks for a Rainy-Day Weekend in Batangas",
        "what-to-do-in-lipa-city-when-it-rains",
        "16-lipa-rainy-day-indoor-things-to-do-featured.jpg",
        "Rainy day in Lipa City Batangas - cozy indoor weekend with coffee and book",
        "A window with soft rain on the glass, a cup of barako coffee or hot chocolate on the sill, a book "
        "open in the foreground. Tone: cozy, slow, indoor-good. Soft warm light from inside, gray light "
        "from outside. The \"we're glad we didn't cancel\" image.",
        "Original shot at the HavenInLipa 1BR or 2BR on the next rainy day. Backup: Unsplash search "
        "\"rain window coffee\" cropped to feel Filipino (avoid Western coffee mugs — use a clean white cup "
        "or a Cafe de Lipa-branded mug if available).",
        "Spec on file",
        "050826/16-lipa-rainy-day-indoor-things-to-do.md",
    ),
    (
        17,
        "The Coffee Capital of the Philippines: Lipa's Barako Heritage (and Where to Drink It Today)",
        "lipa-barako-coffee-heritage-where-to-drink",
        "17-lipa-barako-coffee-heritage-featured.jpg",
        "Lipa barako coffee heritage - the coffee capital of the Philippines",
        "Dark Lipa barako in a simple white cup or enamel mug, whole roasted beans scattered on aged wood "
        "beside it. Soft natural light from one side. Heritage feel — no modern logos, no plastic. Could "
        "include a pandesal or a piece of brown sugar to anchor \"Filipino breakfast.\"",
        "Shoot at Cafe de Lipa with permission (and credit) or stage at the HavenInLipa kitchen with Cafe "
        "de Lipa beans. Avoid Unsplash for the hero — generic \"coffee beans\" stock doesn't carry the "
        "heritage feel.",
        "Spec on file",
        "050826/17-lipa-barako-coffee-heritage.md",
    ),
    (
        18,
        "Lomi in Lipa City: A Local's Guide to the Best Bowls (Beegee's, Lomi King, and the Rest)",
        "best-lomi-lipa-city-local-guide",
        "18-best-lomi-lipa-beegees-featured.jpg",
        "Best lomi in Lipa City Batangas - Beegees lomi house local guide",
        "Top-down shot of a steaming bowl of Special Lomi — thick noodles visible, a cracked yolk in the "
        "center, chicharon and fried garlic on top, calamansi and chili oil on a small side plate. Shot at "
        "Beegee's with permission, or staged with takeaway lomi at the rental.",
        "Beegee's Lomi House Facebook page (ask permission, credit them), or original shot on a scouting "
        "visit. Don't use generic ramen stock — the bowls look noticeably different.",
        "Spec on file",
        "050826/18-best-lomi-lipa-beegees.md",
    ),
    (
        19,
        "Work From Lipa in Rainy Season: Why July Is the Quiet-Productive Sweet Spot",
        "work-from-lipa-rainy-season-july",
        "19-work-from-lipa-rainy-season-featured.jpg",
        "Work from Lipa City in rainy season - remote work Philippines weekend",
        "Clean workspace at a window — laptop open showing a code editor or doc, fiber WiFi router visible "
        "somewhere nearby, coffee on the desk, soft rain on the window. Productive-cozy mood. Could be "
        "staged at the 1BR for authenticity.",
        "Original shot at HavenInLipa 1BR. Avoid generic \"laptop and coffee\" stock — needs to read as "
        "Lipa-specific (Cafe de Lipa mug, or a view of Lipa hills out the window).",
        "Spec on file",
        "050826/19-work-from-lipa-rainy-season.md",
    ),
    (
        20,
        "Lipa vs. Tagaytay: An Honest Comparison from a Host Who Lives in Lipa",
        "lipa-vs-tagaytay-honest-comparison",
        "20-lipa-vs-tagaytay-comparison-featured.jpg",
        "Lipa vs Tagaytay comparison - which weekend getaway near Manila",
        "Split / side-by-side composition. Left side: Tagaytay traffic line on Aguinaldo Highway, cars "
        "stacked. Right side: a quiet Lipa village or Mt. Maculot in the distance. Visual contrast does "
        "the storytelling.",
        "Original side-by-side composition in Canva using two stock photos (Pexels \"Tagaytay traffic\" + "
        "original Lipa shot). Or two clean photographs separately framed.",
        "Spec on file",
        "050826/20-lipa-vs-tagaytay-comparison.md",
    ),
    (
        21,
        "Casa de Segunda and the Spanish-Era Houses of Lipa: A Heritage Walk",
        "casa-de-segunda-lipa-heritage-walk",
        "21-casa-de-segunda-lipa-heritage-walk-featured.jpg",
        "Casa de Segunda Lipa City Spanish-era heritage house museum",
        "Facade of Casa de Segunda — bahay-na-bato, white walls, dark wooden balcony, capiz windows on the "
        "upper floor. Late-afternoon or early-morning light. No tourists in frame.",
        "Original scouting visit. Casa de Segunda's own Facebook page sometimes posts clean exterior "
        "photos — ask permission and credit. Avoid generic \"Filipino heritage house\" stock — needs to be "
        "specifically Casa de Segunda for authenticity.",
        "Spec on file",
        "050826/21-casa-de-segunda-lipa-heritage-walk.md",
    ),
    (
        22,
        "Where to Pray, Reflect, and Rest in Lipa: Carmel of Lipa, San Sebastian Cathedral, and Quiet "
        "Stays for Pilgrims",
        "where-to-pray-reflect-rest-lipa-carmel-cathedral",
        "22-lipa-carmel-cathedral-pilgrimage-stays-featured.jpg",
        "Carmel of Lipa pilgrimage and reflective stay - Marian devotion Philippines",
        "A rosary on a wooden surface beside a small Marian image or candle, soft natural light from a "
        "window. Reverent and simple. Avoid: ornate religious gold-and-velvet imagery, anything that reads "
        "commercial. Tone is quiet domestic devotion.",
        "Original staged shot at the rental. Avoid stock images of dramatic religious scenes — they read "
        "commercial and the article's tone is restrained.",
        "Spec on file",
        "050826/22-lipa-carmel-cathedral-pilgrimage-stays.md",
    ),
    (
        23,
        "Lipa in August: The 2026 Long-Weekend Booking Guide (Ninoy Aquino Day + Heroes Day)",
        "lipa-august-long-weekends-2026-booking-guide",
        "23-lipa-august-long-weekends-2026-featured.jpg",
        "August 2026 long weekends in Lipa City - Ninoy Aquino Day and Heroes Day booking guide",
        "Canva-style graphic: August 2026 calendar with Aug 21-23 and Aug 28-31 highlighted in NCS coral. "
        "Small Lipa silhouette or coffee cup icon in the corner. Clean and bookable-feeling.",
        "Built as a graphic, not a photograph. Keep the calendar block off-center so the brand lockup owns "
        "the middle of the frame.",
        "Spec on file",
        "050826/23-lipa-august-long-weekends-2026.md",
    ),
    (
        24,
        "Lipa Charter Day (August 20): How a Coffee Town Became a City — and Why It Still Feels Like One",
        "lipa-charter-day-history-coffee-town-to-city",
        "24-lipa-charter-day-coffee-town-to-city-featured.jpg",
        "Lipa City Charter Day August 20 - history of Lipa from coffee town to chartered city",
        "Canva composition or photo collage: vintage sepia-toned Lipa imagery (period postcard, old church "
        "photo, family photograph) + modern color view of Lipa today (cathedral, street, hills). The \"then "
        "and now\" mood. Title-text overlay optional: \"Aug 20, 1947.\" NCS palette.",
        "Then/now split works best. Keep any date overlay to a lower corner so it doesn't fight the brand "
        "lockup in the center.",
        "Spec on file",
        "050826/24-lipa-charter-day-coffee-town-to-city.md",
    ),
    (
        25,
        "Ninoy Aquino Day Long Weekend in Lipa (Aug 21–23, 2026): The Anti-Beach-Crowd Itinerary",
        "ninoy-aquino-day-long-weekend-lipa-2026",
        "25-ninoy-aquino-day-weekend-lipa-featured.jpg",
        "Ninoy Aquino Day weekend in Lipa City Batangas - anti-beach crowd getaway",
        "A quiet HavenInLipa pool or villa shot in soft late-afternoon light, OR a cool morning view of "
        "Mt. Maculot with no hikers in frame. Tone is \"this is what everyone else is missing.\" Anti-beach "
        "contrast — no sand, no crowds.",
        "Original shot at HavenInLipa. Backup: Mt. Maculot wide shot from a scouting trip.",
        "Spec on file",
        "050826/25-ninoy-aquino-day-weekend-lipa.md",
    ),
    (
        26,
        "Heroes Day Weekend in Lipa (Aug 28–31, 2026): A Quiet, Indoor-Friendly 4-Day Itinerary",
        "heroes-day-weekend-lipa-2026-quiet-itinerary",
        "26-heroes-day-weekend-lipa-quiet-itinerary-featured.jpg",
        "Heroes Day weekend in Lipa City - quiet 4-day indoor-friendly getaway",
        "A cozy indoor scene at HavenInLipa — soft lamp light on a couch with a book and coffee, gentle "
        "rain visible through the window, late-afternoon mood. The \"long weekend, indoor by choice\" image. "
        "Avoid: bright sunny pool shots, which contradict the wet-season framing.",
        "Original shot at HavenInLipa 1BR or 2BR. Reuse the rainy-day visual cues from Article #16's "
        "library if available.",
        "Spec on file",
        "050826/26-heroes-day-weekend-lipa-quiet-itinerary.md",
    ),
    (
        27,
        "Barkada Getaway Near Manila? Why a Whole House in Lipa Beats a Beach Resort "
        "(Cost-Per-Head Math Inside)",
        "barkada-getaway-lipa-whole-house-near-manila",
        "27-barkada-getaway-lipa-featured.jpg",
        "Barkada getaway in a whole-house rental in Lipa City Batangas near Manila",
        "A group of friends around a dining table in a bright, modern rental — food spread, drinks, relaxed "
        "laughter, no resort branding. The \"we have the whole place to ourselves\" feel. NCS coral + forest "
        "green accents if graphic-treated. Avoid stocky/staged \"diverse office team\" energy — it should "
        "read Filipino-barkada-real.",
        "Original shot at the whole-house property. Keep the table's center clear of the tallest dishes so "
        "the brand lockup has room.",
        "Spec on file",
        "053126/27-barkada-getaway-lipa-whole-house.md",
    ),
    (
        28,
        "The Batangas Road Trip Itinerary That Uses Lipa as Your Base (2D1N & 3D2N, Real PHP Budgets)",
        "batangas-road-trip-itinerary-lipa-base",
        "28-batangas-road-trip-lipa-base-featured.jpg",
        "Batangas road trip itinerary using Lipa City as a base near Manila",
        "A car on a quiet Batangas highland road, green hills, hint of Taal in the distance, early light. "
        "Open-road-close-to-home mood. Avoid generic highway stock — keep it recognizably Batangas highland.",
        "Original shot on a scouting drive. A road receding toward the horizon gives a natural calm center "
        "for the brand lockup.",
        "Spec on file",
        "053126/28-batangas-road-trip-itinerary-lipa-base.md",
    ),
    (
        29,
        "Summer in Lipa: The Cool Highland Escape When the Beaches Are Too Hot and Too Crowded",
        "summer-in-lipa-cool-highland-escape",
        "29-summer-in-lipa-cool-escape-featured.jpg",
        "Summer in Lipa City Batangas - cool highland escape near Manila",
        "A shaded Lipa cafe or porch, cool morning light, greenery, an iced barako coffee. Calm and cool — "
        "the opposite of a crowded beach. Avoid any beach imagery (off-message).",
        "Original shot. Evergreen article — keep the image year-agnostic (no \"Summer 2026\" text).",
        "Spec on file",
        "053126/29-summer-in-lipa-cool-highland-escape.md",
    ),
]

HEADERS = [
    "Article #",
    "Article Title",
    "URL Slug",
    "Current File Name",
    "New File Name (branded v2)",
    "Dimensions",
    "Alt Text",
    "What to Shoot or Source  (paste this into ChatGPT)",
    "Where to Source / Notes",
    "Spec Status",
    "Source Spec File",
    "Redo Status",
]

WIDTHS = [9, 46, 34, 44, 46, 14, 52, 96, 46, 26, 44, 14]


def style_header(ws, row=1, ncols=len(HEADERS)):
    fill = PatternFill("solid", fgColor=FOREST)
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = fill
        cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ws.row_dimensions[row].height = 34


def build_inventory(wb):
    ws = wb.active
    ws.title = "Featured Image Inventory"

    thin = Side(style="thin", color="D8D3CC")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    ws.append(HEADERS)
    style_header(ws)

    for i, (num, title, slug, fname, alt, shoot, source, status, srcfile) in enumerate(ROWS):
        new_name = fname.replace(".jpg", "-v2.jpg")
        ws.append([
            num,
            title,
            slug,
            fname,
            new_name,
            "1200 x 630 px",
            alt,
            shoot + BRAND_OVERLAY,
            source,
            status,
            srcfile,
            "Not started",
        ])
        r = ws.max_row
        band = (i % 2 == 1)
        for c in range(1, len(HEADERS) + 1):
            cell = ws.cell(row=r, column=c)
            cell.border = border
            cell.font = Font(name="Calibri", size=10)
            cell.alignment = Alignment(
                horizontal="center" if c in (1, 6) else "left",
                vertical="top",
                wrap_text=True,
            )
            if band:
                cell.fill = PatternFill("solid", fgColor=BAND)
        ws.cell(row=r, column=1).font = Font(name="Calibri", size=11, bold=True, color=FOREST)
        ws.cell(row=r, column=2).font = Font(name="Calibri", size=10, bold=True)
        for c in (4, 5):
            ws.cell(row=r, column=c).font = Font(name="Consolas", size=9)
        if status.startswith("PROPOSED"):
            ws.cell(row=r, column=10).font = Font(name="Calibri", size=10, bold=True, color=CORAL)
        ws.row_dimensions[r].height = 150

    for i, w in enumerate(WIDTHS, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.freeze_panes = "C2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(HEADERS))}{ws.max_row}"
    ws.sheet_view.showGridLines = False


def build_brand_sheet(wb):
    ws = wb.create_sheet("Brand Lockup Spec")
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 120

    ws["A1"] = "HavenInLipa — Featured Image Brand Lockup"
    ws["A1"].font = Font(name="Calibri", size=16, bold=True, color=FOREST)
    ws.merge_cells("A1:B1")
    ws.row_dimensions[1].height = 26

    ws["A2"] = (
        "Every featured image for Articles 1–29 is being re-made so the HavenInLipa logo and URL sit "
        "in the dead center of the frame — the mark stays visible no matter how Facebook, Instagram, "
        "or LinkedIn crops the share card."
    )
    ws["A2"].font = Font(name="Calibri", size=11, italic=True)
    ws["A2"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.merge_cells("A2:B2")
    ws.row_dimensions[2].height = 46

    rows = [
        ("URL to display", URL.replace("https://", "") + "   (source: " + URL + ")"),
        ("Canvas size", "1200 x 630 px (Open Graph standard). Export JPG, 80–85% quality, under 300 KB."),
        ("Logo position", "Dead center of the frame — both horizontally and vertically."),
        ("Logo size", "22–26% of image width (about 265–310 px on a 1200 px canvas)."),
        ("URL placement", "Directly beneath the logo, optically centered, lightly letter-spaced sans-serif."),
        ("Safe zone", "Keep the full lockup inside the middle 60% of the frame (720 x 378 px centered) so "
                      "it survives 1:1, 4:5, and 16:9 crops."),
        ("Center clearance", "Compose the photo so the middle third is calm — no faces, no text, no busy "
                             "detail behind the lockup."),
        ("Contrast", "Dark background → white/knockout logo + white URL. Light background → full-color logo "
                     "+ near-black URL. If the center is bright or busy, add a soft dark radial scrim or a "
                     "rounded plate at ~35% opacity behind the lockup."),
        ("Never", "No headline, sticker, badge, or watermark may overlap the logo. No second logo. No "
                  "corner-placed duplicate URL."),
        ("File naming", "Keep the existing base name and append -v2 (e.g. 25-ninoy-aquino-day-weekend-lipa-"
                        "featured-v2.jpg). Upload as a new media item; do not overwrite the old file until "
                        "the post is re-pointed."),
        ("Alt text", "Unchanged from the current spec — the alt text describes the scene, not the logo. Do "
                     "not add \"HavenInLipa logo\" to alt text."),
    ]
    r = 4
    for label, val in rows:
        ws.cell(row=r, column=1, value=label).font = Font(name="Calibri", size=11, bold=True, color=FOREST)
        ws.cell(row=r, column=1).alignment = Alignment(vertical="top", wrap_text=True)
        ws.cell(row=r, column=2, value=val).font = Font(name="Calibri", size=11)
        ws.cell(row=r, column=2).alignment = Alignment(vertical="top", wrap_text=True)
        ws.row_dimensions[r].height = 32 if len(val) < 110 else 46
        r += 1

    r += 1
    ws.cell(row=r, column=1, value="Paste-ready instruction block").font = Font(
        name="Calibri", size=12, bold=True, color=CORAL
    )
    r += 1
    ws.cell(row=r, column=1, value=BRAND_OVERLAY.strip())
    ws.cell(row=r, column=1).font = Font(name="Calibri", size=10)
    ws.cell(row=r, column=1).alignment = Alignment(wrap_text=True, vertical="top")
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
    ws.row_dimensions[r].height = 190

    r += 2
    ws.cell(row=r, column=1, value="Production note").font = Font(
        name="Calibri", size=12, bold=True, color=CORAL
    )
    r += 1
    ws.cell(
        row=r,
        column=1,
        value=(
            "Image generators do not reproduce a real logo accurately — they approximate it, and an "
            "approximated logo is worse than none. Recommended workflow: (1) give ChatGPT the "
            "\"What to Shoot or Source\" cell as written — the brand-lockup paragraph makes it compose a "
            "clean, uncluttered center; (2) drop the generated 1200 x 630 background into a Canva template "
            "that already holds the real HavenInLipa logo + URL centered; (3) export. That way the center "
            "clearance and the actual mark both come out right. If you do let ChatGPT render the lockup "
            "directly, check every output — wrong letterforms in the wordmark are the usual failure."
        ),
    )
    ws.cell(row=r, column=1).font = Font(name="Calibri", size=10, italic=True)
    ws.cell(row=r, column=1).alignment = Alignment(wrap_text=True, vertical="top")
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
    ws.row_dimensions[r].height = 110


def build_readme(wb):
    ws = wb.create_sheet("How to Use")
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 118

    lines = [
        ("HavenInLipa — Featured Image Inventory (Articles 1–29)", "title"),
        ("", ""),
        ("What this is", "h"),
        ("One row per article featured image, consolidated from the article files and blogger guides. "
         "Column H is the paste-ready ChatGPT prompt: the original art direction plus the brand-lockup "
         "instruction that puts the HavenInLipa logo and URL in the middle of the frame.", "p"),
        ("", ""),
        ("Workflow per image", "h"),
        ("1. Copy column H (What to Shoot or Source) for the article you're working on.", "p"),
        ("2. Paste into ChatGPT, generate at 1200 x 630.", "p"),
        ("3. Composite the real logo + URL in Canva if the generated lockup isn't exact "
         "(see the Brand Lockup Spec tab).", "p"),
        ("4. Save as the column E file name (…-featured-v2.jpg).", "p"),
        ("5. Upload to WordPress, set as Featured Image, paste column G as the alt text — "
         "alt text does not change.", "p"),
        ("6. Mark column L as Done.", "p"),
        ("", ""),
        ("Two rows need a decision", "h"),
        ("Articles 1 and 2 had no featured-image spec anywhere on file — Article 1 is the homepage "
         "rewrite (not a blog post) and Article 2's spec predates the blogger-guide format. The art "
         "direction in those two rows is proposed, flagged coral in the Spec Status column. Review "
         "before generating. Article 1 in particular is the site-wide social share card, so it deserves "
         "the strongest single property photo you have.", "p"),
        ("", ""),
        ("Alt text stays as-is", "h"),
        ("The alt text describes the scene for screen readers and for image search. Adding \"HavenInLipa "
         "logo\" to it would dilute the keyword and help no one — leave it exactly as recorded.", "p"),
        ("", ""),
        ("In-body images are not in scope", "h"),
        ("Articles 3–29 also carry 5–8 in-body images each (roughly 180 total). Those are not in this "
         "workbook and should NOT get the centered logo — the lockup is for social share cards only. "
         "Their specs stay in the source article files listed in column K.", "p"),
    ]

    r = 1
    for text, kind in lines:
        c = ws.cell(row=r, column=1, value=text)
        if kind == "title":
            c.font = Font(name="Calibri", size=16, bold=True, color=FOREST)
            ws.row_dimensions[r].height = 26
        elif kind == "h":
            c.font = Font(name="Calibri", size=12, bold=True, color=CORAL)
            ws.row_dimensions[r].height = 20
        else:
            c.font = Font(name="Calibri", size=11)
            ws.row_dimensions[r].height = 15 if len(text) < 100 else 15 * (len(text) // 100 + 1)
        c.alignment = Alignment(wrap_text=True, vertical="top")
        r += 1


def main():
    wb = Workbook()
    build_inventory(wb)
    build_brand_sheet(wb)
    build_readme(wb)
    wb.save(OUT)
    print(f"Wrote {OUT}  ({len(ROWS)} articles)")


if __name__ == "__main__":
    main()
