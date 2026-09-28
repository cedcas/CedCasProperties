import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  DRIVE_TIME_FIELDS,
  DRIVE_TIME_RULES,
  applyDriveTimeRulesToField,
  findStaleDriveTimeExcerpts,
  isStaleDriveTimeSentence,
  planDriveTimeFixes,
  type PropertyContentRow,
} from "@/lib/drive-time-fixes";
import {
  CONTENT_FIELDS,
  EXPECTED_PROPERTIES,
  UnexpectedContentError,
  detectStaleFields,
  type ContentFieldName,
} from "@/lib/property-content-fixes";

// Frozen copy of the seed content before/after PR #26 (db0cdbc), serialized the
// way the seed writes the DB — see the fixture's own _comment. Test data only,
// never a production read.
type Fields = Record<ContentFieldName, string>;
const FX = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures/drive-time-pre-post-26.json"), "utf8")
) as { pre: Record<string, Fields>; post: Record<string, Partial<Fields>> };

const expectedPost = (slug: string): Fields => ({ ...FX.pre[slug], ...FX.post[slug] });

function rowsFrom(get: (slug: string) => Fields): PropertyContentRow[] {
  return EXPECTED_PROPERTIES.map((p) => ({ id: p.id, slug: p.slug, ...get(p.slug) }));
}

function applyPlan(rows: PropertyContentRow[]): PropertyContentRow[] {
  const plan = planDriveTimeFixes(rows);
  return rows.map((r) => ({ ...r, ...(plan.updates.find((u) => u.id === r.id)?.data ?? {}) }));
}

const preRows = () => rowsFrom((s) => ({ ...FX.pre[s] }));

describe("drive-time-fixes", () => {
  describe("pre-#26 production content → post-#26 wording", () => {
    it("the fixture really is pre/post #26 and the Maculot pass sees it as clean", () => {
      for (const p of EXPECTED_PROPERTIES) {
        expect(Object.keys(FX.post[p.slug]).length).toBeGreaterThan(0);
        expect(detectStaleFields(FX.pre[p.slug])).toEqual([]);
      }
    });

    it.each(EXPECTED_PROPERTIES)("$slug: every field ends up byte-equal to post-#26", ({ id, slug }) => {
      const after = applyPlan(preRows()).find((r) => r.id === id)!;
      const want = expectedPost(slug);
      for (const field of CONTENT_FIELDS) expect(after[field], `${slug}.${field}`).toBe(want[field]);
    });

    it("touches exactly the fields PR #26 changed (the expected dry-run list)", () => {
      const plan = planDriveTimeFixes(preRows());
      const touched = plan.changes.map((c) => `${c.id}:${c.slug}.${c.field}`);
      const expected = EXPECTED_PROPERTIES.flatMap((p) =>
        CONTENT_FIELDS.filter((f) => f in FX.post[p.slug]).map((f) => `${p.id}:${p.slug}.${f}`)
      );
      expect(touched.sort()).toEqual(expected.sort());
      expect(plan.changes).toHaveLength(20);
      expect(plan.updates).toHaveLength(5);
      for (const c of plan.changes) {
        expect(DRIVE_TIME_FIELDS).toContain(c.field);
        expect(c.fragments.length).toBeGreaterThan(0);
        expect(c.excerpt.old).not.toBe("(unchanged)");
      }
    });

    it("is idempotent: a second pass proposes nothing", () => {
      const once = applyPlan(preRows());
      const second = planDriveTimeFixes(once);
      expect(second.changes).toEqual([]);
      expect(second.updates).toEqual([]);
      // Post-#26 content (what dev's seed now writes) is also a no-op.
      expect(planDriveTimeFixes(rowsFrom(expectedPost)).changes).toEqual([]);
    });

    it("finds no residual stale phrase in post-#26 content, and finds them in pre-#26", () => {
      for (const p of EXPECTED_PROPERTIES) {
        const post = expectedPost(p.slug);
        for (const f of CONTENT_FIELDS) expect(findStaleDriveTimeExcerpts(f, post[f]), `${p.slug}.${f}`).toEqual([]);
        const preHits = CONTENT_FIELDS.filter((f) => findStaleDriveTimeExcerpts(f, FX.pre[p.slug][f]).length > 0);
        expect(preHits.sort()).toEqual(Object.keys(FX.post[p.slug]).sort());
      }
    });

    it("re-serializes JSON fields in the seed's JSON.stringify format", () => {
      for (const c of planDriveTimeFixes(preRows()).changes) {
        if (c.field === "description") continue;
        expect(JSON.stringify(JSON.parse(c.after))).toBe(c.after);
      }
    });
  });

  describe("preserves unrelated text byte-for-byte", () => {
    it("keeps Taal/Tagaytay 'short drive' and Mary Mediatrix times, flags neither", () => {
      const s15 = expectedPost("mickey-in-lipa--full-family-house--sleeps-15").description;
      expect(s15).toContain("a short drive from Taal and Tagaytay");
      const b2 = expectedPost("spacious-2-bedroom").bestForSegments;
      expect(b2).toContain("Mary Mediatrix and Lipa Medix hospitals are within 10 minutes");
      expect(isStaleDriveTimeSentence("Everyone under one roof, about 20 minutes by car from SM Lipa and a short drive from Taal and Tagaytay.")).toBe(false);
      expect(isStaleDriveTimeSentence("A short drive from Taal and Tagaytay.")).toBe(false);
      expect(isStaleDriveTimeSentence("Mary Mediatrix is within 10 minutes; Lipa Medix within 15 minutes.")).toBe(false);
      expect(isStaleDriveTimeSentence("It sits close to cafés, restaurants, and the SM Lipa area.")).toBe(false);
    });

    it("survives a synthetic admin edit elsewhere in a text field", () => {
      const rows = preRows();
      const cozy = rows.find((r) => r.id === 1)!;
      cozy.description = `ADMIN NOTE: repainted 2026.\n\n${cozy.description}\n\nNew line from admin — a short drive from Taal.`;
      const after = applyPlan(rows).find((r) => r.id === 1)!;
      expect(after.description).toBe(
        `ADMIN NOTE: repainted 2026.\n\n${expectedPost("cozy-1-bedroom").description}\n\nNew line from admin — a short drive from Taal.`
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

    it("leaves a field without drive-time rules untouched even if it mentions SM Lipa cleanly", () => {
      const rows = preRows();
      const s7 = rows.find((r) => r.id === 3)!;
      const before = s7.description;
      expect(before).toContain("the SM Lipa area");
      expect(applyPlan(rows).find((r) => r.id === 3)!.description).toBe(before);
    });
  });

  describe("unexpected content aborts the whole run", () => {
    it("throws on a residual stale phrase the table doesn't cover, listing property/field/excerpt", () => {
      const rows = preRows();
      const s11 = rows.find((r) => r.id === 4)!;
      s11.heroSummary = `${s11.heroSummary} SM City Lipa is just 5–10 minutes away.`;
      expect(() => planDriveTimeFixes(rows)).toThrow(UnexpectedContentError);
      expect(() => planDriveTimeFixes(rows)).toThrow(/id=4 mickey-in-lipa--family-house--sleeps-11\.heroSummary: "SM City Lipa is just 5–10 minutes away\."/);
    });

    it.each([
      "Casa Marikit is a short drive away.",
      "Casa Marikit is 10 to 15 minutes away.",
      "Casa Marikit is 45–50 minutes away.",
      "Casa Marikit is 5 minutes away.",
      "SM Lipa is five minutes away.",
      "SM Lipa is a 5-minute drive.",
      "SM Lipa is five to ten minutes away.",
    ])("flags %s", (phrase) => {
      const rows = preRows();
      const cozy = rows.find((r) => r.id === 1)!;
      cozy.description = `${cozy.description}\n\n${phrase}`;
      expect(() => planDriveTimeFixes(rows)).toThrow(UnexpectedContentError);
    });

    it("throws when an admin rewrote a targeted phrase into a different stale one", () => {
      const rows = preRows();
      const two = rows.find((r) => r.id === 2)!;
      two.description = two.description!.replace(
        "The unit is a short drive to SM Lipa and Casa Marikit.",
        "The unit is a quick five-minute drive to SM Lipa."
      );
      expect(() => planDriveTimeFixes(rows)).toThrow(/spacious-2-bedroom\.description/);
    });

    it("throws when the neighbourhood band layout isn't the expected one", () => {
      const rows = preRows();
      const cozy = rows.find((r) => r.id === 1)!;
      const groups = JSON.parse(cozy.neighborhoodPlaces!) as { radiusLabel: string; places: string[] }[];
      groups[0].radiusLabel = "3 minutes by car";
      cozy.neighborhoodPlaces = JSON.stringify(groups);
      expect(() => planDriveTimeFixes(rows)).toThrow(/cozy-1-bedroom\.neighborhoodPlaces: unexpected band layout/);
    });

    it("throws rather than reformat JSON not stored in JSON.stringify format", () => {
      const rows = preRows();
      const cozy = rows.find((r) => r.id === 1)!;
      cozy.amenityDetails = JSON.stringify(JSON.parse(cozy.amenityDetails!), null, 2);
      expect(() => planDriveTimeFixes(rows)).toThrow(/not in JSON\.stringify format/);
    });

    it("throws on an ambiguous (repeated) old phrase", () => {
      expect(() =>
        applyDriveTimeRulesToField(
          "cozy-1-bedroom",
          "description",
          "x and a five-minute drive from SM Lipa for groceries. y and a five-minute drive from SM Lipa for groceries."
        )
      ).toThrow(/ambiguous/);
    });

    it("keeps the {id, slug} assertions for exactly 5 properties", () => {
      expect(() => planDriveTimeFixes(preRows().slice(0, 4))).toThrow(/exactly 5/);
      const wrongSlug = preRows();
      wrongSlug[2] = { ...wrongSlug[2], slug: "something-else" };
      expect(() => planDriveTimeFixes(wrongSlug)).toThrow(/slug mismatch/);
      const dupId = preRows();
      dupId[4] = { ...dupId[4], id: 1 };
      expect(() => planDriveTimeFixes(dupId)).toThrow(/id=1/);
    });
  });

  describe("replacement table", () => {
    it("covers exactly the 5 expected properties", () => {
      expect(Object.keys(DRIVE_TIME_RULES).sort()).toEqual(EXPECTED_PROPERTIES.map((p) => p.slug).sort());
    });
    it("no new phrase contains a stale drive time", () => {
      for (const rules of Object.values(DRIVE_TIME_RULES)) {
        for (const f of ["description", "bestForSegments", "amenityDetails", "propertyFaqs"] as const) {
          for (const r of rules[f] ?? []) expect(isStaleDriveTimeSentence(r.new), r.new).toBe(false);
        }
      }
    });
  });

  describe("planHash", () => {
    it("is stable for the same input and changes when the rows change", () => {
      const a = planDriveTimeFixes(preRows()).planHash;
      expect(a).toMatch(/^[0-9a-f]{16}$/);
      expect(planDriveTimeFixes(preRows()).planHash).toBe(a);
      const edited = preRows();
      edited[0] = { ...edited[0], description: `${edited[0].description} (edited)` };
      expect(planDriveTimeFixes(edited).planHash).not.toBe(a);
    });
  });
});
