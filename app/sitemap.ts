import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/data";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteUrl();
  const products = await getProducts();
  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/catalogo`, changeFrequency: "weekly", priority: 0.9 },
    ...products.map((product) => ({
      url: `${origin}/postres/${product.id}`,
      images: [`${origin}${product.image}`],
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
