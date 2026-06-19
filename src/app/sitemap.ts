import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { getProductSlugs, getCategories } from "@/lib/data/queries";

// Refresh at runtime (daily) rather than hard-failing the build if the database
// is briefly unreachable during a Vercel deploy.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  let categoryRoutes: MetadataRoute.Sitemap = [];
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const [slugs, categories] = await Promise.all([
      getProductSlugs(),
      getCategories(),
    ]);
    categoryRoutes = categories.map((c) => ({
      url: `${SITE.url}/shop?category=${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
    productRoutes = slugs.map((slug) => ({
      url: `${SITE.url}/product/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // DB unavailable during build → ship static routes; ISR refills on next revalidate.
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
