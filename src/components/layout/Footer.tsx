import Image from "next/image";
import Link from "next/link";

type WpPost = {
  id: number;
  link: string;
  title: { rendered: string };
  meta: { _yoast_wpseo_focuskw?: string };
};

type BlogLink = { label: string; href: string };

const STATIC_BLOG_LINKS: BlogLink[] = [
  { label: "15 Things to Do in Lipa",    href: "https://blog.haveninlipa.com/15-best-things-to-do-in-lipa-city-batangas-2026-locals-guide/" },
  { label: "Best Restaurants in Lipa",   href: "https://blog.haveninlipa.com/best-restaurants-cafes-in-lipa-city-batangas-2026-food-guide/" },
  { label: "Mt. Maculot Hiking Guide",   href: "https://blog.haveninlipa.com/mt-maculot-hiking-guide-2026-trail-tips-routes-where-to-stay-in-lipa/" },
  { label: "Taal Volcano Day Trip",      href: "https://blog.haveninlipa.com/taal-volcano-day-trip-from-lipa-city-2026-updated-guide/" },
  { label: "Why Book Direct vs. Airbnb", href: "https://blog.haveninlipa.com/why-book-direct-instead-of-airbnb-a-philippines-hosts-honest-take/" },
];

const TITLE_CASE_SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in",
  "nor", "of", "on", "or", "so", "the", "to", "vs", "via", "with", "yet",
]);

function titleCase(s: string): string {
  const words = s.trim().toLowerCase().split(/\s+/);
  return words
    .map((w, i) => {
      if (i !== 0 && i !== words.length - 1 && TITLE_CASE_SMALL_WORDS.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

async function getBlogLinks(): Promise<BlogLink[]> {
  try {
    const res = await fetch(
      "https://blog.haveninlipa.com/wp-json/wp/v2/posts?per_page=5&_fields=id,link,title,meta",
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error(`WP ${res.status}`);
    const posts: WpPost[] = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) throw new Error("empty");
    return posts.map((p) => {
      const focuskw = p.meta?._yoast_wpseo_focuskw?.trim();
      const label = focuskw ? titleCase(focuskw) : decodeEntities(p.title.rendered).trim();
      return { label, href: p.link };
    });
  } catch {
    return STATIC_BLOG_LINKS;
  }
}

export default async function Footer() {
  const blogLinks = await getBlogLinks();
  return (
    <footer className="bg-[#1c1c1c] pt-[72px]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-14 pb-16 border-b border-white/[.08]">

          {/* Brand */}
          <div>
            <div className="mb-5">
              <Image
                src="/brand-assets/Transparent Logo.png"
                alt="HavenInLipa"
                width={100}
                height={100}
                className="h-[52px] w-auto"
              />
            </div>
            <p className="text-[14px] text-white/70 leading-[1.75] max-w-[280px]">
              Thoughtfully managed short-term rentals in Lipa City, Batangas — designed for families, travelers, and professionals.
            </p>
            <span className="inline-block mt-3 text-[12px] italic text-[#FF5371]">&ldquo;Stay in Style, Live in Comfort.&rdquo;</span>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-serif font-semibold text-white text-[1rem] mb-5 pb-3 border-b border-white/[.08] relative">
              Quick Links
              <span className="absolute bottom-[-1px] left-0 w-7 h-0.5 bg-[#FF5371] rounded" />
            </h3>
            <ul className="flex flex-col gap-3">
              {[
                ["Our Properties", "/#properties", false],
                ["About Us",       "/about",       false],
                ["Location",       "/#location",   false],
                ["Guest Reviews",  "/#testimonials", false],
                ["FAQ",            "/faq",         false],
                ["Contact Us",     "/#contact",    false],
                ["Book a Stay",    "/#cta",        false],
              ].map(([label, href, external]) => (
                <li key={label as string}>
                  <Link href={href as string} className="text-[14px] text-white/70 hover:text-[#FF5371] transition-colors duration-200" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Plan your trip — blog links for SEO authority distribution */}
          <div>
            <h3 className="font-serif font-semibold text-white text-[1rem] mb-5 pb-3 border-b border-white/[.08] relative">
              Plan Your Trip
              <span className="absolute bottom-[-1px] left-0 w-7 h-0.5 bg-[#FF5371] rounded" />
            </h3>
            <ul className="flex flex-col gap-3">
              {[
                ...blogLinks,
                { label: "Visit the Blog", href: "https://blog.haveninlipa.com" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] text-white/70 hover:text-[#FF5371] transition-colors duration-200"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-serif font-semibold text-white text-[1rem] mb-5 pb-3 border-b border-white/[.08] relative">
              Get in Touch
              <span className="absolute bottom-[-1px] left-0 w-7 h-0.5 bg-[#FF5371] rounded" />
            </h3>
            <div className="flex flex-col gap-4 text-[13.5px] text-white/70">
              <div className="flex gap-3 items-start">
                <i className="fa-solid fa-location-dot text-[#FF5371] text-[14px] mt-0.5 flex-shrink-0" />
                <span>Lipa City, Batangas<br />Philippines</span>
              </div>
              <div className="flex gap-3 items-center">
                <i className="fa-solid fa-phone text-[#FF5371] text-[14px] flex-shrink-0" />
                <a href="tel:+639066554415" className="hover:text-[#FF5371] transition-colors">+63 906 655 4415</a>
              </div>
              <div className="flex gap-3 items-center">
                <i className="fa-solid fa-envelope text-[#FF5371] text-[14px] flex-shrink-0" />
                <a href="mailto:customerservice@haveninlipa.com" className="hover:text-[#FF5371] transition-colors break-all">
                  customerservice@haveninlipa.com
                </a>
              </div>
            </div>
          </div>

        </div>

        <div className="py-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-white/55">&copy; {new Date().getFullYear()} HavenInLipa. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-[12.5px] text-white/55 hover:text-white/85 transition-colors duration-200">Privacy Policy</Link>
            <Link href="/terms" className="text-[12.5px] text-white/55 hover:text-white/85 transition-colors duration-200">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
