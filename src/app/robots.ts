import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXTAUTH_URL || "https://haveninlipa.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // No trailing slash — robots.txt matching is a plain prefix, so
        // "/admin/" did NOT cover the bare "/admin". That left exactly one
        // crawlable URL on the site that is a redirect into disallowed space:
        // "/admin" 307s to "/admin/login" (src/app/admin/page.tsx +
        // src/middleware.ts), which robots then forbids Googlebot from
        // fetching — an unresolvable chain, reported in GSC as a redirect
        // error. "/admin" and "/api" as prefixes cover both forms.
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
