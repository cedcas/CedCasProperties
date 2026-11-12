"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Hides the chat widget on /admin pages, and defers its mount until the
 * browser is idle so it doesn't contribute to LCP/TBT on first paint.
 */
export default function ChatWidgetGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(() => setReady(true), { timeout: 2500 });
    } else {
      timeoutId = setTimeout(() => setReady(true), 1500);
    }
    return () => {
      if (idleId !== undefined && typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  // /embed/haven is the blog-embed iframe's own chat-only page — it renders its own
  // always-open ChatWidget directly (embedded=true), so the site's idle-mounted
  // FAB widget must not also mount inside that iframe.
  if (pathname.startsWith("/admin") || pathname.startsWith("/embed")) return null;
  if (!ready) return null;
  return <>{children}</>;
}
