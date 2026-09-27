import { Storefront } from "@/components/storefront";
import { getAccount, getProducts } from "@/lib/data";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [products, account] = await Promise.all([getProducts(), getAccount()]);
  return (
    <Storefront
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
