import { Storefront } from "@/components/storefront";
import { getAccount, getProducts } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" } };
export const dynamic = "force-dynamic";
export default async function Home() {
  const [products, account] = await Promise.all([getProducts(), getAccount()]);
  return (
    <Storefront
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
