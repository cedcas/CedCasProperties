"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the chat widget on admin pages.
 * Wraps ChatWidgetServer's output on the client side.
 */
export default function ChatWidgetGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}
