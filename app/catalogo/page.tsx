import type { Metadata } from "next";
import { Storefront } from "@/components/storefront";
import { getAccount, getProducts } from "@/lib/data";
import { categories } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nuestra carta",
  description:
    "Descubre los postres de Yemape, arma tu carrito y coordina el pedido por WhatsApp.",
};

export default async function Catalog({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; buscar?: string }>;
}) {
  const [products, account, params] = await Promise.all([
    getProducts(),
    getAccount(),
    searchParams,
  ]);
  const category =
    categories.find((item) => item === params.categoria) ?? "Todos";
  return (
    <Storefront
      key={`${category}-${params.buscar ?? ""}`}
      view="catalog"
      initialCategory={category}
      initialQuery={
        typeof params.buscar === "string" ? params.buscar.slice(0, 100) : ""
      }
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
