"use client";

import type { ChatOption } from "@/lib/chat/chat-tree";

interface ChatOptionsProps {
  options: ChatOption[];
  onSelect: (nodeId: string, label: string) => void;
}

export default function ChatOptions({ options, onSelect }: ChatOptionsProps) {
  if (!options.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3 pl-9">
      {options.map((opt) => {
        const isBack = opt.label.startsWith("←");
        return (
          <button
            key={opt.nodeId + opt.label}
            onClick={() => onSelect(opt.nodeId, opt.label)}
            className={`text-[12.5px] font-medium rounded-full px-4 py-2 transition-all duration-200 active:scale-[.97] cursor-pointer ${
              isBack
                ? "bg-charcoal/[.06] text-charcoal/50 hover:bg-charcoal/[.10] hover:text-charcoal/70"
                : "bg-forest/[.08] text-forest hover:bg-forest/[.15] border border-forest/[.12]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
