import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  B34_PROPERTIES,
  SPEED_FIELDS,
  SPEED_RULES,
  STALE_340,
  applySpeedRulesToField,
  findStale340Excerpts,
  isStale340Sentence,
  planB34SpeedFixes,
  type PropertyContentRow,
  type SpeedField,
} from "@/lib/b34-speed-fixes";
import { UnexpectedContentError } from "@/lib/property-content-fixes";

// Frozen fixture: pre = the 7 speed-bearing fields of cozy-1-bedroom /
// spacious-2-bedroom at the post-drive-time-fix, pre-#105 state production
// currently holds; post = only the fields PR #105 (5a2abfb) changed. See the
// fixture's own _comment.
type Fields = Record<SpeedField, string>;
const FX = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures/b34-speed-pre-post-105.json"), "utf8")
) as { pre: Record<string, Fields>; post: Record<string, Partial<Fields>> };

const expectedPost = (slug: string): Fields => ({ ...FX.pre[slug], ...FX.post[slug] });

function rowsFrom(get: (slug: string) => Fields): PropertyContentRow[] {
  return B34_PROPERTIES.map((p) => ({ id: p.id, slug: p.slug, ...get(p.slug) }));
}

function applyPlan(rows: PropertyContentRow[]): PropertyContentRow[] {
  const plan = planB34SpeedFixes(rows);
  return rows.map((r) => ({ ...r, ...(plan.updates.find((u) => u.id === r.id)?.data ?? {}) }));
}

const preRows = () => rowsFrom((s) => ({ ...FX.pre[s] }));

describe("b34-speed-fixes", () => {
  describe("pre-#105 production content → post-#105 (PR #105) wording", () => {
    it("the fixture really has a Mbps change for both B34 slugs", () => {
      for (const p of B34_PROPERTIES) {
        expect(Object.keys(FX.post[p.slug]).length).toBeGreaterThan(0);
      }
    });

    it.each(B34_PROPERTIES)("$slug: every field ends up byte-equal to the PR #105 target", ({ id, slug }) => {
      const after = applyPlan(preRows()).find((r) => r.id === id)!;
      const want = expectedPost(slug);
      for (const field of SPEED_FIELDS) expect(after[field], `${slug}.${field}`).toBe(want[field]);
    });

    it("touches exactly the fields PR #105 changed (the expected dry-run list)", () => {
      const plan = planB34SpeedFixes(preRows());
      const touched = plan.changes.map((c) => `${c.id}:${c.slug}.${c.field}`);
      const expected = B34_PROPERTIES.flatMap((p) =>
        SPEED_FIELDS.filter((f) => f in FX.post[p.slug]).map((f) => `${p.id}:${p.slug}.${f}`)
      );
      expect(touched.sort()).toEqual(expected.sort());
      expect(plan.changes).toHaveLength(10);
      expect(plan.updates).toHaveLength(2);
      for (const c of plan.changes) {
        expect(SPEED_FIELDS).toContain(c.field);
        expect(c.fragments.length).toBeGreaterThan(0);
        expect(c.excerpt.old).not.toBe("(unchanged)");
      }
    });

    it("is idempotent: a second pass proposes nothing", () => {
      const once = applyPlan(preRows());
      const second = planB34SpeedFixes(once);
      expect(second.changes).toEqual([]);
      expect(second.updates).toEqual([]);
      // The actual current content module (what PR #105 already wrote to the
      // seed) is also a no-op when run through the plan.
      expect(planB34SpeedFixes(rowsFrom(expectedPost)).changes).toEqual([]);
    });

    it("finds no residual stale '340 Mbps' in post-#105 content, and finds it in pre-#105", () => {
      for (const p of B34_PROPERTIES) {
        const post = expectedPost(p.slug);
        for (const f of SPEED_FIELDS) expect(findStale340Excerpts(f, post[f]), `${p.slug}.${f}`).toEqual([]);
        const preHits = SPEED_FIELDS.filter((f) => findStale340Excerpts(f, FX.pre[p.slug][f]).length > 0);
        expect(preHits.sort()).toEqual(Object.keys(FX.post[p.slug]).sort());
      }
    });

    it("re-serializes JSON fields in the seed's JSON.stringify format", () => {
      for (const c of planB34SpeedFixes(preRows()).changes) {
        if (!["bestForSegments", "amenityDetails", "propertyFaqs"].includes(c.field)) continue;
        expect(JSON.stringify(JSON.parse(c.after))).toBe(c.after);
      }
    });
  });

  describe("the DEC-032 regex-collision gotcha", () => {
    it("never flags the new '500+ Mbps' wording as stale", () => {
      expect(STALE_340.test("Fiber WiFi at 500+ Mbps (speed-tested by guests, real number)")).toBe(false);
      expect(isStale340Sentence("Speed-tested at 500+ Mbps, with a backup internet connection available.")).toBe(false);
      for (const p of B34_PROPERTIES) {
        const post = expectedPost(p.slug);
        for (const f of SPEED_FIELDS) {
          expect(findStale340Excerpts(f, post[f]), `${p.slug}.${f}`).toEqual([]);
        }
      }
    });

    it("never matches B38/Mickey's unrelated 520 Mbps figure", () => {
      expect(STALE_340.test("Dedicated fiber WiFi up to 520 Mbps")).toBe(false);
      expect(isStale340Sentence("The house has dedicated fiber internet with speeds up to 520 Mbps.")).toBe(false);
    });
  });

  describe("preserves unrelated text byte-for-byte", () => {
    it("survives a synthetic admin edit elsewhere in a text field", () => {
      const rows = preRows();
      const cozy = rows.find((r) => r.id === 1)!;
      cozy.description = `ADMIN NOTE: repainted 2026.\n\n${cozy.description}\n\nNew line from admin — great WiFi overall.`;
      const after = applyPlan(rows).find((r) => r.id === 1)!;
      expect(after.description).toBe(
        `ADMIN NOTE: repainted 2026.\n\n${expectedPost("cozy-1-bedroom").description}\n\nNew line from admin — great WiFi overall.`
      );
    });

    it("survives a synthetic admin edit elsewhere in a JSON field", () => {
      const rows = preRows();
      const two = rows.find((r) => r.id === 2)!;
      const faqs = JSON.parse(two.propertyFaqs!) as { question: string; answer: string }[];
      faqs.push({ question: "Admin-added?", answer: "Yes — \"quoted\" and unicode ₱ é." });
      two.propertyFaqs = JSON.stringify(faqs);
      const after = applyPlan(rows).find((r) => r.id === 2)!;
      const want = JSON.parse(expectedPost("spacious-2-bedroom").propertyFaqs) as unknown[];
      want.push({ question: "Admin-added?", answer: "Yes — \"quoted\" and unicode ₱ é." });
      expect(after.propertyFaqs).toBe(JSON.stringify(want));
    });

    it("leaves a field without speed rules untouched (spacious-2-bedroom.seoTitle)", () => {
      const rows = preRows();
      const two = rows.find((r) => r.id === 2)!;
      const before = two.seoTitle;
      expect(applyPlan(rows).find((r) => r.id === 2)!.seoTitle).toBe(before);
    });
  });

  describe("unexpected content aborts the whole run", () => {
    it("throws on a residual stale phrase the table doesn't cover, listing property/field/excerpt", () => {
      const rows = preRows();
      const two = rows.find((r) => r.id === 2)!;
      two.seoDescription = `${two.seoDescription} Also fiber WiFi 340 Mbps in the garage office.`;
      expect(() => planB34SpeedFixes(rows)).toThrow(UnexpectedContentError);
      expect(() => planB34SpeedFixes(rows)).toThrow(/id=2 spacious-2-bedroom\.seoDescription: "Also fiber WiFi 340 Mbps in the garage office\."/);
    });

    it("throws when an admin rewrote a targeted phrase into a different stale one", () => {
      const rows = preRows();
      const cozy = rows.find((r) => r.id === 1)!;
      cozy.heroSummary = cozy.heroSummary!.replace(
        "fiber WiFi up to 340 Mbps (speed-tested)",
        "fiber WiFi, 340 Mbps tops, (speed-tested)"
      );
      expect(() => planB34SpeedFixes(rows)).toThrow(/cozy-1-bedroom\.heroSummary/);
    });

    it("throws rather than reformat JSON not stored in JSON.stringify format", () => {
      const rows = preRows();
      const cozy = rows.find((r) => r.id === 1)!;
      cozy.amenityDetails = JSON.stringify(JSON.parse(cozy.amenityDetails!), null, 2);
      expect(() => planB34SpeedFixes(rows)).toThrow(/not in JSON\.stringify format/);
    });

    it("throws on an ambiguous (repeated) old phrase", () => {
      expect(() =>
        applySpeedRulesToField(
          "cozy-1-bedroom",
          "description",
          "x WiFi runs at up to 340 Mbps tested speeds. y WiFi runs at up to 340 Mbps tested speeds."
        )
      ).toThrow(/ambiguous/);
    });

    it("keeps the {id, slug} assertions for exactly the 2 B34 properties", () => {
      expect(() => planB34SpeedFixes(preRows().slice(0, 1))).toThrow(/exactly 2/);
      const wrongSlug = preRows();
      wrongSlug[1] = { ...wrongSlug[1], slug: "something-else" };
      expect(() => planB34SpeedFixes(wrongSlug)).toThrow(/slug mismatch/);
      const dupId = preRows();
      dupId[1] = { ...dupId[1], id: 1 };
      expect(() => planB34SpeedFixes(dupId)).toThrow(/id=1/);
    });

    it("never touches Mickey/B38 — not in B34_PROPERTIES", () => {
      expect(B34_PROPERTIES.map((p) => p.slug)).toEqual(["cozy-1-bedroom", "spacious-2-bedroom"]);
      expect(SPEED_RULES["mickey-in-lipa--family-staycation--sleeps-7"]).toBeUndefined();
      expect(SPEED_RULES["mickey-in-lipa--family-house--sleeps-11"]).toBeUndefined();
      expect(SPEED_RULES["mickey-in-lipa--full-family-house--sleeps-15"]).toBeUndefined();
    });
  });

  describe("replacement table", () => {
    it("covers exactly the 2 expected properties", () => {
      expect(Object.keys(SPEED_RULES).sort()).toEqual(B34_PROPERTIES.map((p) => p.slug).sort());
    });
    it("no new phrase contains a stale '340 Mbps'", () => {
      for (const rules of Object.values(SPEED_RULES)) {
        for (const f of SPEED_FIELDS) {
          for (const r of rules[f] ?? []) expect(isStale340Sentence(r.new), r.new).toBe(false);
        }
      }
    });
  });

  describe("planHash", () => {
    it("is stable for the same input and changes when the rows change", () => {
      const a = planB34SpeedFixes(preRows()).planHash;
      expect(a).toMatch(/^[0-9a-f]{16}$/);
      expect(planB34SpeedFixes(preRows()).planHash).toBe(a);
      const edited = preRows();
      edited[0] = { ...edited[0], description: `${edited[0].description} (edited)` };
      expect(planB34SpeedFixes(edited).planHash).not.toBe(a);
    });
  });
});
