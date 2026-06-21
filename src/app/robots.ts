import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / non-public areas kept out of search results.
      disallow: ["/admin", "/account", "/checkout", "/cart", "/wishlist", "/order/", "/api/"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
