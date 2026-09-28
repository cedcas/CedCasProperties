#!/usr/bin/env python3
"""
August 16, 2026 FULL SEO AUDIT & STRATEGY REPORT DOCX for HavenInLipa.com
Prepared by: NetCoreSolutions
Baseline chain: Apr 7 -> Apr 15 -> May 8 -> May 31 -> Jun 18 -> Jul 4 -> Aug 5 -> Aug 16, 2026

Scope: FULL Audit & Strategy Run (folder 081526). Phases 1->2->3, both approval
gates passed 2026-08-16. Competitor pass INCLUDED (baseline chain ~90 days).
Baselined on 081426/GSC_3Month_Performance_Analysis.md - figures not re-derived.

Clones styling/helpers from generate_haveninlipa_audit_report_aug05.py.
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
ACCENT_RED = RGBColor(0xC0, 0x39, 0x2B)

BASE_DIR = "/Volumes/Files and Cloud/Dropbox/VSCode (non-Git)/seo"
LOGO_PATH = os.path.join(BASE_DIR, "Brand Assets", "NCS Logo.png")
OUT_DIR = os.path.join(BASE_DIR, "content for HavenInLipa")
OUT_SUFFIXED = os.path.join(OUT_DIR, "HavenInLipa_Full_SEO_Strategy_Report_Aug16.docx")
OUT_LATEST = os.path.join(OUT_DIR, "HavenInLipa_Full_SEO_Strategy_Report.docx")
OUT_RUN = os.path.join(OUT_DIR, "081526", "HavenInLipa_Full_SEO_Strategy_Report_Aug16.docx")
BACKUP_LATEST = os.path.join(OUT_DIR, "HavenInLipa_Full_SEO_Strategy_Report.pre-aug16.backup.docx")


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
    doc.add_paragraph()
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
    r = t.add_run("FULL SEO AUDIT & STRATEGY REPORT"); r.bold = True; r.font.size = Pt(26)
    r.font.name = "Calibri"; r.font.color.rgb = DARK_TEXT
    st = doc.add_paragraph(); st.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = st.add_run("Building the High-Intent Layer - From Traffic to Bookings")
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
        ("Date: August 16, 2026", False, 11, DARK_TEXT),
        ("Baseline Chain: Apr 7 -> Apr 15 -> May 8 -> May 31 -> Jun 18 -> Jul 4 -> Aug 5 -> Aug 16, 2026", True, 9, MED_GRAY),
        ("Scope: Full Audit & Strategy Run (folder 081526). Phases 1-3, both approval gates passed.", True, 9, MED_GRAY),
        ("Competitor pass INCLUDED. Performance baseline: GSC May-Jul 2026 (run 081426).", True, 9, MED_GRAY),
    ]:
        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(txt); r.italic = it; r.font.size = Pt(sz)
        r.font.color.rgb = col; r.font.name = "Calibri"
    doc.add_page_break()

    # ---------------- EXECUTIVE SUMMARY ----------------
    heading(doc, "Executive Summary", 1, CORAL)
    body(doc, "The content engine works. Until this run, the strategy behind it did not convert.", bold=True)
    body(doc, "Over May-July 2026 impressions grew 18.9x and clicks 22.3x while bookings stayed flat at "
              "roughly two per month. This audit establishes the structural reason, and the answer is not "
              "the buried-CTA problem diagnosed in July.", size=10.5)

    heading(doc, "The structural finding", 2, FOREST_GREEN)
    body(doc, "The main site is 10 URLs. It has a content engine of 23 blog articles and a booking engine "
              "of 5 listings - and almost nothing in between. There is no page that captures \"I want to "
              "stay in Lipa\" and routes it to the right home. Every lodging visitor is funnelled through a "
              "homepage doing six jobs at once.", size=10.5)
    body(doc, "That is the mechanical cause of the number that matters: clicks reaching the booking domain "
              "fell from 75% to 15% to 1.9% of all traffic, and the property pages took ONE click in July.",
         bold=True, color=ACCENT_RED, size=10.5)

    heading(doc, "Two corrections to the strategic picture", 2, FOREST_GREEN)
    bullet(doc, "On discovery queries HavenInLipa competes with local operators and wins. On LODGING "
                "queries it does not compete with them at all - positions 1-8 for 'staycation lipa' are "
                "Airbnb, Booking.com, TripAdvisor and Expedia, listing 70+ Lipa properties. This is why "
                "every lodging query sits at position 9-27 with zero clicks. It is a domain-authority "
                "wall, not a page-quality problem.",
           "The lodging competitor set was misidentified. ", ACCENT_ORANGE)
    bullet(doc, "The August 14 analysis flagged weddings as the strongest net-new case. The SERP is owned "
                "by dedicated venues and by JET Hotel, which markets five named function rooms. "
                "HavenInLipa is not a venue and would deserve to lose that term. But every one of those "
                "weddings needs something none of those competitors sell: somewhere for the party to "
                "sleep. That is a house for 11-15 people near the venue - the flagship inventory, and "
                "currently the worst-performing listing.",
           "Weddings needed re-aiming. ", ACCENT_ORANGE)

    heading(doc, "What this run delivers", 2, FOREST_GREEN)
    body(doc, "Three new money pages and one optimization - and deliberately zero new blog articles, "
              "because 18 pages already sit in \"Crawled - currently not indexed\" and July ran indexed +6 "
              "against not-indexed +15. Adding discovery content while Google refuses a third of the "
              "output makes the ratio worse.", size=10.5)
    table(doc,
          ["Build", "Deliverable", "Why"],
          [["B1", "/staycation", "The market's actual word. All demand at positions 9-20"],
           ["B2", "/properties", "Fixes a live 404; gives lodging intent somewhere to land"],
           ["B3", "/weddings-accommodation", "Unserved commercial demand; new cluster C7"],
           ["B4", "Article #1 refresh", "Biggest entry page, stuck at position 14.84 for its own head term"]],
          widths=[0.7, 2.3, 4.0])
    doc.add_page_break()

    # ---------------- SECTION 1 ----------------
    heading(doc, "Section 1 - Website Audit", 1, CORAL)
    heading(doc, "Structure", 2, FOREST_GREEN)
    body(doc, "The entire commercial surface, verified by crawl on 2026-08-16:", size=10.5)
    table(doc, ["Type", "Count", "URLs"],
          [["Money pages", "5", "the property pages"],
           ["Supporting", "3", "/ , /about, /faq"],
           ["Legal", "2", "/privacy, /terms"],
           ["Blog", "23", "separate WordPress, own Yoast sitemap"]],
          widths=[1.6, 0.9, 4.5])

    heading(doc, "Pages that should exist and return 404", 2, FOREST_GREEN)
    table(doc, ["URL", "Status", "Consequence"],
          [["/properties", "404", "No inventory index. /properties/ 308s here - a path that looks real and isn't"],
           ["/contact", "404", "Only /#contact exists"],
           ["/staycation", "404", "The market's actual search word"],
           ["/weddings, /events", "404", "Unserved commercial demand"]],
          widths=[1.5, 0.8, 4.7])
    body(doc, "/properties and /contact were linked from the five biggest blog evergreens until 2026-08-16. "
              "Those links are now repointed to homepage anchors, but the URLs remain dead for everything "
              "outside our control - external links, the Google Business Profile, old social posts, and LLM "
              "citations. The WordPress Redirection plugin cannot help: it never sees requests to "
              "haveninlipa.com.", size=10)

    heading(doc, "The About page under-sells the business by 60%", 2, FOREST_GREEN)
    body(doc, "/about is indexed, in the sitemap, and its body copy reads \"Our two properties\" - listing "
              "only the Spacious 2BR and Cozy 1BR. The three Mickey in Lipa houses, live since June 18, "
              "appear nowhere in the page's content; they are present only in the site-wide navigation. "
              "This is the page carrying Person schema for Melody and doing the trust work for direct "
              "booking, and it omits the sleeps-15 flagship - the single product the weddings and "
              "big-group opportunities depend on.", size=10.5)

    heading(doc, "What is genuinely healthy", 2, FOREST_GREEN)
    bullet(doc, "LocalBusiness site-wide, FAQPage on /faq, Person + Place on /about, VacationRental + "
                "FAQPage on every property page. aggregateRating now live on all five (32/21/47/23/46).",
           "Structured data - clean and complete. ", ACCENT_GREEN)
    bullet(doc, "/admin and /api now disallowed as prefixes, not just with trailing slashes.",
           "robots.txt fixed. ", ACCENT_GREEN)
    bullet(doc, "98 mobile / 100 desktop, 100 SEO, 100 accessibility (lab data).",
           "Performance - PSI ", ACCENT_GREEN)
    bullet(doc, "the structural fix for hardcoded prices across 23 articles, and the Stay Match prerequisite.",
           "/api/properties.json is live - ", ACCENT_GREEN)
    bullet(doc, "0 dead links, 0 stale rates, 0 old-slug links, 0 UTM-tagged internal links, 151 correct "
                "property links restored.", "Blog remediation closed - ", ACCENT_GREEN)
    doc.add_page_break()

    # ---------------- SECTION 2 ----------------
    heading(doc, "Section 2 - Competitor Analysis", 1, CORAL)
    heading(doc, "The content moat holds - re-verified 2026-08-16", 2, FOREST_GREEN)
    table(doc, ["Competitor", "Product", "Content engine"],
          [["JET Hotel", "52 rooms, 3-star, 5 named function rooms, 2 restaurants",
            "NONE. No blog, guides or articles"],
           ["Lakeview Resort", "10 villas, groups to 33, infinity pool, Taal + Maculot views",
            "NONE. No blog"]],
          widths=[1.3, 3.0, 2.7])
    body(doc, "Neither runs any editorial content. HavenInLipa remains the only accommodation operator in "
              "Lipa publishing consistently - 23 articles, weekly cadence, 41 indexed pages. That moat is "
              "real and it is why the discovery engine works at all.", bold=True, size=10.5)

    heading(doc, "But the competitor set for lodging demand was misidentified", 2, FOREST_GREEN)
    body(doc, "On lodging queries the competition is not local. It is platforms:", size=10.5)
    bullet(doc, "'staycation lipa', 'airbnb lipa' and 'vacation rentals lipa' return Airbnb, Booking.com, "
                "Vrbo, TripAdvisor, Agoda and cozycozy - not one independent operator site appears.")
    bullet(doc, "Those platforms list 70+ Lipa properties between them.")
    bullet(doc, "Named local rivals - Casa Rosa Farm Stay, Casa Cecilia, Casa Veritas, Gillera Staycation "
                "- reach the market THROUGH those platforms, not through their own sites.")
    body(doc, "Recommendation: stop treating 'rank for staycation lipa' as the objective. The winnable "
              "play is the long tail the OTAs cannot template - specific occasion, specific group, "
              "specific need. An OTA has no page for 'where the entourage stays for a Lipa wedding'.",
         bold=True, color=FOREST_GREEN, size=10.5)

    heading(doc, "Weddings - the strongest lead, re-aimed", 2, FOREST_GREEN)
    body(doc, "Four result types compete for the wedding terms, and none answers the accommodation "
              "question: dedicated venues (Villa Marasigan, M Farm, Casa Marikit, Palazzo Antonio); hotels "
              "with function rooms (JET Hotel); directories (Yelp, Brideworthy, Hitchbird); and caterer "
              "content marketing (Juan Carlo, Town's Delight).", size=10.5)
    body(doc, "The decisive finding: the page ranking for 'wedding venue in lipa' - roughly 1,100 words - "
              "handles accommodation in a single sentence, \"Lipa's proximity to a variety of hotels and "
              "event spaces ensures ample accommodation options\", and names not one establishment. The "
              "top-ranking content concedes the question and moves on.",
         bold=True, color=ACCENT_ORANGE, size=10.5)
    body(doc, "Everything ranking sells rooms or space. Nobody sells a whole house near the venue. Venues "
              "will not write it, directories have no inventory, OTAs lack the local knowledge of what is "
              "ten minutes from which venue, and caterers demonstrably do not. Meanwhile a wedding booking "
              "is multi-night, full-house, booked months ahead and frequently repeated across a family - "
              "the opposite of a one-night couple's stay, against the listing that currently performs worst.",
         size=10.5)

    heading(doc, "Group accommodation - a real product rival with no visibility", 2, FOREST_GREEN)
    body(doc, "Lakeview Resort hosts groups up to 33 with an infinity pool and Taal views. For the barkada "
              "and big-family segment they are a stronger product than the sleeps-15 house. But they "
              "publish nothing, so they are invisible on every discovery query that leads to a group "
              "booking. Compete on findability and cost-per-head math, not on amenities.", size=10.5)
    doc.add_page_break()

    # ---------------- SECTION 3 ----------------
    heading(doc, "Section 3 - Content Strategy", 1, CORAL)
    heading(doc, "Cluster verdicts", 2, FOREST_GREEN)
    table(doc, ["Cluster", "Jul clicks", "Verdict", "Action"],
          [["C1 Short-Term Rentals", "0", "The revenue cluster, at zero", "REBUILD - gets B1 + B2"],
           ["C2 Things to Do", "237 (88.8%)", "Carries the site; the moat", "FREEZE and optimize (B4)"],
           ["C3 Weekend Getaway", "10 (3.7%)", "Best CTR of any cluster", "Extend selectively"],
           ["C4 Travel Planning", "12 (4.5%)", "Big reach, 0.64% CTR", "Convert, don't grow"],
           ["C5 Direct Booking", "3 (1.1%)", "Built on absent demand", "RETIRE - #6 into B1"],
           ["C6 Branded", "1 (0.4%)", "Branded demand near nil", "Leave"],
           ["C7 Occasions & Groups", "-", "NEW", "CREATE - B3 + article #27"]],
          widths=[1.5, 0.9, 2.1, 2.5])
    body(doc, "One new cluster. Every existing cluster is organised around PLACE - what to do in Lipa. C7 "
              "is organised around OCCASION - why you need a whole house. That is the axis where "
              "HavenInLipa has product no competitor and no OTA can template, and where a booking is "
              "multi-night and full-house.", bold=True, size=10.5)

    heading(doc, "Priority roadmap", 2, FOREST_GREEN)
    table(doc, ["#", "Action", "Owner", "Blocked on"],
          [["1", "Ship B4 - article #1 refresh", "Cedric / blogger", "Nothing. Highest ROI, zero risk"],
           ["2", "Build /properties", "Developer", "Nothing - feed is live"],
           ["3", "Build /staycation + #6 301", "Developer", "B2"],
           ["4", "Ship Stay Match engine", "Developer", "Nothing - cleared 8/16"],
           ["5", "Build /weddings-accommodation", "Developer", "Drive times + hotel rate"],
           ["6", "Rewrite /about for all 5 homes", "Developer", "Nothing"]],
          widths=[0.4, 2.6, 1.5, 2.5])

    heading(doc, "Keyword strategy - approved set", 2, FOREST_GREEN)
    body(doc, "Every keyword is drawn from observed GSC demand in the May-July window, not from a volume "
              "tool. Positions are July averages.", size=10)
    table(doc, ["Topic", "Lead keyword", "Position", "Intent", "Priority"],
          [["T1 Staycation", "staycation in lipa", "9.5", "Commercial", "HIGH"],
           ["T2 Property index", "vacation home rental agency", "2.0", "Transactional", "HIGH"],
           ["T3 Wedding accommodation", "wedding destination in lipa", "22.12", "Commercial", "HIGH"],
           ["T4 Things to do", "things to do in lipa city", "14.84", "Informational", "MEDIUM"],
           ["T5 Family & kids", "where to go in lipa with kids", "10.78", "Informational", "MEDIUM"],
           ["T6 Groups & barkada", "house rental", "7.0", "Transactional", "MEDIUM"],
           ["T7 Comparison & seasonal", "lipa vs tagaytay", "4.05% CTR", "Commercial", "ONGOING"]],
          widths=[1.7, 2.2, 0.9, 1.3, 0.9])

    body(doc, "Deliberately excluded:", bold=True, color=ACCENT_RED)
    bullet(doc, "'why book direct vs airbnb' - 1 impression in three months. No demand in this market.")
    bullet(doc, "Generic food terms - 5,924 impressions at roughly 0% CTR, in map-pack SERPs we cannot win.")
    bullet(doc, "'wedding venue lipa' head term - HavenInLipa is not a venue.")
    bullet(doc, "Branded 'haven' terms - 55 impressions, 0 clicks, and most of it is not us.")
    doc.add_page_break()

    # ---------------- SECTION 4 ----------------
    heading(doc, "Section 4 - SERP & Outline Strategy", 1, CORAL)
    heading(doc, "SERP patterns observed", 2, FOREST_GREEN)
    table(doc, ["Target", "SERP composition", "The gap we exploit"],
          [["staycation lipa", "100% platform - TripAdvisor x2, Airbnb, Booking x2, Expedia",
            "Templated grids with zero editorial judgement. Nothing says which home suits which trip"],
           ["property index terms", "Same wall, plus long-term-lease portals on 'apartment for rent'",
            "Different intent (12-month leases) - not chased"],
           ["wedding accommodation", "Venues, hotels, directories, caterer listicles",
            "All sell rooms or space. Nobody sells a whole house near the venue"],
           ["things to do in lipa", "TripAdvisor, Traveloka, Yelp, Grab, Expedia, Guide to the Philippines",
            "None of their writers has been there. No drive times, no best-time-to-go"]],
          widths=[1.4, 2.6, 3.0])

    heading(doc, "Structural patterns in ranking content", 2, FOREST_GREEN)
    bullet(doc, "roughly 1,100 words ranks for the wedding terms. HavenInLipa's articles routinely run "
                "2,000-3,000.", "Depth bar is low - ")
    bullet(doc, "no FAQ blocks, no pricing tables, no capacity comparisons anywhere in the wedding SERP.",
           "Missing everywhere - ")
    bullet(doc, "listicle plus a 'factors to consider' block plus a heavy CTA to the publisher's own service.",
           "Overused - ")
    bullet(doc, "local proof. Drive times, current fees, and honest best-time-to-go advice are what an "
                "aggregator cannot fake.", "Nobody provides - ")

    heading(doc, "Outline summaries", 2, FOREST_GREEN)
    body(doc, "B1 - /staycation: \"Staycation in Lipa City: 5 Private Homes, Booked Direct\". Costs first "
              "(the thing OTAs hide), then editorial matching by traveller type, then the honest Lipa vs "
              "Tagaytay trade, then a weekend itinerary that links back into the discovery articles. "
              "Absorbs article #6.", size=10)
    body(doc, "B2 - /properties: \"Our Homes in Lipa City, Batangas\". All five rendered from the live "
              "feed, then routing by group size and by occasion, then the shared trust layer. Fixes the "
              "404 and becomes the Stay Match fallback surface.", size=10)
    body(doc, "B3 - /weddings-accommodation: \"Where Your Wedding Party Stays in Lipa\". Opens on the "
              "problem nobody solves - your venue seats eighty and sleeps nobody - then what a whole house "
              "changes, then the per-head cost math no competitor publishes, then drive times to the "
              "actual venues.", size=10)
    body(doc, "B4 - Article #1 refresh: sharpen the head term into H1 and title, add a 'with kids' H2 to "
              "claim position 10.78, add a one-day H2, and add drive times and fees per entry. In-place "
              "edit; the slug does not change.", size=10)
    doc.add_page_break()

    # ---------------- SECTION 5 ----------------
    heading(doc, "Section 5 - Content Production", 1, CORAL)
    body(doc, "Four builds delivered, each with title tag, meta description, slug, full H1-H3 copy, FAQ "
              "block, schema instruction, internal-link map and developer notes.", size=10.5)
    table(doc, ["Build", "Deliverable", "Type", "Cluster"],
          [["B1", "/staycation", "New money page", "C1"],
           ["B2", "/properties", "New money page - fixes a live 404", "C1"],
           ["B3", "/weddings-accommodation", "New money page", "C7 (new)"],
           ["B4", "Article #1 refresh", "In-place optimization", "C2"]],
          widths=[0.7, 2.4, 2.6, 1.3])

    heading(doc, "Approach and differentiation", 2, FOREST_GREEN)
    bullet(doc, "every price, guest count and 'From' prefix renders from /api/properties.json. Three rates "
                "changed silently in six weeks; no page in this plan carries a hardcoded number.",
           "Live data, never hardcoded - ", ACCENT_GREEN)
    bullet(doc, "the pages state what a competitor will not - what an extra guest costs, what the platform "
                "fee actually is, and that Tagaytay has the better view.",
           "Honest by default - ", ACCENT_GREEN)
    bullet(doc, "the wedding page says plainly that it is not a venue and cannot host a reception. "
                "Overclaiming would lose the trust the brand runs on.",
           "Positioned truthfully - ", ACCENT_GREEN)
    bullet(doc, "blog -> money page -> listing replaces blog -> homepage -> listing. /properties becomes "
                "the hub.", "New internal architecture - ", ACCENT_GREEN)

    heading(doc, "Outstanding fact-checks before publication", 2, FOREST_GREEN)
    table(doc, ["Item", "Owner", "Blocks"],
          [["Drive times to named venues and landmarks", "Melody / Wilma", "B3 and B2's location section"],
           ["A checkable Lipa mid-range hotel rate", "Cedric", "B3's cost comparison"],
           ["Solar backup - what it powers, for how long", "Melody", "B1 and article #29"],
           ["Gatherings on-site", "ANSWERED 8/16", "Permitted with host informed, per house rules"]],
          widths=[3.0, 1.6, 2.4])
    doc.add_page_break()

    # ---------------- SECTION 6 ----------------
    heading(doc, "Section 6 - Recommendations & Next Steps", 1, CORAL)
    heading(doc, "Immediate", 2, FOREST_GREEN)
    bullet(doc, "Highest ROI in the run: no new URL, no indexing risk, and it moves the site's largest "
                "traffic source off page 2 for its own head term.", "Ship B4 (article #1 refresh). ", ACCENT_RED)
    bullet(doc, "It fixes a live 404 that external sites, the GBP profile and LLM citations still point at.",
           "Build /properties. ", ACCENT_RED)
    bullet(doc, "Its last prerequisite cleared on 8/16. It is the systemic fix - every article introduces "
                "the right property instead of dead-ending.", "Ship Stay Match. ", ACCENT_RED)
    bullet(doc, "An indexed page telling readers and Google the business has two homes when it has five.",
           "Rewrite /about. ", ACCENT_ORANGE)

    heading(doc, "Mid-term", 2, FOREST_GREEN)
    bullet(doc, "Build /staycation, retire article #6 into it with a 301, and repoint in-body links first.")
    bullet(doc, "Build /weddings-accommodation once the drive times are confirmed.")
    bullet(doc, "Log every enquiry that mentions a wedding, manually. One such booking is worth more than "
                "a month of food-guide traffic, and nothing currently tracks it.")
    bullet(doc, "Address the 18 'Crawled - currently not indexed' pages before adding discovery content.")

    heading(doc, "Long-term", 2, FOREST_GREEN)
    bullet(doc, "Extend cluster C7 by occasion - reunions and milestone birthdays first, then corporate "
                "offsites for weekday occupancy.")
    bullet(doc, "Use comparison and seasonal formats for all new C3 work. They earn clicks at roughly "
                "twice the rate of mega-guides.")
    bullet(doc, "Resume the weekly discovery cadence ONLY once the not-indexed count is flat or falling.")

    heading(doc, "How this run should be judged", 2, FOREST_GREEN)
    table(doc, ["Metric", "Now", "Target"],
          [["Main-domain click share", "1.9%", "10%+"],
           ["Property-page clicks per month", "1", "20+"],
           ["'things to do in lipa city' position", "14.84", "under 10"],
           ["Crawled - not indexed", "18", "flat or falling"],
           ["Enquiries mentioning a wedding", "0 tracked", "log manually from launch"],
           ["Total impressions", "17,218", "EXPLICITLY NOT A TARGET"]],
          widths=[3.2, 1.6, 2.2])
    body(doc, "Total impressions is excluded on purpose. July burned 5,924 impressions on 'near me' food "
              "queries at roughly 0% CTR. Reporting that number as progress is what allowed a 22x traffic "
              "increase to coexist with flat bookings for three months.",
         bold=True, color=ACCENT_RED, size=10.5)

    doc.add_page_break()

    # ---------------- SECTION 7 ----------------
    heading(doc, "Section 7 - Implementation Timeline", 1, CORAL)
    body(doc, "Dates for the client-side work are firm. Developer dates are proposals pending "
              "availability. Prepared Sunday, August 16, 2026.", italic=True, size=10)

    body(doc, "REVISED 2026-08-17. Ownership is explicit on every line - see the key below. Anything "
              "marked SEO Analyst is done directly in WordPress via the REST API under the editing "
              "rules agreed 2026-08-17.", bold=True, color=ACCENT_GREEN, size=10)

    heading(doc, "Ownership key", 2, FOREST_GREEN)
    table(doc, ["Owner", "Scope"],
          [["SEO Analyst", "NetCoreSolutions. MODIFIES published blog articles directly (kept "
            "published). CREATES new articles as DRAFTS only. Owns reports, the SEO Tracker, "
            "PROJECT_STATUS and all briefs. Touches neither codebase."],
           ["Cedric", "Adds featured images. Publishes or schedules drafts. WP Admin settings, menus, "
            "plugins and users. GSC and GA4 console work. Owner fact-checks. Decides the queue."],
           ["HIL Developer", "Both codebases - the Next.js app at haveninlipa.com and the WordPress "
            "theme/plugins. Routes, schema, sitemap, seeds, deploys."],
           ["Automatic", "WordPress scheduled publishing, once Cedric has set the date."]],
          widths=[1.3, 5.7])

    heading(doc, "Completed - August 16 to 17", 2, FOREST_GREEN)
    table(doc, ["Done", "Action", "Owner"],
          [["Aug 16", "/properties built (fixed a hard 404), /contact redirect, /about all five homes",
            "HIL Developer"],
           ["Aug 16", "Public property feed, robots prefix fix, derived review aggregates (PR #9)",
            "HIL Developer"],
           ["Aug 16", "Blog remediation - dead links, stale rates, old slugs, UTM params all cleared",
            "Cedric + SEO Analyst"],
           ["Aug 16", "Every outstanding owner fact-check answered", "Cedric / Melody"],
           ["Aug 17", "Article #25 (Ninoy Aquino Day) published", "Automatic"],
           ["Aug 17", "Mt. Maculot closure - #4 repurposed + notices on #3/#8/#11/#14/#15",
            "SEO Analyst"],
           ["Aug 17", "ARTICLE #1 REFRESH - head term into H1/title, 'with kids' and 'one day' "
            "sections added, in-body blog links 2 -> 14, Manila drive time corrected",
            "SEO Analyst"],
           ["Aug 17", "5 evergreens repointed from /#properties to the live /properties",
            "SEO Analyst"],
           ["Aug 17", "/weddings-accommodation BUILT AND LIVE - ahead of the Aug 22 target",
            "HIL Developer"],
           ["Aug 17", "Theme nav/footer 'Properties' link repointed to /properties", "Cedric"]],
          widths=[0.9, 4.6, 1.5])
    body(doc, "Article #1 was brought forward from Aug 18 and shipped early: it had no dependencies "
              "and the highest return in the run, since the biggest entry page on the site was sitting "
              "at position 14.84 for its own head term.", size=10)

    heading(doc, "Still open - week of August 17", 2, FOREST_GREEN)
    body(doc, "Verified against production 2026-08-17. Three items remain; everything else on this "
              "week's list is done.", size=10)
    table(doc, ["Status", "Action", "Owner"],
          [["OPEN", "3 property pages still link the Mt. Maculot guide from bestForSegments - "
            "confirmed live in /api/properties.json on sleeps-15, sleeps-11 and spacious-2-bedroom. "
            "Edit the SEED FILES too or applySeo() reverts it", "HIL Developer"],
           ["UNKNOWN", "Request indexing for article #1 in GSC - cannot be verified from outside the "
            "console", "Cedric"]],
          widths=[1.0, 4.5, 1.5])

    heading(doc, "Wedding page - post-launch review, 2026-08-17", 2, FOREST_GREEN)
    body(doc, "Built early and it passes every check in the brief:", size=10)
    table(doc, ["Check", "Result"],
          [["All five verified drive times present",
            "PASS - Mary Mediatrix, Mount Carmel, Saint Sebastian, Palazzo Antonio, SM Lipa"],
           ["Six dropped venues absent",
            "PASS - no Casa Marikit, Villa Marasigan, Cintai, Villa Natura, M Farm / San Benito"],
           ["Capacity wording", "PASS - reads 'up to 24 people'; the phrase '24 beds' appears nowhere"],
           ["Positioning", "PASS - states plainly that it is accommodation and not a venue"],
           ["Schema", "PASS - FAQPage only. No EventVenue or Event"],
           ["Two-house framing", "PASS - 'five doors apart', with all four guest counts rendered"],
           ["Outbound blog links", "PASS - all five resolve 200"],
           ["Sitemap + canonical", "PASS - present in sitemap.xml, self-canonical"]],
          widths=[2.3, 4.7])
    body(doc, "The wedding page was moved up because wedding bookings are made months ahead and peak "
              "season is December to February. Shipping in August rather than October buys it two "
              "extra months to earn its ranking before the booking window opens.", size=10)

    heading(doc, "Week 2 - August 24 to 30", 2, FOREST_GREEN)
    table(doc, ["Date", "Action", "Owner"],
          [["Mon Aug 24", "Article #26 (Heroes Day) publishes - once Cedric sets the date", "Automatic"],
           ["By Fri Aug 28", "SHIP STAY MATCH - hard deadline, see below", "HIL Developer"],
           ["Aug 24-28", "Clear the two small spec follow-ups from the 8/16 code review",
            "HIL Developer"]],
          widths=[1.2, 4.3, 1.5])
    body(doc, "Stay Match has a real deadline that is easy to miss. Its pilot articles are #27 (Aug 31), "
              "#28 (Sep 7) and #29 (Sep 14). If it is not live before August 31, article #27 publishes "
              "without it and the pilot either loses an article or needs retrofitting. If the wedding "
              "page overruns into this week, STAY MATCH WINS - its deadline is externally fixed and "
              "the wedding page's is not.", bold=True, color=ACCENT_RED, size=10)

    heading(doc, "Week 3 - August 31 to September 6", 2, FOREST_GREEN)
    table(doc, ["Date", "Action", "Owner"],
          [["Mon Aug 31", "Article #27 (Barkada) publishes - FIRST STAY MATCH PILOT", "Automatic"],
           ["Sep 1-5", "Repoint in-body links to article #6 across the blog, before the 301 goes in",
            "SEO Analyst"],
           ["Sep 1-5", "Build /staycation, then add the #6 -> /staycation 301 in Redirection",
            "HIL Developer"],
           ["Sep 1-5", "Add the /staycation link to the wedding page once it exists", "HIL Developer"],
           ["Sep 1-5", "Rewrite /about's five-homes section if the earlier pass missed anything",
            "HIL Developer"]],
          widths=[1.2, 4.3, 1.5])
    body(doc, "Order matters on the /staycation work: the in-body links to article #6 must be repointed "
              "BEFORE the 301 is added, or every one of them becomes an extra hop.", size=10)

    heading(doc, "September - measurement window", 2, FOREST_GREEN)
    table(doc, ["Date", "Action", "Owner"],
          [["Mon Sep 7", "Article #28 (Road Trip) publishes - Stay Match pilot 2", "Automatic"],
           ["Mon Sep 14", "Article #29 (Summer) publishes - Stay Match pilot 3", "Automatic"],
           ["Sep 15 onward", "CONTENT FREEZE. No article #30. Measure instead", "-"],
           ["approx Sep 21", "First read on the article #1 refresh - 30 days of GSC", "SEO Analyst"],
           ["Sep, ongoing", "Correct 'an hour from Manila' as each article is next touched - it is an "
            "hour from ALABANG. Deliberately not a bulk replace", "SEO Analyst"],
           ["Sep, ongoing", "Log every enquiry that mentions a wedding - nothing tracks this yet",
            "Cedric"],
           ["Early Oct", "Maintenance (Delta) run - did the numbers move?", "SEO Analyst"]],
          widths=[1.2, 4.3, 1.5])

    heading(doc, "Standing rules for blog edits, agreed 2026-08-17", 2, FOREST_GREEN)
    table(doc, ["Scenario", "Who does what"],
          [["MODIFY an existing article",
            "SEO Analyst edits it directly via the WordPress REST API and it stays published. "
            "Revisions are created automatically, so any change is reversible."],
           ["CREATE a new article",
            "SEO Analyst creates it as a DRAFT. Cedric adds the featured image and then publishes or "
            "schedules it. Publishing is blocked in config (WP_ALLOW_PUBLISH is false), not left to "
            "judgement."],
           ["Anything in Draft", "Cedric's. The SEO Analyst does not schedule or publish."],
           ["Timeline tracking",
            "Cedric checks this section and asks for a modification or a new article when it is due."]],
          widths=[1.8, 5.2])
    body(doc, "The October checkpoint answers the only question that matters: did main-domain click "
              "share move off 1.9%, and did property-page clicks move off 1? It is also when Stay "
              "Match's click-through-by-confidence-band data becomes readable, which is what retunes "
              "the intent map.", size=10)

    heading(doc, "Publishing schedule - the drafted queue continues", 2, FOREST_GREEN)
    body(doc, "The content freeze applies to NEW articles (#30 onward), not to the queue that is "
              "already drafted and scheduled. These pieces also happen to fit the strategy: they are "
              "seasonal and occasion formats, not mega-guides, and those earn roughly twice the "
              "click-through rate. Article #27 is the first piece in the new C7 cluster.", size=10)
    table(doc, ["Monday", "Article", "Status"],
          [["Aug 17", "#25 Ninoy Aquino Day", "Scheduled (id 626)"],
           ["Aug 24", "#26 Heroes Day", "Scheduled (id 718, 20:00 PHT)"],
           ["Aug 31", "#27 Barkada", "Scheduled (id 552)"],
           ["Sep 7", "#28 Batangas Road Trip", "Scheduled (id 575)"],
           ["Sep 14", "#29 Summer in Lipa", "Scheduled (id 590)"]],
          widths=[1.1, 3.2, 2.7])
    body(doc, "Article #26 was scheduled on 2026-08-17 and the queue is now complete. One thing to "
              "check: it is set for 20:00 while #27-29 all publish at 08:00, and the established "
              "cadence is Monday mornings. An evening publish gives up most of that day's search "
              "exposure, which matters for a piece about the weekend that follows.",
         bold=True, color=ACCENT_ORANGE, size=10)
    body(doc, "Guardrail: these five articles do add to the 18 pages already sitting in 'Crawled - "
              "currently not indexed'. Watch that count after #29 lands. If it is still climbing, that "
              "is the signal to stop rather than resume at #30.", size=10)

    heading(doc, "Fact-checks - all answered 2026-08-16, nothing blocking", 2, FOREST_GREEN)
    body(doc, "Two of the four answers corrected our own documents rather than filling a gap. Both "
              "corrections improved the offer.", size=10)
    table(doc, ["Question", "Answer", "Effect"],
          [["Are all five homes in one area?",
            "One village (BellaVita). FIVE listings = TWO houses, five doors apart, each taking one "
            "booking at a time. Combined they sleep up to 24 people",
            "CORRECTED the drafts, which implied two configurations of the same house could be booked "
            "together. The true version is a better wedding offer"],
           ["Drive times to wedding venues",
            "Two churches we did not know about - Mary Mediatrix under 10 min, Our Lady of Mount "
            "Carmel 10 min. With the Cathedral at 15, three churches inside a quarter hour",
            "Wedding page reframed around CHURCH weddings, not a venue directory. Five venues at "
            "45-50 min dropped"],
           ["Distance from Manila",
            "One hour is from ALABANG. Central Manila is about 1 hr 45 with traffic",
            "Both figures now published together. The bare claim sits in ~29 blog articles and gets "
            "retrofitted as each is next touched"],
           ["Solar backup",
            "Whole-unit solar array plus battery. Daytime outage carried by the array; after dark "
            "about 4 hours with the aircon, longer without. Covers BOTH Block 34 listings",
            "'Brownout-proof' STANDS - the recommendation to retire it was wrong. Also an unused "
            "selling point on the Spacious 2BR, the listing that slipped from position 11 to 16"],
           ["Hotel rate for the cost comparison",
            "Keep it qualitative",
            "No invented figures on the wedding page"]],
          widths=[1.6, 2.6, 2.8])
    body(doc, "Full record in 081526/FactCheck_Request_Melody.md.", italic=True, size=10)
    body(doc, "COPY RULE arising from this: always write 'sleeps up to 24 people', never '24 beds'. "
              "Capacity comes from mixed sleeping arrangements - a queen sleeps two, a daybed three - "
              "so bed count and guest count are different numbers.", bold=True, size=10)

    body(doc, "")
    body(doc, "Prepared by NetCoreSolutions - Full SEO Audit & Strategy Run, August 16, 2026.",
         italic=True, color=MED_GRAY, size=9)

    if os.path.exists(OUT_LATEST) and not os.path.exists(BACKUP_LATEST):
        shutil.copy2(OUT_LATEST, BACKUP_LATEST)
        print(f"Backed up prior latest -> {BACKUP_LATEST}")
    else:
        print("Backup skipped (pre-aug16 backup exists, or no prior latest).")
    doc.save(OUT_SUFFIXED)
    doc.save(OUT_LATEST)
    os.makedirs(os.path.dirname(OUT_RUN), exist_ok=True)
    doc.save(OUT_RUN)
    print(f"Saved:\n  {OUT_SUFFIXED}\n  {OUT_LATEST}\n  {OUT_RUN}")


if __name__ == "__main__":
    generate()
