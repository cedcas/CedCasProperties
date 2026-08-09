/**
 * READ-ONLY audit of admin-authored prose for vague charge language.
 *
 * The itemized fee breakdown on the booking widget exists to kill surprise-fee
 * anxiety, but free-text fields (`propertyRules`, `pricingNotes`, `heroSummary`,
 * `description`, `propertyFaqs`) live only in the live MySQL DB and are never
 * seeded from the repo. `sanitizeChargeProse` rewrites the known stock phrases at
 * render time, so the public site is already safe — this script finds the rows
 * that still need a manual admin edit so the source data matches.
 *
 * It also flags two contradictory pricing configurations that the breakdown will
 * render "correctly" but which almost certainly indicate a data-entry mistake.
 *
 * WRITES NOTHING. Run:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-vague-charges.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { sanitizeChargeProse, extraGuestFeeApplies } from "../src/lib/occupancy";

const prisma = new PrismaClient();

/** Mirrors VAGUE_CHARGE_PATTERNS in src/lib/occupancy.ts, plus softer near-misses
 *  the sanitizer deliberately does NOT rewrite but a human should still review. */
const DETECT = [
  /\b(?:any\s+)?(?:additional|extra|other|further|miscellaneous)\s+(?:charges?|fees?|costs?)\s+(?:may|might|could|can)\s+(?:apply|be\s+(?:applied|charged|incurred))\b/gi,
  /\bsubject\s+to\s+(?:any\s+)?(?:additional|extra|other)\s+(?:charges?|fees?|costs?)\b/gi,
  /\b(?:may|might|could)\s+(?:be\s+)?(?:incur|be\s+subject\s+to)\s+(?:additional|extra|other)\s+(?:charges?|fees?|costs?)\b/gi,
  /\b(?:additional|extra|other)\s+(?:charges?|fees?|costs?)\s+(?:will|shall)\s+be\s+(?:determined|advised|quoted)\b/gi,
  // Softer signals — reported as REVIEW, not auto-rewritten.
  /\bfees?\s+(?:may|might|could)\s+vary\b/gi,
  /\bprices?\s+(?:may|might|could)\s+(?:vary|change)\s+without\s+notice\b/gi,
  /\bto\s+be\s+(?:advised|determined|confirmed)\b/gi,
  /\bTBA\b|\bTBD\b/g,
];

const TEXT_FIELDS = [
  "propertyRules",
  "heroSummary",
  "description",
  "pricingNotes",
  "propertyFaqs",
  "housePolicies",
] as const;

type Hit = { field: string; phrase: string; context: string; autoFixed: boolean };

function excerpt(text: string, index: number, len: number): string {
  const start = Math.max(0, index - 45);
  const end = Math.min(text.length, index + len + 45);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ").trim()}${end < text.length ? "…" : ""}`;
}

async function main() {
  const properties = await prisma.property.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      pricePerNight: true,
      maxGuests: true,
      includedGuests: true,
      extraGuestFeePerNight: true,
      propertyRules: true,
      heroSummary: true,
      description: true,
      pricingNotes: true,
      propertyFaqs: true,
      housePolicies: true,
      rates: { select: { rateType: true } },
    },
  });

  console.log(`\n${"=".repeat(78)}`);
  console.log(`VAGUE-CHARGE AUDIT — ${properties.length} propert${properties.length === 1 ? "y" : "ies"}`);
  console.log(`${"=".repeat(78)}`);

  let totalHits = 0;
  const needsEdit: string[] = [];

  for (const p of properties) {
    const occupancy = {
      maxGuests: p.maxGuests,
      includedGuests: p.includedGuests,
      extraGuestFeePerNight: Number(p.extraGuestFeePerNight),
    };

    const hits: Hit[] = [];

    for (const field of TEXT_FIELDS) {
      const raw = p[field];
      if (!raw || typeof raw !== "string") continue;

      // Sanitize the WHOLE field, not the phrase in isolation — the shipped rule is
      // context-sensitive (a clause naming its own trigger is deliberately kept), so
      // testing a bare phrase would misreport penalty clauses as auto-fixed.
      const sanitized = sanitizeChargeProse(raw, occupancy);

      for (const pattern of DETECT) {
        pattern.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(raw)) !== null) {
          const phrase = m[0].trim();
          // Survives sanitizing → the shipped rule left it alone → needs a human.
          const autoFixed = !sanitized.includes(phrase);
          hits.push({
            field,
            phrase,
            context: excerpt(raw, m.index, m[0].length),
            autoFixed,
          });
          if (m[0].length === 0) pattern.lastIndex++; // guard against zero-length loops
        }
      }
    }

    // ── Contradictory pricing configuration ────────────────────────────────
    const configWarnings: string[] = [];
    if (Number(p.extraGuestFeePerNight) > 0 && !extraGuestFeeApplies(occupancy)) {
      configWarnings.push(
        `extraGuestFeePerNight=₱${Number(p.extraGuestFeePerNight)} is set but includedGuests(${p.includedGuests}) >= maxGuests(${p.maxGuests}) — the fee can never apply and is hidden from the breakdown.`
      );
    }
    if (Number(p.pricePerNight) > 0 && !p.rates.some((r) => r.rateType === "weekend")) {
      configWarnings.push(
        `pricePerNight=₱${Number(p.pricePerNight)} but no weekend rate configured — the breakdown will present the base rate as if it were flat all week.`
      );
    }

    if (hits.length === 0 && configWarnings.length === 0) continue;

    totalHits += hits.length;
    needsEdit.push(p.slug);

    console.log(`\n── ${p.name}  [${p.slug}]${p.isActive ? "" : "  (INACTIVE)"}`);
    console.log(`   id=${p.id} · rate ₱${Number(p.pricePerNight)} · covers ${p.includedGuests} of ${p.maxGuests} · extra ₱${Number(p.extraGuestFeePerNight)}/guest/night`);

    for (const h of hits) {
      console.log(`   ${h.autoFixed ? "AUTO-FIXED at render" : "REVIEW MANUALLY   "}  ${h.field}`);
      console.log(`      phrase : "${h.phrase}"`);
      console.log(`      context: ${h.context}`);
    }
    for (const w of configWarnings) {
      console.log(`   CONFIG   ${w}`);
    }
  }

  console.log(`\n${"=".repeat(78)}`);
  if (needsEdit.length === 0) {
    console.log("Clean — no vague charge language and no contradictory pricing config found.");
  } else {
    console.log(`${totalHits} phrase hit(s) across ${needsEdit.length} propert${needsEdit.length === 1 ? "y" : "ies"}:`);
    for (const s of needsEdit) console.log(`  • ${s}`);
    console.log(`\nAUTO-FIXED entries already render correctly on the public site — clean them`);
    console.log(`in the admin Property form so the stored text matches what guests see.`);
    console.log(`REVIEW MANUALLY entries are NOT rewritten and still show as-authored.`);
  }
  console.log(`${"=".repeat(78)}\n`);
}

main()
  .catch((e) => {
    console.error("Audit failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
