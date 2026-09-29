import type { Metadata } from "next";
import { Storefront } from "@/components/storefront";
import { getAccount, getProducts } from "@/lib/data";
import { categories } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nuestra carta",
  description:
    "Descubre los postres de Yemape, arma tu carrito y coordina el pedido por WhatsApp.",
  alternates: { canonical: "/catalogo" },
};

export default async function Catalog({
  searchParams,
}: {
  searchParams: Promise<{
    categoria?: string;
    buscar?: string;
    orden?: string;
  }>;
}) {
  const [products, account, params] = await Promise.all([
    getProducts(),
    getAccount(),
    searchParams,
  ]);
  const category =
    categories.find((item) => item === params.categoria) ?? "Todos";
  const sort =
    params.orden === "price-asc" ||
    params.orden === "price-desc" ||
    params.orden === "name"
      ? params.orden
      : "recommended";
  return (
    <Storefront
      key={`${category}-${params.buscar ?? ""}-${sort}`}
      view="catalog"
      initialCategory={category}
      initialQuery={
        typeof params.buscar === "string" ? params.buscar.slice(0, 100) : ""
      }
      initialSort={sort}
      products={products}
      account={
        account
          ? {
              name: account.profile?.full_name ?? account.name ?? "",
              email: account.email,
              profile: account.profile,
              isAdmin: account.isAdmin,
            }
          : null
      }
    />
  );
}
