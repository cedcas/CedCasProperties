import type { ReactNode } from "react";

/**
 * Renders a small, safe subset of markdown — **bold** and newlines — as plain React
 * elements (a `<strong>` per bold run, a `<br />` per line break). Never
 * `dangerouslySetInnerHTML`, so there's no HTML-injection surface even though the source
 * text (a guest message, a stored transcript, Haven's own AI-mode reply) is untrusted.
 *
 * Shared by `ChatMessage.tsx` (the live chat bubble) and the admin Haven-chat transcript
 * viewer (`src/app/admin/haven-chats/[sessionId]/page.tsx`) — before this extraction, only
 * the live bubble parsed `**bold**`; the transcript viewer rendered stored content as a
 * raw text node, so a reply like "...via **Messenger**" showed literal asterisks there.
 */
export function renderMarkdownBold(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const paragraphs = text.split(/\n\n/);

  paragraphs.forEach((para, pi) => {
    if (pi > 0) parts.push(<br key={`br-${pi}`} />);

    const lines = para.split("\n");
    lines.forEach((line, li) => {
      if (li > 0) parts.push(<br key={`ln-${pi}-${li}`} />);

      const segments = line.split(/(\*\*[^*]+\*\*)/g);
      segments.forEach((seg, si) => {
        if (seg.startsWith("**") && seg.endsWith("**")) {
          parts.push(
            <strong key={`b-${pi}-${li}-${si}`} className="font-semibold">
              {seg.slice(2, -2)}
            </strong>
          );
        } else if (seg.length > 0) {
          parts.push(seg);
        }
      });
    });
  });

  return parts;
}
