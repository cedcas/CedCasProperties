/**
 * POST /api/newsletter — the Reach client is mocked (no real network call per the
 * task's constraint); this exercises validation, the honeypot, rate limiting, and the
 * response shapes for each outcome.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const reach = vi.hoisted(() => ({ subscribeToReach: vi.fn() }));
vi.mock("@/lib/hostinger-reach", () => reach);

import { POST } from "@/app/api/newsletter/route";

const call = (body: unknown, ip = "203.0.113.5") =>
  POST(
    new Request("http://localhost/api/newsletter", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }) as unknown as NextRequest
  );

beforeEach(() => {
  vi.clearAllMocks();
  reach.subscribeToReach.mockResolvedValue({ ok: true, alreadySubscribed: false });
});

describe("validation", () => {
  it("400s on a missing/invalid email and never calls Reach", async () => {
    for (const email of [undefined, "", "not-an-email"]) {
      const res = await call({ email, source: "site:newsletter-page" }, "203.0.113.10");
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ ok: false, field: "email", error: expect.any(String) });
    }
    expect(reach.subscribeToReach).not.toHaveBeenCalled();
  });

  it("400s on an invalid optional phone", async () => {
    const res = await call({ email: "guest@example.com", phone: "not a phone" }, "203.0.113.11");
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe("phone");
  });

  it("400s on an oversized first name", async () => {
    const res = await call({ email: "guest@example.com", firstName: "a".repeat(51) }, "203.0.113.12");
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe("firstName");
  });

  it("400s on an unparseable JSON body", async () => {
    const res = await call("not json", "203.0.113.13");
    expect(res.status).toBe(400);
  });
});

describe("honeypot", () => {
  it("returns the normal success shape without calling Reach when the honeypot is filled", async () => {
    const res = await call({ email: "bot@example.com", company: "Acme Corp" }, "203.0.113.20");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, alreadySubscribed: false });
    expect(reach.subscribeToReach).not.toHaveBeenCalled();
  });

  it("proceeds normally when the honeypot is empty", async () => {
    await call({ email: "guest@example.com", company: "" }, "203.0.113.21");
    expect(reach.subscribeToReach).toHaveBeenCalledTimes(1);
  });
});

describe("rate limiting", () => {
  it("429s after 5 requests from the same IP within the window", async () => {
    const ip = "203.0.113.30";
    for (let i = 0; i < 5; i++) {
      const res = await call({ email: `guest${i}@example.com` }, ip);
      expect(res.status).toBe(200);
    }
    const sixth = await call({ email: "guest6@example.com" }, ip);
    expect(sixth.status).toBe(429);
    expect(reach.subscribeToReach).toHaveBeenCalledTimes(5);
  });

  it("a different IP is unaffected by another IP's rate limit", async () => {
    const res = await call({ email: "fresh@example.com" }, "203.0.113.31");
    expect(res.status).toBe(200);
  });
});

describe("success / duplicate / upstream outcomes", () => {
  it("200s with a thanks message on a fresh subscribe", async () => {
    reach.subscribeToReach.mockResolvedValue({ ok: true, alreadySubscribed: false });
    const res = await call({ email: "guest@example.com", source: "site:homepage" }, "203.0.113.40");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, alreadySubscribed: false, message: "Thanks for subscribing!" });
  });

  it("200s with a friendly already-subscribed message on a duplicate", async () => {
    reach.subscribeToReach.mockResolvedValue({ ok: true, alreadySubscribed: true });
    const res = await call({ email: "guest@example.com" }, "203.0.113.41");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      alreadySubscribed: true,
      message: "You're already on the list — thanks!",
    });
  });

  it("503s when Reach reports the token is missing, without echoing internals", async () => {
    reach.subscribeToReach.mockResolvedValue({ ok: false, status: 503, message: "Signups are temporarily unavailable. Please try again later." });
    const res = await call({ email: "guest@example.com" }, "203.0.113.42");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "Signups are temporarily unavailable. Please try again later." });
  });

  it("502s on an upstream failure/timeout", async () => {
    reach.subscribeToReach.mockResolvedValue({ ok: false, status: 502, message: "We couldn't complete your signup right now. Please try again later." });
    const res = await call({ email: "guest@example.com" }, "203.0.113.43");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "We couldn't complete your signup right now. Please try again later." });
  });

  it("never includes anything resembling a token/secret in the response body", async () => {
    reach.subscribeToReach.mockResolvedValue({ ok: true, alreadySubscribed: false });
    const res = await call({ email: "guest@example.com" }, "203.0.113.44");
    const text = await res.text();
    expect(text.toLowerCase()).not.toMatch(/token|secret|bearer/);
  });
});

describe("source and UTM passthrough to the Reach client", () => {
  it("defaults source, whitelists UTM, and builds note with the page", async () => {
    await call(
      {
        email: "guest@example.com",
        source: "site:footer",
        utm: { utm_source: "sms", utm_medium: "text", bogus: "x" },
        page: "/newsletter",
      },
      "203.0.113.50"
    );
    expect(reach.subscribeToReach).toHaveBeenCalledWith({
      email: "guest@example.com",
      firstName: null,
      phone: null,
      note: "source=site:footer; utm_source=sms; utm_medium=text; page=/newsletter",
      source: "site:footer",
    });
  });
});
