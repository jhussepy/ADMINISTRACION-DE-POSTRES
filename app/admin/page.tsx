import Link from "next/link";
import { requireAdmin } from "@/lib/data";
import { money, limaToday } from "@/lib/cart";
export default async function AdminPage() {
  const db = await requireAdmin();
  const { data: summary, error } = await db.rpc("admin_summary", {
    today: limaToday(),
  });
  if (error || !summary) throw new Error("No se pudo cargar el resumen.");
  return (
    <>
      <div className="stats">
        <div className="stat">
          <span>Productos visibles</span>
          <strong>{summary.products}</strong>
        </div>
        <div className="stat">
          <span>Pedidos por atender</span>
          <strong>{summary.pending}</strong>
        </div>
        <div className="stat">
          <span>Saldo por cobrar</span>
          <strong>{money(summary.outstanding)}</strong>
        </div>
      </div>
      <div className="panel">
        <h2>Hoy en Yemape</h2>
        <p>{summary.today} pedidos por entregar hoy.</p>
        <p className="subtle">
          Este resumen incluye los pedidos que registraste aquí. Los mensajes de
          WhatsApp no se importan automáticamente.
        </p>
        <Link href="/admin/pedidos" className="text-link">
          Organizar mis pedidos →
        </Link>
      </div>
    </>
  );
}
