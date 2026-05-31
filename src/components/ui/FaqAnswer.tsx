import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import type { FaqLink } from "@/lib/faqs";

/**
 * Renders a FAQ answer string, layering optional contextual internal links on
 * top of the plain text. Each `links` entry hyperlinks the FIRST occurrence of
 * its `phrase`; the underlying string is never mutated, so the FAQPage JSON-LD
 * (which uses the raw answer text) stays link-free. Falls back to plain text
 * when no links are supplied.
 */
export default function FaqAnswer({
  answer,
  links,
  className,
}: {
  answer: string;
  links?: FaqLink[];
  className?: string;
}) {
  if (!links || links.length === 0) {
    return <p className={className}>{answer}</p>;
  }

  const linkClass =
    "text-forest font-medium underline decoration-gold/50 underline-offset-2 hover:decoration-gold transition-colors";

  // Tokenize: start with the whole answer, then split out the first match of
  // each phrase into a Link node. Processing left-to-right keeps order and
  // guarantees first-occurrence-only linking per phrase.
  let nodes: ReactNode[] = [answer];

  links.forEach((lnk, li) => {
    let linked = false;
    const next: ReactNode[] = [];
    for (const node of nodes) {
      if (linked || typeof node !== "string") {
        next.push(node);
        continue;
      }
      const idx = node.indexOf(lnk.phrase);
      if (idx === -1) {
        next.push(node);
        continue;
      }
      const before = node.slice(0, idx);
      const after = node.slice(idx + lnk.phrase.length);
      if (before) next.push(before);
      next.push(
        lnk.href.startsWith("http") ? (
          <a
            key={`faq-link-${li}`}
            href={lnk.href}
            className={linkClass}
            target="_blank"
            rel="noopener noreferrer"
          >
            {lnk.phrase}
          </a>
        ) : (
          <Link key={`faq-link-${li}`} href={lnk.href} className={linkClass}>
            {lnk.phrase}
          </Link>
        ),
      );
      if (after) next.push(after);
      linked = true;
    }
    nodes = next;
  });

  return (
    <p className={className}>
      {nodes.map((n, i) => (
        <Fragment key={i}>{n}</Fragment>
      ))}
    </p>
  );
}
