import Link from "next/link";
import { requireAdmin } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { AdminNavigation } from "@/components/admin-navigation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <>
      <PageHeader />
      <div className="atelier-layout">
      <AdminNavigation />
      <main className="admin-shell" id="admin-content">
        <div className="admin-heading">
          <div>
            <span className="eyebrow">YEMAPE · ADMINISTRACIÓN</span>
            <h1>Tu negocio, en orden.</h1>
          </div>
          <Link href="/cuenta" className="button secondary">
            Mi cuenta
          </Link>
        </div>
        {children}
      </main>
      </div>
    </>
  );
}
