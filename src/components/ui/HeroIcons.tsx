// Inline SVG icons used in the Hero (above-the-fold) so the homepage's LCP
// region doesn't have to wait for Font Awesome's woff2 files (~289 KB) to
// render. The rest of the page continues to use Font Awesome.
//
// Sizing: each icon picks up the parent's `font-size` via `1em` width/height,
// so the original `text-[15px]` etc. utility classes still control size.
// Color picks up `currentColor`.

type IconProps = { className?: string; style?: React.CSSProperties };

const svgProps = {
  width: "1em",
  height: "1em",
  viewBox: "0 0 24 24",
  fill: "currentColor",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true as const,
};

export function IconHouse(props: IconProps) {
  return (
    <svg {...svgProps} {...props}>
      <path d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3L12 3z" />
    </svg>
  );
}

export function IconCircleInfo(props: IconProps) {
  return (
    <svg {...svgProps} {...props}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...svgProps} {...props}>
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm0 2c-1.4 0-2.6.3-3.6.8 1.4 1.1 2.1 2.5 2.1 4.2v2H23v-2c0-3-4-5-6-5zM9 13c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z" />
    </svg>
  );
}

export function IconStar(props: IconProps) {
  return (
    <svg {...svgProps} {...props}>
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8l-6.2 3.3L7 14.2 2 9.3l6.9-1L12 2z" />
    </svg>
  );
}

export function IconComment(props: IconProps) {
  return (
    <svg {...svgProps} {...props}>
      <path d="M3 3h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7l-4 4V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}

export function IconAward(props: IconProps) {
  return (
    <svg {...svgProps} {...props}>
      <path d="M12 2a6 6 0 0 0-3.5 10.9L7 22l5-3 5 3-1.5-9.1A6 6 0 0 0 12 2zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...svgProps} {...props}>
      <path d="m7.4 8.6 4.6 4.6 4.6-4.6L18 10l-6 6-6-6 1.4-1.4z" />
    </svg>
  );
}
