"use client";

interface ChatMessageProps {
  role: "haven" | "user";
  text: string;
  /** Set only for a haven message that came from the AI — gets the distinct "Haven" styling. */
  mode?: "ai";
}

/** Render simple markdown: **bold** and newlines */
function renderMarkdown(text: string) {
  const parts: React.ReactNode[] = [];
  // Split by double newline for paragraphs, then handle bold + line breaks
  const paragraphs = text.split(/\n\n/);

  paragraphs.forEach((para, pi) => {
    if (pi > 0) parts.push(<br key={`br-${pi}`} />);

    const lines = para.split("\n");
    lines.forEach((line, li) => {
      if (li > 0) parts.push(<br key={`ln-${pi}-${li}`} />);

      // Split on **bold** markers
      const segments = line.split(/(\*\*[^*]+\*\*)/g);
      segments.forEach((seg, si) => {
        if (seg.startsWith("**") && seg.endsWith("**")) {
          parts.push(
            <strong key={`b-${pi}-${li}-${si}`} className="font-semibold">
              {seg.slice(2, -2)}
            </strong>
          );
        } else {
          parts.push(seg);
        }
      });
    });
  });

  return parts;
}

export default function ChatMessage({ role, text, mode }: ChatMessageProps) {
  const isHaven = role === "haven";
  const isAiReply = isHaven && mode === "ai";

  return (
    <div className={`flex ${isHaven ? "justify-start" : "justify-end"} mb-3`}>
      {isHaven && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-forest flex items-center justify-center mr-2 mt-0.5">
          <i className="fa-solid fa-leaf text-white text-[11px]" />
        </div>
      )}
      {isAiReply ? (
        // Distinct from a static-tree reply (bg-white below): brand cream bubble with a
        // "Haven" label. Text stays charcoal rather than forest — forest-on-cream falls
        // short of WCAG AA for this bubble's size, charcoal-on-cream clears it comfortably.
        <div className="max-w-[85%] flex flex-col">
          <span className="text-[10px] font-semibold text-charcoal/55 mb-1 pl-1">Haven</span>
          <div className="rounded-[14px] px-4 py-3 text-[13.5px] leading-[1.7] bg-cream text-charcoal/80 border border-forest/20 shadow-[0_1px_4px_rgba(0,0,0,.04)]">
            {renderMarkdown(text)}
          </div>
        </div>
      ) : (
        <div
          className={`max-w-[85%] rounded-[14px] px-4 py-3 text-[13.5px] leading-[1.7] ${
            isHaven
              ? "bg-white text-charcoal/80 border border-black/[.06] shadow-[0_1px_4px_rgba(0,0,0,.04)]"
              : "bg-forest text-white"
          }`}
        >
          {renderMarkdown(text)}
        </div>
      )}
    </div>
  );
}
