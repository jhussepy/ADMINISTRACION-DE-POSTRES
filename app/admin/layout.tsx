import Link from "next/link";
import { requireAdmin } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
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
      <main className="admin-shell">
        <div className="admin-heading">
          <div>
            <span className="eyebrow">YEMAPE · ADMINISTRACIÓN</span>
            <h1>Tu negocio, en orden.</h1>
          </div>
          <Link href="/cuenta" className="button secondary">
            Mi cuenta
          </Link>
        </div>
        <nav className="admin-nav" aria-label="Administración">
          <Link href="/admin">Resumen</Link>
          <Link href="/admin/productos">Productos</Link>
          <Link href="/admin/pedidos">Pedidos</Link>
          <Link href="/admin/pagos">Pagos</Link>
          <Link href="/admin/clientes">Clientes</Link>
          <Link href="/admin/calendario">Calendario</Link>
        </nav>
        {children}
      </main>
    </>
  );
}
