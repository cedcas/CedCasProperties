// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import BookingStatusSelect from "@/components/admin/BookingStatusSelect";

/** Rendered behaviour of the status control when the server refuses a change. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  refresh.mockClear();
});

async function choose(status: string, reply: { status: number; body: unknown }) {
  const fetchMock = vi.fn(async () => ({ ok: reply.status < 400, status: reply.status, json: async () => reply.body }));
  vi.stubGlobal("fetch", fetchMock);
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(BookingStatusSelect, { id: 9, status: "cancelled" })));
  const select = host.querySelector("select")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, status);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  return { host, select, fetchMock };
}

describe("BookingStatusSelect", () => {
  it("a refused reactivation shows why and snaps back to the real status", async () => {
    const { host, select, fetchMock } = await choose("confirmed", {
      status: 409,
      body: { error: "This booking's dates are no longer available, so it stays cancelled.", conflicts: [{ label: "Booking #12 — Ben Cruz", range: "2027-02-11 – 2027-02-13" }] },
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/bookings/9", expect.objectContaining({ method: "PUT", body: JSON.stringify({ status: "confirmed" }) }));
    expect(select.value).toBe("cancelled");
    const alert = host.querySelector('[role="alert"]')!.textContent!;
    expect(alert).toContain("stays cancelled");
    expect(alert).toContain("Booking #12 — Ben Cruz (2027-02-11 – 2027-02-13)");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("an accepted change keeps the new status and refreshes, as before", async () => {
    const { host, select } = await choose("confirmed", { status: 200, body: {} });
    expect(select.value).toBe("confirmed");
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
