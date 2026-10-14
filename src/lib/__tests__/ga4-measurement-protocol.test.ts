import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  bookingTransactionId,
  isGa4MpEnabled,
  sendBookingConfirmedMeasurementEvent,
} from "@/lib/ga4-measurement-protocol";

describe("bookingTransactionId", () => {
  it("matches the client-side track() format (HIL-<bookingId>)", () => {
    expect(bookingTransactionId(140)).toBe("HIL-140");
  });
});

describe("isGa4MpEnabled", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("is off when GA4_MP_ENABLED is unset", () => {
    delete process.env.GA4_MP_ENABLED;
    delete process.env.GA4_MP_API_SECRET;
    expect(isGa4MpEnabled()).toBe(false);
  });

  it("is off when the flag is true but no API secret is configured", () => {
    process.env.GA4_MP_ENABLED = "true";
    delete process.env.GA4_MP_API_SECRET;
    expect(isGa4MpEnabled()).toBe(false);
  });

  it("is off when a secret exists but the flag is not exactly \"true\"", () => {
    process.env.GA4_MP_ENABLED = "1";
    process.env.GA4_MP_API_SECRET = "secret";
    expect(isGa4MpEnabled()).toBe(false);
  });

  it("is on only when both are set", () => {
    process.env.GA4_MP_ENABLED = "true";
    process.env.GA4_MP_API_SECRET = "secret";
    expect(isGa4MpEnabled()).toBe(true);
  });
});

describe("sendBookingConfirmedMeasurementEvent", () => {
  const ORIGINAL_ENV = { ...process.env };
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("never calls fetch when disabled (default/off state)", async () => {
    delete process.env.GA4_MP_ENABLED;
    delete process.env.GA4_MP_API_SECRET;
    await sendBookingConfirmedMeasurementEvent({ bookingId: 1, propertySlug: "cozy-1-bedroom", total: 5000 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to the GA4 MP endpoint with the expected event shape when enabled", async () => {
    process.env.GA4_MP_ENABLED = "true";
    process.env.GA4_MP_API_SECRET = "test-secret";
    fetchMock.mockResolvedValue({ ok: true });

    await sendBookingConfirmedMeasurementEvent({ bookingId: 140, propertySlug: "mickey-in-lipa--family-house--sleeps-11", total: 12345.6 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("https://www.google-analytics.com/mp/collect");
    expect(String(url)).toContain("measurement_id=G-2SV2PXYB7T");
    expect(String(url)).toContain("api_secret=test-secret");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string);
    expect(body.client_id).toBe("server.booking.140");
    expect(body.events).toHaveLength(1);
    expect(body.events[0].name).toBe("booking_confirmed");
    expect(body.events[0].params).toMatchObject({
      property: "mickey-in-lipa--family-house--sleeps-11",
      value: 12346, // rounded
      currency: "PHP",
      transaction_id: "HIL-140",
      event_source: "measurement_protocol",
    });
  });

  it("swallows a fetch failure rather than throwing (best-effort)", async () => {
    process.env.GA4_MP_ENABLED = "true";
    process.env.GA4_MP_API_SECRET = "test-secret";
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(
      sendBookingConfirmedMeasurementEvent({ bookingId: 2, propertySlug: "cozy-1-bedroom", total: 1000 })
    ).resolves.toBeUndefined();
  });

  it("queues a `purchase` event alongside booking_confirmed when propertyName/nights are supplied", async () => {
    process.env.GA4_MP_ENABLED = "true";
    process.env.GA4_MP_API_SECRET = "test-secret";
    fetchMock.mockResolvedValue({ ok: true });

    await sendBookingConfirmedMeasurementEvent({
      bookingId: 140,
      propertySlug: "mickey-in-lipa",
      total: 12345.6,
      propertyName: "Mickey in Lipa",
      nights: 3,
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.events).toHaveLength(2);
    expect(body.events[0].name).toBe("booking_confirmed");
    expect(body.events[1].name).toBe("purchase");
    expect(body.events[1].params).toMatchObject({
      transaction_id: "HIL-140",
      value: 12346,
      currency: "PHP",
      event_source: "measurement_protocol",
      items: [
        { item_id: "mickey-in-lipa", item_name: "Mickey in Lipa", item_category: "stay", price: 4115.2, quantity: 3 },
      ],
    });
  });

  it("omits `purchase` when propertyName/nights are not supplied (backward compatible)", async () => {
    process.env.GA4_MP_ENABLED = "true";
    process.env.GA4_MP_API_SECRET = "test-secret";
    fetchMock.mockResolvedValue({ ok: true });

    await sendBookingConfirmedMeasurementEvent({ bookingId: 141, propertySlug: "cozy-1-bedroom", total: 1000 });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].name).toBe("booking_confirmed");
  });
});
