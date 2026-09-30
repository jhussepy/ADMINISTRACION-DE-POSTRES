import Link from "next/link";
import { requireAdmin } from "@/lib/data";
import { OrderForm, OrderUpdateForm } from "@/components/admin-forms";
import type { Order } from "@/lib/types";
import { orderStatuses } from "@/lib/types";
import { money } from "@/lib/cart";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; cotizacion?: string }>;
}) {
  const db = await requireAdmin();
  const params = await searchParams;
  let query = db
    .from("orders")
    .select(
      "*,order_items(id,order_id,position,product_id,product_name,variant_key,variant_label,quantity,unit_price_cents,line_total_cents,quote_required,created_at)",
    )
    .order("delivery_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (orderStatuses.some((status) => status === params.estado))
    query = query.eq("status", params.estado!);
  if (params.cotizacion === "pendiente")
    query = query.eq("quote_required", true);

  const { data, error } = await query;
  if (error) throw new Error("No se pudieron cargar los pedidos.");

  const orders = (data ?? []) as Order[];

  return (
    <>
      <div className="orders-v2-intro">
        <div>
          <span className="eyebrow">PEDIDOS V2</span>
          <h2>Solicitudes web y pedidos manuales, juntos.</h2>
          <p>
            Las solicitudes finalizadas desde la tienda aparecen aquí
            automáticamente antes de abrir WhatsApp.
          </p>
        </div>
        <span className="badge">{orders.length} en esta vista</span>
      </div>

      <div className="admin-grid orders-v2-grid">
        <section className="panel">
          <h2>Registrar pedido manual</h2>
          <p className="subtle">
            Úsalo para pedidos que lleguen por teléfono, Instagram o WhatsApp
            fuera del checkout de la web.
          </p>
          <OrderForm />
        </section>

        <section className="admin-list">
          <nav className="admin-nav orders-filter" aria-label="Filtrar pedidos">
            <Link href="/admin/pedidos">Todos</Link>
            <Link href="/admin/pedidos?cotizacion=pendiente">
              Cotización pendiente
            </Link>
            {orderStatuses.map((status) => (
              <Link
                key={status}
                href={"/admin/pedidos?estado=" + encodeURIComponent(status)}
              >
                {status}
              </Link>
            ))}
          </nav>

          <p className="subtle">
            Hasta 100 pedidos por vista, ordenados por fecha de entrega.
          </p>

          {orders.length ? (
            orders.map((order) => (
              <article
                className={
                  "admin-row order-v2-card " +
                  (order.status === "Nuevo" ? "is-new-order" : "")
                }
                key={order.id}
              >
                <div className="admin-row-head">
                  <div>
                    <span className="order-code">
                      {order.public_code || "Código pendiente"}
                    </span>
                    <h3>{order.customer_name}</h3>
                  </div>
                  <div className="order-badges">
                    <span className="badge">{order.status}</span>
                    <span
                      className={
                        "badge " +
                        (order.source === "web" ? "web-order" : "inactive")
                      }
                    >
                      {order.source === "web" ? "Web" : "Manual"}
                    </span>
                  </div>
                </div>

                <p>
                  Entrega: {order.delivery_date.split("-").reverse().join("/")} ·{" "}
                  {order.customer_phone}
                </p>

                {order.order_items?.length ? (
                  <ul className="order-mini-items">
                    {order.order_items
                      .slice()
                      .sort((a, b) => a.position - b.position)
                      .slice(0, 3)
                      .map((item) => (
                        <li key={item.id}>
                          {item.quantity} × {item.product_name} ·{" "}
                          {item.variant_label}
                        </li>
                      ))}
                    {order.order_items.length > 3 && (
                      <li>+ {order.order_items.length - 3} líneas más</li>
                    )}
                  </ul>
                ) : (
                  <p style={{ whiteSpace: "pre-wrap" }}>{order.details}</p>
                )}

                <div className="order-money-row">
                  <span>
                    {order.quote_required
                      ? "Parcial registrado: " +
                        money(order.total_cents) +
                        " + por cotizar"
                      : "Total: " + money(order.total_cents)}
                  </span>
                  <span>Abonado: {money(order.deposit_cents)}</span>
                  <strong>
                    Saldo: {money(order.total_cents - order.deposit_cents)}
                  </strong>
                </div>

                {order.quote_required && (
                  <p className="order-quote-warning">
                    Hay productos cuyo precio debe confirmarse.
                  </p>
                )}

                <div className="order-v2-actions">
                  <Link
                    className="button secondary"
                    href={"/admin/pedidos/" + order.id}
                  >
                    Ver pedido completo
                  </Link>
                </div>

                <OrderUpdateForm
                  key={order.id + "-" + order.status + "-" + order.deposit_cents}
                  order={order}
                />
              </article>
            ))
          ) : (
            <div className="empty-state">
              <h3>No hay pedidos en esta vista</h3>
              <p>
                Las solicitudes de la tienda aparecerán aquí automáticamente.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
