import type { Metadata } from "next";
import { Suspense } from "react";
import { getChatTree } from "@/lib/chat/get-chat-tree";
import { havenAiActive } from "@/lib/haven/config";
import ChatWidget from "@/components/chat/ChatWidget";

/**
 * Chat-only route for the blog embed (haven-chat-usage-2026-11-09.md #5): loaded inside an
 * iframe on blog.haveninlipa.com by /public/haven-embed.js, never visited directly by a
 * guest. Reuses the exact same ChatWidget as the site's own FAB widget — `embedded` just
 * changes layout (always open, fills the iframe, no FAB/greeting) and `chatSurface="blog"`
 * tags every GA4 event so blog chats are counted separately from the main site.
 *
 * Framed only from blog.haveninlipa.com — see the `/embed/haven`-scoped CSP override in
 * next.config.ts (`frame-ancestors`). `/api/haven/chat` is same-origin from inside the
 * iframe (this page is served from haveninlipa.com itself), so no CORS wiring is needed.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ask Haven",
  robots: { index: false, follow: false },
};

export default async function HavenEmbedPage() {
  const tree = await getChatTree();
  return (
    <Suspense fallback={null}>
      <ChatWidget tree={tree} aiEnabled={havenAiActive()} chatSurface="blog" embedded />
    </Suspense>
  );
}
