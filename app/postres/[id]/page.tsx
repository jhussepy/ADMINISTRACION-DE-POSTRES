import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront } from "@/components/storefront";
import { getAccount, getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = (await getProducts()).find((item) => item.id === id);
  if (!product) return { title: "Postre no disponible" };
  return {
    title: product.name,
    description: `${product.description} Descubre este postre de Yemape y coordina tu pedido por WhatsApp.`,
    alternates: { canonical: `/postres/${product.id}` },
    openGraph: {
      title: `${product.name} | Yemape`,
      description: product.description,
      type: "website",
      images: [{ url: product.image, alt: product.name }],
    },
    twitter: { card: "summary_large_image", images: [product.image] },
  };
}

export default async function ProductPage({ params }: Props) {
  const [{ id }, products, account] = await Promise.all([
    params,
    getProducts(),
    getAccount(),
  ]);
  const product = products.find((item) => item.id === id);
  if (!product) notFound();
  return (
    <Storefront
      view="product"
      product={product}
      products={products}
      account={
        account
          ? {
              name: account.profile?.full_name ?? "",
              email: account.user.email ?? "",
              profile: account.profile,
              isAdmin: account.isAdmin,
            }
          : null
      }
    />
  );
}
