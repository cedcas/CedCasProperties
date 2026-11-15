/**
 * Optional per-unit walkthrough-video URL, keyed by slug — no schema
 * migration (DEC-034). `PropertyWalkthrough` renders nothing for a slug with
 * no entry here, so this map can ship empty and the slot simply doesn't
 * appear until a real URL is added.
 *
 * Searched 2026-11-15 for an existing, usable, no-people unit-walkthrough
 * clip before adding anything here (task constraint: do not upload new
 * media). Found under /workspace/hil-marketing: "Haven Reels" are
 * persona/joke videos, not a walkthrough of a unit, and the m360 clips are a
 * vendor-portal walkthrough (how to use a dashboard), not a listing tour. No
 * matching clip was found for any of the 5 slugs, so this map stays empty —
 * add a `slug: url` entry here once a real walkthrough video exists.
 */
export const WALKTHROUGH_VIDEOS: Partial<Record<string, string>> = {};

export function getWalkthroughVideoUrl(slug: string): string | undefined {
  return WALKTHROUGH_VIDEOS[slug];
}
