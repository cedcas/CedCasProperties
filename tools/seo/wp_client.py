#!/usr/bin/env python3
"""HavenInLipa's WordPress client — thin compatibility shim.

2026-09-03: this file's original REST design (credentials outside Dropbox,
config-enforced safety rails, "REST not raw SQL so revisions/cache hooks
fire") was promoted into the shared seo/Tools/wp_client.py so every SEO
client (PinasBnb, HavenInLipa, NetCore, TribeMedSpa, future ones) uses the
same client instead of each maintaining its own copy. This file now just
binds that shared client to HavenInLipa's own config, so existing code that
does `from wp_client import WP; wp = WP()` keeps working unchanged.

Usage (unchanged):
    from wp_client import WP
    wp = WP()
    post = wp.get_by_slug("some-slug")
    wp.update(post["id"], content=new_html)     # raises if unsafe
"""

import os
import sys
import importlib.util

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)
sys.path.insert(0, os.path.join(_HERE, "..", "..", "Tools"))

# Loaded by explicit path under a distinct module name — this file is itself
# named wp_client.py for backward compatibility, so a plain
# `from wp_client import WP` here risks resolving to itself via Python's
# sys.modules cache (a circular self-import) rather than the shared module,
# depending on what already imported this shim. importlib sidesteps that.
_shared_path = os.path.join(_HERE, "..", "..", "Tools", "wp_client.py")
_spec = importlib.util.spec_from_file_location("_seo_shared_wp_client", _shared_path)
_shared = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_shared)
_SharedWP = _shared.WP

from haveninlipa_config import CLIENT


class WP(_SharedWP):
    def __init__(self):
        super().__init__(CLIENT)


if __name__ == "__main__":
    wp = WP()
    me = wp.whoami()
    print(f"Authenticated as {me['name']} ({me['slug']}, id {me['id']}) roles={me.get('roles')}")
    print(f"allow_publish={wp.allow_publish}  protected={wp.protected or '{}'}")
