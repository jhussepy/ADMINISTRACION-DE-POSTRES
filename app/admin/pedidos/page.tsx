import Link from "next/link";
import { requireAdmin } from "@/lib/data";
import { OrderForm, OrderUpdateForm } from "@/components/admin-forms";
import type { Order } from "@/lib/types";
import { orderStatuses } from "@/lib/types";
import { money } from "@/lib/cart";
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const db = await requireAdmin();
  const params = await searchParams;
  let query = db
    .from("orders")
    .select("*")
    .order("delivery_date", { ascending: false })
    .limit(100);
  if (orderStatuses.some((s) => s === params.estado))
    query = query.eq("status", params.estado!);
  const { data, error } = await query;
  if (error) throw new Error("No se pudieron cargar los pedidos.");
  const orders = data as Order[];
  return (
    <>
      <p className="subtle" style={{ marginBottom: 24 }}>
        Registra aquí los pedidos coordinados por WhatsApp. La apertura del chat
        no crea un pedido automáticamente.
      </p>
      <div className="admin-grid">
        <section className="panel">
          <h2>Registrar pedido</h2>
          <OrderForm />
        </section>
        <section className="admin-list">
          <nav className="admin-nav" aria-label="Filtrar pedidos">
            <Link href="/admin/pedidos">Todos</Link>
            {orderStatuses.map((s) => (
              <Link
                key={s}
                href={`/admin/pedidos?estado=${encodeURIComponent(s)}`}
              >
                {s}
              </Link>
            ))}
          </nav>
          <p className="subtle">
            Hasta 100 pedidos por vista, ordenados por fecha de entrega.
          </p>
          {orders.length ? (
            orders.map((o) => (
              <article className="admin-row" key={o.id}>
                <div className="admin-row-head">
                  <h3>{o.customer_name}</h3>
                  <span className="badge">{o.status}</span>
                </div>
                <p>
                  {o.delivery_date.split("-").reverse().join("/")} ·{" "}
                  {o.customer_phone}
                </p>
                <p style={{ whiteSpace: "pre-wrap" }}>{o.details}</p>
                <p>
                  Total: {money(o.total_cents)} · Abonado:{" "}
                  {money(o.deposit_cents)} · Saldo:{" "}
                  {money(o.total_cents - o.deposit_cents)}
                </p>
                <OrderUpdateForm
                  key={`${o.id}-${o.status}-${o.deposit_cents}`}
                  order={o}
                />
              </article>
            ))
          ) : (
            <div className="empty-state">
              <h3>No hay pedidos en esta vista</h3>
              <p>Cuando coordines el primero, regístralo con el formulario.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
