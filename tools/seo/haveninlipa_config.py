#!/usr/bin/env python3
"""HavenInLipa's ClientConfig for the shared Tools/ library (seo/Tools/).

HIL has REST credentials (~/.config/haveninlipa/wordpress.env) but no SSH
access provisioned. That matters specifically for SEO fields: HIL runs Yoast,
and Yoast's title/description/focus-keyphrase meta keys are NOT currently
exposed for writing via REST on this site (only `footnotes` is registered;
focus keyphrase is read-only) — see README_wordpress_access.md Section on
Yoast. seo_plugin.YoastBackend will attempt a best-effort REST postmeta write
and raise clearly if it doesn't stick, rather than silently claiming success.

To fully unblock Yoast field writes, HIL needs the same kind of SSH/wp-cli
access PinasBnb has (an SshConfig here) — that's a new credential set to
provision, and the plugin call itself (WPSEO_Meta::set_value(), see
seo/Tools/seo_plugin.py) is UNVERIFIED against this site's actual Yoast
version. Don't treat the one-shot pipeline as solved for HIL's SEO fields
until that's been provisioned and tested once against a real post.

blog_root and brand are left unset — the Image & Metadata Brief docx pattern
hasn't been used for HIL yet (no Business/HavenInLipa Blog folder exists).
Fill both in the first time that workflow runs for this client.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "Tools"))
from client_config import ClientConfig, RestConfig

CLIENT = ClientConfig(
    slug="haveninlipa",
    site_domain="blog.haveninlipa.com",
    seo_plugin="yoast",
    rest=RestConfig(env_file=os.path.expanduser("~/.config/haveninlipa/wordpress.env")),
    author_slug="haven",
    byline_html="",  # HIL articles don't carry a fixed named byline the way PinasBnb's Mara Santos does
    category_ids={},  # resolved by name via REST get_or_create_term instead of a fixed id map
    blog_root=None,   # TBD — set this the first time an Image & Metadata Brief is needed for HIL
    brand={},          # TBD — same; don't guess a palette for client deliverables
)
