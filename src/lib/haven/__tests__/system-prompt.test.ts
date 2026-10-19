import { describe, expect, it } from "vitest";
import { buildHavenSystemPrompt } from "../system-prompt";

describe("buildHavenSystemPrompt", () => {
  it("always offers the https Messenger handoff link, never the scheme-less form alone", () => {
    const prompt = buildHavenSystemPrompt("en");
    expect(prompt).toContain("https://m.me/haveninlipa");
  });

  describe("terms of address", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("bans partner/pare/bro/sis/dude unless the guest used the word first", () => {
      expect(prompt).toMatch(/"partner".*"pare".*"bro".*"sis".*"dude"/);
      expect(prompt).toMatch(/guest used that exact word first/i);
    });

    it("gates parekoy/marekoy on a clear gender cue, with a gendered-name and a neutral-name example", () => {
      expect(prompt).toMatch(/parekoy.*male/i);
      expect(prompt).toMatch(/marekoy.*female/i);
      expect(prompt).toMatch(/clear gender cue/i);
      expect(prompt).toContain("Ako si Maria");
      expect(prompt).toContain("marekoy");
      expect(prompt).toContain("Ako si Juan");
      expect(prompt).toContain("Ako si Toni");
      expect(prompt).toMatch(/unisex or ambiguous name/i);
    });

    it("documents the neutral default terms", () => {
      expect(prompt).toContain("kabayan");
      expect(prompt).toContain("kaibigan");
      expect(prompt).toContain("ka-Haven");
    });
  });

  describe("pricing arithmetic ban", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("forbids multiplying or summing a nightly rate itself", () => {
      expect(prompt).toMatch(/never multiply, sum, or otherwise do arithmetic/i);
      expect(prompt).toMatch(/nights? ×.*nightly rate|nights.*rate/i);
    });

    it("says pricePerNight may only be stated as a 'from' figure, never multiplied", () => {
      expect(prompt).toMatch(/from ₱X\/night/);
    });

    it("says the only total allowed is the one get_quote/find_stay returned this turn", () => {
      expect(prompt).toMatch(/get_quote or find_stay returned THIS turn/);
    });

    it("requires a base/listing rate to always read 'from ₱X'/'simula ₱X', and exempts a dated quote line (Cedric, 2026-10-15)", () => {
      expect(prompt).toMatch(/simula ₱X kada gabi/);
      expect(prompt).toMatch(/rates\s*can change/i);
      expect(prompt).toMatch(/does NOT apply to an exact dated quote line/i);
    });
  });

  describe("stay-range end-date guard (DEC-029)", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("instructs the model to copy stayLabel verbatim, ending on the check-out date", () => {
      expect(prompt).toMatch(/always ends on the check-out date/i);
      expect(prompt).toMatch(/never.*on the last occupied\s*night/i);
      expect(prompt).toMatch(/stayLabel/);
      expect(prompt).toMatch(/copy the stayLabel matching your reply language verbatim/i);
    });
  });

  describe("local places / how things work (Cedric, 2026-10-15)", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("points to the printed Welcome Book, with Alfamart and minimarts as fixed facts", () => {
      expect(prompt).toMatch(/Welcome Book/);
      expect(prompt).toMatch(/Alfamart/);
      expect(prompt).toMatch(/minimarts/);
      expect(prompt).toMatch(/never look up or invent/i);
    });
  });

  describe("banned 'can you afford it' phrasing and booking nudge (Cedric, 2026-10-15)", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("bans the literal phrases and names the booking nudge in each language", () => {
      expect(prompt).toContain("Kaya mo na ba?");
      expect(prompt).toContain("Kaya n'yo ba?");
      expect(prompt).toContain("Can you afford it?");
      expect(prompt).toMatch(/within your budget/i);
      expect(prompt).toMatch(/kaya ba ng budget/i);
      expect(prompt).toContain("Want me to help you book it?");
      expect(prompt).toContain("Gusto n'yo na bang i-book?");
      expect(prompt).toContain("Gusto n'yo na ga i-book?");
    });
  });

  describe("Wi-Fi and physical-access guard (Cedric, 2026-10-15)", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("bans sharing Wi-Fi/password and door/gate/lock/keybox codes, pointing to Messenger", () => {
      expect(prompt).toMatch(/Never share a Wi-Fi name\/password/i);
      expect(prompt).toMatch(/door\/gate\/lock\/keybox code/i);
      expect(prompt).toMatch(/posted inside the property/i);
      expect(prompt).toMatch(/check-in instructions/i);
      expect(prompt).toContain("https://m.me/haveninlipa");
    });
  });

  describe("early check-in/late checkout fee", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("forbids computing a total for a specific number of hours, stating only the flat rate", () => {
      expect(prompt).toMatch(/never compute a total peso amount for a specific number of hours/i);
      expect(prompt).toMatch(/always state the flat ₱200\/hour rate/i);
    });
  });

  describe("shortName + pre-resolved property context (DEC-029, 2026-10-15)", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("instructs the model to always use shortName over the raw name", () => {
      expect(prompt).toMatch(/shortName/);
      expect(prompt).toMatch(/never the raw `name` field/i);
    });

    it("instructs the model to trust a pre-resolved property context note and never claim a property is unknown", () => {
      expect(prompt).toMatch(/Context \(already resolved\/detected here/i);
      expect(prompt).toMatch(/never say a property is unknown, not in our system, or unrecognized/i);
    });
  });

  describe("btg mode", () => {
    const prompt = buildHavenSystemPrompt("btg");

    it("documents each Batangueño marker with its correct usage note", () => {
      expect(prompt).toMatch(/ala eh.*(?:filler|exclamation)/i);
      expect(prompt).toMatch(/aba'y.*(?:why|well then)/i);
      expect(prompt).toMatch(/\bga\b.*question particle/i);
      expect(prompt).toMatch(/\bnga\b.*(?:emphasis|request)/i);
      expect(prompt).toMatch(/(?:ari|are).*this\/here/i);
    });

    it("documents 'ire' alongside ari/are, and 'baga' alongside ga", () => {
      expect(prompt).toMatch(/\bire\b/);
      expect(prompt).toMatch(/\bbaga\b/);
    });

    it("warns that 'ga'/'baga' are question-only, with the 'Oo ga' misuse example", () => {
      expect(prompt).toMatch(/question particle ONLY/i);
      expect(prompt).toContain("Oo ga, may bakante");
      expect(prompt).toContain("Aba'y oo, may bakante!");
    });

    it("documents the vetted Batangueño and Filipino courtesy expression list", () => {
      expect(prompt).toContain("kapeng barako");
      expect(prompt).toContain("Tuloy po kayo");
      expect(prompt).toContain("Mabuhay");
      expect(prompt).toMatch(/at most 1–2 per reply/);
      expect(prompt).toMatch(/never profanity/i);
    });

    it("includes a placeholder-only few-shot block with no digit prices or exact calendar dates", () => {
      expect(prompt).toMatch(/placeholder/i);
      // Scoped to the few-shot block itself — the owner-approved facts that follow it in
      // the prompt legitimately state a real price (₱200/hour early check-in/late checkout).
      const fewshot = prompt.slice(prompt.indexOf("Example exchanges"), prompt.indexOf("Owner-approved facts"));
      expect(fewshot.length).toBeGreaterThan(0);
      expect(fewshot).not.toMatch(/₱\d/);
    });
  });

  // Owner rules 1 & 2, 2026-10-16: never re-question a resolved date range, never ask
  // what year.
  describe("date range confirmation / year-question rules", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("forbids re-confirming nights or re-asking which dates were meant once resolved", () => {
      expect(prompt).toMatch(/never\s+ask the guest to confirm the number of nights/i);
      expect(prompt).toMatch(/never re-ask which dates they meant/i);
      expect(prompt).toMatch(/never contradict that range/i);
    });

    it("states that a range means check-in the first date, check-out the second", () => {
      expect(prompt).toMatch(/check-in on the FIRST date and check-out on the SECOND/i);
    });

    it("forbids asking what year a guest means", () => {
      expect(prompt).toMatch(/never ask a guest what year they mean/i);
    });

    it("forbids offering or mentioning a past year as an option", () => {
      expect(prompt).toMatch(/never offer or mention a past year/i);
    });
  });

  // Owner rule, 2026-10-19: numeric dates are month-first; a single date with no
  // check-out defaults to 1 night and invites more nights; "next weekend" means the
  // Saturday after the coming one.
  describe("numeric month-first dates / single-date nudge / next weekend (Cedric, 2026-10-19)", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("states numeric dates are always month-first, never day-first", () => {
      expect(prompt).toMatch(/always month-first/i);
      expect(prompt).toMatch(/never day-first/i);
      expect(prompt).toContain('"10/24" is always October 24');
    });

    it("tells the model to trust the explicit date over a disagreeing weekday, never asking", () => {
      expect(prompt).toMatch(/trust the explicit numeric date/i);
      expect(prompt).toMatch(/never ask the guest to pick one/i);
    });

    it("instructs the single-date 1-night default and the add-more-nights invite per language", () => {
      expect(prompt).toMatch(/never ask "is that just 1 night\?"/i);
      expect(prompt).toContain("Want to add more nights? Just tell me.");
      expect(prompt).toContain("Pwede pong dagdagan ang gabi");
      expect(prompt).toContain("Pwede ga dagdagan ang gabi");
    });

    it("defines 'next weekend' as the Saturday after the coming one, 1 night", () => {
      expect(prompt).toMatch(/"next weekend" means the Saturday after the coming one/i);
      expect(prompt).toMatch(/1-night Saturday→Sunday/i);
    });
  });

  // Owner incident, 2026-10-16: Haven said "(provisional lang — tutuklasin ng tama sa
  // checkout)" — banned outright in favor of plain, conversational Tagalog/Batangueño.
  describe("plain-language rule / checkout caveat (Cedric, 2026-10-16)", () => {
    const prompt = buildHavenSystemPrompt("en");

    it("gives the standard provisional/checkout caveat per language", () => {
      expect(prompt).toContain("This is provisional — confirmed at checkout.");
      expect(prompt).toContain("Provisional lang ito, kukumpirmahin sa checkout.");
    });

    it("bans 'tutuklasin' and its forms outright, naming the plain replacement", () => {
      expect(prompt).toMatch(/never say "tutuklasin", "tuklasin", or "matutuklasan"/i);
      expect(prompt).toMatch(/banned entirely/i);
      expect(prompt).toMatch(/kukumpirmahin/i);
    });

    it("instructs plain, conversational Tagalog/Batangueño and lists the other banned deep words", () => {
      expect(prompt).toMatch(/plain, conversational Tagalog\/Batangueño/i);
      expect(prompt).toMatch(/never deep or literary Tagalog/i);
      expect(prompt).toMatch(/"sukatin"/i);
      expect(prompt).toMatch(/"manatili"/i);
      expect(prompt).toMatch(/"nawa"/i);
      expect(prompt).toMatch(/"datapwat"\/"subalit"/i);
      expect(prompt).toMatch(/"marapat"/i);
      expect(prompt).toMatch(/"pagsapit"/i);
      expect(prompt).toMatch(/"tunay na"/i);
      expect(prompt).toMatch(/"maaari"\/"maaaring"/i);
    });

    it("the Batangueño few-shot block contains none of the banned deep words", () => {
      const btgPrompt = buildHavenSystemPrompt("btg");
      const fewshot = btgPrompt.slice(btgPrompt.indexOf("Example exchanges"), btgPrompt.indexOf("Owner-approved facts"));
      expect(fewshot.length).toBeGreaterThan(0);
      expect(fewshot).not.toMatch(/tuklas|sukatin|manatili|\bnawa\b|datapwat|subalit|marapat|pagsapit|tunay\s+na|maaari/i);
    });
  });
});
