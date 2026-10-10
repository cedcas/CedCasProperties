import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { subscribeToReach, resolveTagUuids, REACH_BASE_TAG_UUID, REACH_ENDPOINT } from "@/lib/hostinger-reach";

const ORIGINAL_ENV = { ...process.env };
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const SUBJECT = { email: "guest@example.com", firstName: "Juan", phone: "+639171234567", note: "source=site:newsletter-page", source: "site:newsletter-page" as const };

describe("resolveTagUuids", () => {
  it("always includes the base tag", () => {
    delete process.env.HOSTINGER_REACH_TAG_NEWSLETTER_PAGE;
    expect(resolveTagUuids("site:newsletter-page")).toEqual([REACH_BASE_TAG_UUID]);
  });

  it("appends the matching per-source tag only when its env var is set", () => {
    process.env.HOSTINGER_REACH_TAG_FOOTER = "tag-footer-uuid";
    expect(resolveTagUuids("site:footer")).toEqual([REACH_BASE_TAG_UUID, "tag-footer-uuid"]);
    expect(resolveTagUuids("site:homepage")).toEqual([REACH_BASE_TAG_UUID]);
  });
});

describe("subscribeToReach", () => {
  it("returns 503 without calling fetch when the API token is missing, and never logs it", async () => {
    delete process.env.HOSTINGER_REACH_API_TOKEN;
    const result = await subscribeToReach(SUBJECT);
    expect(result).toEqual({ ok: false, status: 503, message: "Signups are temporarily unavailable. Please try again later." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the expected request shape with the token only in the Authorization header", async () => {
    process.env.HOSTINGER_REACH_API_TOKEN = "secret-token-xyz";
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    const result = await subscribeToReach(SUBJECT);

    expect(result).toEqual({ ok: true, alreadySubscribed: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(REACH_ENDPOINT);
    expect(init.headers.Authorization).toBe("Bearer secret-token-xyz");
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      email: "guest@example.com",
      name: "Juan",
      phone: "+639171234567",
      tag_uuids: [REACH_BASE_TAG_UUID],
      note: "source=site:newsletter-page",
    });
  });

  it("omits name/phone from the body when not provided", async () => {
    process.env.HOSTINGER_REACH_API_TOKEN = "secret-token-xyz";
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await subscribeToReach({ ...SUBJECT, firstName: null, phone: null });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.name).toBeUndefined();
    expect(body.phone).toBeUndefined();
  });

  it("treats a 409 conflict as a friendly success", async () => {
    process.env.HOSTINGER_REACH_API_TOKEN = "t";
    fetchMock.mockResolvedValue({ ok: false, status: 409, json: async () => ({ message: "Conflict" }) });
    expect(await subscribeToReach(SUBJECT)).toEqual({ ok: true, alreadySubscribed: true });
  });

  it("treats a 422 whose message mentions already/exists/taken as a friendly success", async () => {
    process.env.HOSTINGER_REACH_API_TOKEN = "t";
    for (const message of ["Email has already been taken", "Contact already exists", "This email already exists"]) {
      fetchMock.mockResolvedValue({ ok: false, status: 422, json: async () => ({ message }) });
      expect(await subscribeToReach(SUBJECT), message).toEqual({ ok: true, alreadySubscribed: true });
    }
  });

  it("treats an unrelated 422 as an upstream error, not a duplicate", async () => {
    process.env.HOSTINGER_REACH_API_TOKEN = "t";
    fetchMock.mockResolvedValue({ ok: false, status: 422, json: async () => ({ message: "Invalid email format" }) });
    const result = await subscribeToReach(SUBJECT);
    expect(result.ok).toBe(false);
    expect((result as { status: number }).status).toBe(502);
  });

  it("maps a 500 upstream error to 502 with a friendly message, never the upstream body", async () => {
    process.env.HOSTINGER_REACH_API_TOKEN = "t";
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ message: "super secret stack trace" }) });
    const result = await subscribeToReach(SUBJECT);
    expect(result).toEqual({ ok: false, status: 502, message: "We couldn't complete your signup right now. Please try again later." });
  });

  it("maps a network failure/timeout to 502", async () => {
    process.env.HOSTINGER_REACH_API_TOKEN = "t";
    fetchMock.mockRejectedValue(new Error("aborted"));
    const result = await subscribeToReach(SUBJECT);
    expect(result).toEqual({ ok: false, status: 502, message: "We couldn't complete your signup right now. Please try again later." });
  });

  it("never logs the token", async () => {
    process.env.HOSTINGER_REACH_API_TOKEN = "super-secret-token";
    fetchMock.mockRejectedValue(new Error("boom"));
    await subscribeToReach(SUBJECT);
    const warnCalls = vi.mocked(console.warn).mock.calls.flat();
    const errorCalls = vi.mocked(console.error).mock.calls.flat();
    for (const call of [...warnCalls, ...errorCalls]) {
      expect(String(call)).not.toContain("super-secret-token");
    }
  });
});
