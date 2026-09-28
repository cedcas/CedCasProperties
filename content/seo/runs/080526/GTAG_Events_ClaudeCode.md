# GTAG Analytics Events — Brief for Claude Code (HavenInLipa website repo)

Running spec for the GA4 (gtag.js) conversion/interaction events. We're adding events **one at a time** — each is marked ✅ READY (finalized, safe to implement) or 🕓 PENDING (still being defined). Implement the READY ones; leave PENDING for later passes.

## Context
- Site: `haveninlipa.com` + blog `blog.haveninlipa.com`, Next.js/React, SSR.
- GA4 is installed via **gtag.js** (Measurement ID **`G-2SV2PXYB7T`**), firing on both domains. **No GTM.** Cross-domain linking is configured in GA4.
- Goal: capture booking-intent + booking events so organic conversions are measurable (currently ~0.8% conversion is invisible in analytics).
- These events pair naturally with the booking-friction work ([Booking_Friction_ClaudeCode_Brief.md](Booking_Friction_ClaudeCode_Brief.md)) — the same components get `data-analytics` hooks; you can ship both in one pass.

## Global conventions (apply to ALL events)
1. **Use a single helper** so every event is consistent and dev traffic is excluded cleanly:
   ```js
   // analytics.ts (or similar)
   export function track(event, params = {}) {
     if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
     const host = window.location.hostname;
     const isProd = host === 'haveninlipa.com' || host === 'blog.haveninlipa.com';
     window.gtag('event', event, {
       ...params,
       // dev/localhost -> visible in GA4 DebugView but excluded from reports
       // via GA4's "Developer Traffic" data filter (Active).
       ...(isProd ? {} : { debug_mode: true }),
     });
   }
   ```
2. **Never hardcode** — pass real values from booking/property data (slug, total, currency, id).
3. **Fire once** — for state-based events (like a confirmation screen), fire on mount with fire-once semantics; never on every re-render.
4. **`property`** = the unit's slug (e.g. `mickey-in-lipa--family-staycation--sleeps-7`) on every property-scoped event, so conversions attribute per property.
5. **Don't block SEO/SSR** — analytics is client-side only; no impact on server render, schema, or the `/book` noindex.

---

## Event 1 — `booking_confirmed`  ✅ READY
**What it means:** a booking **request** was submitted (the "Booking Received!" screen — payment is verified in GCash offline afterward). This is the primary on-site conversion.

**Where it fires:** the component/state that renders the **"Booking Received!"** confirmation on `/properties/<slug>/book`. Note this is a **client-side state on the same `/book` URL** (no route/URL change), so it must be fired in code — it cannot be matched by URL in GA4.

**Implementation (React):**
```jsx
useEffect(() => {
  track('booking_confirmed', {
    property: booking.propertySlug,   // e.g. "mickey-in-lipa--family-staycation--sleeps-7"
    value: booking.total,             // booking total in PHP (number)
    currency: 'PHP',
    transaction_id: booking.id,       // internal booking ref — dedups on refresh
  });
}, []); // empty deps -> once on mount
```
**Requirements / acceptance:**
- Fires exactly once when "Booking Received!" appears; not on the booking-form step, not on re-render/refresh (guard with the confirmed booking's presence).
- `value` is the numeric PHP total; `currency` = `'PHP'`; `transaction_id` = the booking reference.
- Verify in GA4 **DebugView** on dev: one `booking_confirmed` event with all params.

---

## Event 2 — `generate_lead`  🕓 PENDING (defining next)
Inquiry via the contact / booking-inquiry form. Spec to be finalized in the next pass.

## Event 3 — `book_click`  🕓 PENDING
Click on the final booking-submit CTA. Will use the `data-analytics="book_click"` + `data-property` hooks from the booking-friction brief.

## Event 4 — `check_availability`  🕓 PENDING
Click on the "Check Availability" card CTA / sticky bar. Will use `data-analytics="check_availability"` + `data-property`.

---

## GA4 dashboard tasks (Cedric — after each event ships)
- **Mark as key event:** Admin → Key events → New key event → type the event name (`booking_confirmed` first). Custom gtag events arrive already-named; no "Create event" rule needed.
- **Verify:** Admin → DebugView (test on dev; the same tag on prod picks it up automatically after deploy).
- **Keep dev/test out of reports:** Admin → Data Settings → Data Filters → **Developer Traffic → Active** (works with the `debug_mode` flag above). Skip the IP-based "internal traffic" setup.
