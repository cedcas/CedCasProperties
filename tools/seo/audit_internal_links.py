"""
Audit internal links across all live HavenInLipa blog articles.

Fetches each live article, extracts every haveninlipa.com link from the
article body (excluding site nav/header/footer/sidebar), and checks the
HTTP status of each. Flags broken links (4xx/5xx) and redirecting links
(301/302) so the blogger can update them to canonical URLs.

Output: Markdown report at the current working directory.
"""
from __future__ import annotations

import re
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

LIVE_ARTICLES = [
    "https://blog.haveninlipa.com/mickey-in-lipa-coming-soon/",
    "https://blog.haveninlipa.com/family-staycation-lipa-city-batangas/",
    "https://blog.haveninlipa.com/how-to-get-to-lipa-city-from-manila-2026-guide/",
    "https://blog.haveninlipa.com/work-from-lipa-the-affordable-remote-work-staycation-near-manila/",
    "https://blog.haveninlipa.com/taal-volcano-day-trip-from-lipa-city-2026-updated-guide/",
    "https://blog.haveninlipa.com/why-book-direct-instead-of-airbnb-a-philippines-hosts-honest-take/",
    "https://blog.haveninlipa.com/best-restaurants-cafes-in-lipa-city-batangas-2026-food-guide/",
    "https://blog.haveninlipa.com/mt-maculot-hiking-guide-2026-trail-tips-routes-where-to-stay-in-lipa/",
    "https://blog.haveninlipa.com/weekend-getaway-in-lipa-city-batangas-your-chill-escape-near-manila/",
    "https://blog.haveninlipa.com/15-best-things-to-do-in-lipa-city-batangas-2026-locals-guide/",
]

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
INTERNAL_HOSTS = {"haveninlipa.com", "www.haveninlipa.com", "blog.haveninlipa.com"}

# Skip these — they're sitewide chrome, not in-body editorial links.
EXCLUDE_CONTAINER_CLASSES = {
    "site-header", "site-footer", "menu", "nav", "navigation",
    "widget", "sidebar", "comments", "related", "author-bio",
    "social-share", "share", "post-navigation", "site-branding",
}


class ArticleBodyExtractor(HTMLParser):
    """Extract anchors that sit inside the post's editorial body.

    WordPress + Yoast themes commonly mark the body with either
    `<article>` or a wrapper with class `entry-content` / `post-content`.
    We track depth into the first qualifying container and collect <a>
    hrefs found inside it, skipping any nested nav/widget/sidebar zones.
    """

    BODY_CLASSES = {"entry-content", "post-content", "single-post-content", "article-content"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_body_depth = 0       # >0 means we're inside the article body
        self.in_excluded_depth = 0   # >0 means we're inside nav/footer/etc.
        self.body_started = False
        self.links: list[str] = []
        self.anchor_text_buffer: list[str] = []
        self.collecting_anchor_text = False
        self.current_anchor_href: str | None = None
        self.collected: list[tuple[str, str]] = []  # (href, anchor_text)

    def _class_set(self, attrs: list[tuple[str, str | None]]) -> set[str]:
        for k, v in attrs:
            if k == "class" and v:
                return set(v.split())
        return set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        classes = self._class_set(attrs)

        # Entering an excluded chrome region — skip everything inside.
        if classes & EXCLUDE_CONTAINER_CLASSES or tag in {"nav", "footer", "header"}:
            if self.in_body_depth > 0 or not self.body_started:
                self.in_excluded_depth += 1
                return

        if self.in_excluded_depth > 0:
            return

        # Entering the editorial body.
        if not self.body_started:
            if tag == "article" or classes & self.BODY_CLASSES:
                self.body_started = True
                self.in_body_depth = 1
                return
        elif self.in_body_depth > 0:
            self.in_body_depth += 1

        if self.in_body_depth > 0 and tag == "a":
            href = next((v for k, v in attrs if k == "href"), None)
            if href:
                self.current_anchor_href = href
                self.collecting_anchor_text = True
                self.anchor_text_buffer = []

    def handle_endtag(self, tag: str) -> None:
        if self.in_excluded_depth > 0:
            if tag in {"nav", "footer", "header"} or tag in {"div", "section", "aside"}:
                # We can't perfectly match the opener; decrement when leaving
                # any block-ish tag. False negatives are fine — we may capture
                # a few extra chrome links, which the URL filter will mostly
                # discard anyway.
                self.in_excluded_depth = max(0, self.in_excluded_depth - 1)
            return

        if tag == "a" and self.current_anchor_href is not None:
            text = " ".join("".join(self.anchor_text_buffer).split())
            self.collected.append((self.current_anchor_href, text))
            self.current_anchor_href = None
            self.collecting_anchor_text = False
            self.anchor_text_buffer = []

        if self.in_body_depth > 0:
            self.in_body_depth -= 1
            if self.in_body_depth == 0:
                # We've left the body container — stop collecting.
                self.body_started = False  # prevent re-entry

    def handle_data(self, data: str) -> None:
        if self.collecting_anchor_text:
            self.anchor_text_buffer.append(data)


def fetch(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    # Be permissive about encoding.
    return raw.decode("utf-8", errors="replace")


def check_link(url: str, timeout: int = 15) -> tuple[int, str, int]:
    """Return (status_code, final_url, num_redirects). 0 = network error."""
    redirects = 0
    current = url
    seen: set[str] = set()
    while True:
        if current in seen or redirects > 10:
            return -1, current, redirects  # loop
        seen.add(current)
        req = urllib.request.Request(
            current, headers={"User-Agent": UA}, method="HEAD"
        )
        try:
            opener = urllib.request.build_opener(NoRedirectHandler())
            resp = opener.open(req, timeout=timeout)
            return resp.status, current, redirects
        except urllib.error.HTTPError as e:
            if e.code in (301, 302, 303, 307, 308):
                loc = e.headers.get("Location")
                if not loc:
                    return e.code, current, redirects
                current = urljoin(current, loc)
                redirects += 1
                continue
            return e.code, current, redirects
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            # HEAD sometimes blocked — retry GET once before giving up.
            try:
                req2 = urllib.request.Request(current, headers={"User-Agent": UA})
                with urllib.request.urlopen(req2, timeout=timeout) as resp2:
                    return resp2.status, current, redirects
            except Exception:
                return 0, current, redirects


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D401
        return None  # raise HTTPError instead of following


def normalize(url: str, base: str) -> str | None:
    if not url:
        return None
    if url.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    absolute = urljoin(base, url)
    parsed = urlparse(absolute)
    if parsed.scheme not in {"http", "https"}:
        return None
    if parsed.hostname not in INTERNAL_HOSTS:
        return None
    # Strip fragments; keep query string (might matter).
    clean = parsed._replace(fragment="")
    return clean.geturl()


def classify(status: int, redirects: int) -> str:
    if status == 200 and redirects == 0:
        return "OK"
    if status == 200 and redirects > 0:
        return "REDIRECT"
    if 400 <= status < 500:
        return "BROKEN"
    if 500 <= status < 600:
        return "SERVER_ERROR"
    if status == 0:
        return "NETWORK_ERROR"
    if status == -1:
        return "REDIRECT_LOOP"
    return f"OTHER_{status}"


def main() -> int:
    # url -> (status, final_url, redirects)
    link_results: dict[str, tuple[int, str, int]] = {}
    # url -> list of (source_article, anchor_text)
    link_sources: dict[str, list[tuple[str, str]]] = defaultdict(list)
    # source_article -> list of (link, anchor_text)
    article_links: dict[str, list[tuple[str, str]]] = {}

    for article in LIVE_ARTICLES:
        print(f"Fetching {article}", file=sys.stderr)
        try:
            html = fetch(article)
        except Exception as e:
            print(f"  ERROR fetching: {e}", file=sys.stderr)
            article_links[article] = []
            continue

        parser = ArticleBodyExtractor()
        parser.feed(html)

        unique: dict[str, str] = {}
        for href, text in parser.collected:
            norm = normalize(href, article)
            if norm is None or norm.rstrip("/") == article.rstrip("/"):
                continue
            if norm not in unique:
                unique[norm] = text
        article_links[article] = list(unique.items())
        for link, text in unique.items():
            link_sources[link].append((article, text))

    all_links = sorted(link_sources.keys())
    print(f"\nChecking {len(all_links)} unique internal links...", file=sys.stderr)
    for i, link in enumerate(all_links, 1):
        print(f"  [{i}/{len(all_links)}] {link}", file=sys.stderr)
        link_results[link] = check_link(link)
        time.sleep(0.15)  # polite

    # ---- Build markdown report ----
    out: list[str] = []
    out.append("# Internal Link Audit — Live Blog Articles")
    out.append("")
    out.append(f"Audited {len(LIVE_ARTICLES)} articles, {len(all_links)} unique internal links.")
    out.append("")
    out.append("Status legend: **OK** (200, no redirect) · **REDIRECT** (200 after 301/302 — update to canonical) · **BROKEN** (4xx) · **SERVER_ERROR** (5xx) · **NETWORK_ERROR** · **REDIRECT_LOOP**")
    out.append("")

    # Summary counts.
    counts: dict[str, int] = defaultdict(int)
    for status, _, redirs in link_results.values():
        counts[classify(status, redirs)] += 1
    out.append("## Summary")
    out.append("")
    out.append("| Status | Count |")
    out.append("|---|---|")
    for label in ("OK", "REDIRECT", "BROKEN", "SERVER_ERROR", "NETWORK_ERROR", "REDIRECT_LOOP"):
        if counts.get(label):
            out.append(f"| {label} | {counts[label]} |")
    out.append("")

    # Problem links — surfaced first.
    problems = [
        (url, link_results[url])
        for url in all_links
        if classify(link_results[url][0], link_results[url][2]) != "OK"
    ]
    out.append(f"## Problem links ({len(problems)})")
    out.append("")
    if not problems:
        out.append("None — all internal links resolve cleanly with no redirects.")
    else:
        out.append("| Link | Status | Final URL | Appears In |")
        out.append("|------|--------|-----------|------------|")
        for url, (status, final, redirs) in problems:
            label = classify(status, redirs)
            sources = link_sources[url]
            src_list = "<br>".join(
                f"`{urlparse(a).path}` ({t[:50] + ('…' if len(t) > 50 else '')})"
                for a, t in sources
            )
            final_display = final if final != url else "—"
            out.append(f"| `{url}` | **{label}** ({status}, {redirs} hop{'s' if redirs != 1 else ''}) | `{final_display}` | {src_list} |")
    out.append("")

    # Per-article breakdown.
    out.append("## Per-article breakdown")
    out.append("")
    for article in LIVE_ARTICLES:
        links = article_links.get(article, [])
        slug = urlparse(article).path.strip("/")
        out.append(f"### `{slug}`")
        out.append("")
        if not links:
            out.append("_No internal links found in body (or article body couldn't be parsed)._")
            out.append("")
            continue
        out.append(f"{len(links)} internal link(s):")
        out.append("")
        out.append("| Status | Anchor text | Link |")
        out.append("|--------|-------------|------|")
        for link, text in sorted(links):
            status, final, redirs = link_results.get(link, (0, link, 0))
            label = classify(status, redirs)
            emoji = {"OK": "✅", "REDIRECT": "🟡", "BROKEN": "❌"}.get(label, "⚠️")
            text_short = (text[:60] + "…") if len(text) > 60 else text or "(no text)"
            out.append(f"| {emoji} {label} | {text_short} | `{link}` |")
        out.append("")

    report = "\n".join(out)
    print(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
