import { describe, expect, it } from "vitest";
import { renderMarkdownBold } from "../render-markdown-bold";

/**
 * `renderMarkdownBold` is shared by the live chat bubble (`ChatMessage.tsx`) and the admin
 * Haven-chat transcript viewer (`src/app/admin/haven-chats/[sessionId]/page.tsx`) — before
 * this extraction, only the live bubble parsed `**bold**`; the transcript viewer rendered
 * stored content as a raw text node, so a reply like "...via **Messenger**" showed literal
 * asterisks there. These tests exercise the function directly (no DOM needed — a React
 * element is just a plain object) so both call sites stay covered by one suite.
 */

interface ReactElementLike {
  type: string;
  props: Record<string, unknown>;
}

function isElement(node: unknown): node is ReactElementLike {
  return !!node && typeof node === "object" && "type" in (node as object) && "props" in (node as object);
}

function elementsOfType(parts: unknown[], type: string): ReactElementLike[] {
  return parts.filter((p): p is ReactElementLike => isElement(p) && p.type === type);
}

describe("renderMarkdownBold", () => {
  it("renders a single bold run as a <strong> element, not literal asterisks", () => {
    const parts = renderMarkdownBold("via **Messenger**");
    expect(parts).toContain("via ");
    const bold = elementsOfType(parts, "strong");
    expect(bold).toHaveLength(1);
    expect(bold[0].props.children).toBe("Messenger");
    // No literal "**" survives anywhere in the output (string parts or bold content).
    expect(parts.some((p) => typeof p === "string" && p.includes("**"))).toBe(false);
  });

  it("renders multiple bold runs on the same line independently", () => {
    const parts = renderMarkdownBold("**Facebook** and **Instagram**");
    const bold = elementsOfType(parts, "strong").map((el) => el.props.children);
    expect(bold).toEqual(["Facebook", "Instagram"]);
  });

  it("renders every social-list bullet's bold heading (the exact failing shape)", () => {
    const text =
      "Follow us:\n\n" +
      "- **Facebook**: https://www.facebook.com/haveninlipa\n" +
      "- **Instagram**: https://www.instagram.com/haven_inlipa/\n" +
      "- **Messenger**: https://m.me/haveninlipa";
    const parts = renderMarkdownBold(text);
    const bold = elementsOfType(parts, "strong").map((el) => el.props.children);
    expect(bold).toEqual(["Facebook", "Instagram", "Messenger"]);
  });

  it("converts a double newline into exactly one paragraph break", () => {
    const parts = renderMarkdownBold("Line one\n\nLine two");
    expect(elementsOfType(parts, "br")).toHaveLength(1);
  });

  it("converts a single newline into exactly one line break", () => {
    const parts = renderMarkdownBold("Line one\nLine two");
    expect(elementsOfType(parts, "br")).toHaveLength(1);
  });

  it("leaves plain text with no markdown untouched", () => {
    expect(renderMarkdownBold("just plain text")).toEqual(["just plain text"]);
  });

  it("never emits a raw HTML string — only React elements and plain text segments", () => {
    const parts = renderMarkdownBold("**bold** and <script>alert(1)</script>");
    for (const part of parts) {
      expect(typeof part === "string" || isElement(part)).toBe(true);
    }
    // The dangerous-looking text is passed through as an inert string, never parsed as HTML.
    expect(parts).toContain(" and <script>alert(1)</script>");
  });
});
