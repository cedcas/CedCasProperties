"use client";
import { useEffect, useState } from "react";
import { manilaTodayKey } from "@/lib/dates";

/**
 * The earliest check-in a guest can pick for a listing (`YYYY-MM-DD`), for a date
 * picker's `min`. Starts at today in Lipa and is replaced by the server's answer, which
 * also knows the listing's advance notice and same-day cutoff. It depends on the time of
 * day, so it is fetched, never rendered into a cached page (DEC-005). The server still
 * checks every date — this only keeps the picker from offering one it would refuse.
 */
export function useEarliestCheckIn(slug: string): string {
  const [earliest, setEarliest] = useState(() => manilaTodayKey());

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/availability/${slug}?earliest=1`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.earliestCheckIn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.earliestCheckIn)) {
          setEarliest(data.earliestCheckIn);
        }
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [slug]);

  return earliest;
}
