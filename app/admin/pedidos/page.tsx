import Link from "next/link";
import { requireAdmin } from "@/lib/data";
import { OrderAdvanceForm } from "@/components/admin-forms";
import type { Order } from "@/lib/types";
import { orderStatuses } from "@/lib/types";
import { money } from "@/lib/cart";
import { safeCrmSearch } from "@/lib/crm";
import {
  customerWhatsappNumber,
  orderStatusWhatsappMessage,
} from "@/lib/order-progress";
import { siteUrl } from "@/lib/site-url";
import { MessageCircle, Plus, Search } from "lucide-react";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string;
    cotizacion?: string;
    vista?: string;
    q?: string;
  }>;
}) {
  const db = await requireAdmin();
  const params = await searchParams;
  const search = safeCrmSearch(params.q);
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
  else if (params.vista === "atencion")
    query = query.in("status", ["Nuevo", "Por confirmar"]);
  else if (params.vista === "curso")
    query = query.in("status", ["Confirmado", "En preparación"]);
  else if (params.vista === "listos") query = query.eq("status", "Listo");
  else if (params.vista === "finalizados")
    query = query.in("status", ["Entregado", "Cancelado"]);
  if (params.cotizacion === "pendiente" || params.vista === "cotizar")
    query = query.eq("quote_required", true);
  if (search)
    query = query.or(
      [
        `public_code.ilike.%${search}%`,
        `customer_name.ilike.%${search}%`,
        `customer_phone.ilike.%${search}%`,
      ].join(","),
    );

  const [ordersResult, trackingResult] = await Promise.all([
    query,
    db.from("orders").select("tracking_token").limit(1),
  ]);
  const { data, error } = ordersResult;
  if (error) throw new Error("No se pudieron cargar los pedidos.");

  const orders = (data ?? []) as Order[];
  const trackingReady = !trackingResult.error;
  const publicSiteUrl = siteUrl();
  const view = params.vista ?? (params.cotizacion ? "cotizar" : "");
  const filters = [
    { label: "Todos", value: "" },
    { label: "Por atender", value: "atencion" },
    { label: "Cotizar", value: "cotizar" },
    { label: "En curso", value: "curso" },
    { label: "Listos", value: "listos" },
    { label: "Finalizados", value: "finalizados" },
  ];

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
        <div className="orders-intro-actions">
          <span className="badge">{orders.length} en esta vista</span>
          <Link className="button" href="/admin/pedidos/nuevo">
            <Plus size={17} /> Nuevo pedido manual
          </Link>
        </div>
      </div>

      <form className="crm-search orders-crm-search" method="get">
        <Search size={18} />
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Buscar código YMP, cliente o teléfono"
          maxLength={80}
          aria-label="Buscar pedidos"
        />
        {params.estado && (
          <input type="hidden" name="estado" value={params.estado} />
        )}
        {params.cotizacion && (
          <input type="hidden" name="cotizacion" value={params.cotizacion} />
        )}
        {params.vista && (
          <input type="hidden" name="vista" value={params.vista} />
        )}
        <button className="button" type="submit">
          Buscar
        </button>
        {search && (
          <Link
            className="button secondary"
            href={
              params.estado
                ? "/admin/pedidos?estado=" + encodeURIComponent(params.estado)
                : view
                  ? "/admin/pedidos?vista=" + encodeURIComponent(view)
                  : "/admin/pedidos"
            }
          >
            Limpiar
          </Link>
        )}
      </form>

      <div className="orders-list-shell">
        <section className="admin-list">
          <nav className="admin-nav orders-filter" aria-label="Filtrar pedidos">
            {filters.map((filter) => (
              <Link
                key={filter.value}
                aria-current={
                  view === filter.value && !params.estado ? "page" : undefined
                }
                href={
                  "/admin/pedidos" +
                  (filter.value || search
                    ? "?" +
                      [
                        filter.value ? "vista=" + filter.value : "",
                        search ? "q=" + encodeURIComponent(search) : "",
                      ]
                        .filter(Boolean)
                        .join("&")
                    : "")
                }
              >
                {filter.label}
              </Link>
            ))}
          </nav>

          {!trackingReady && (
            <div className="admin-migration-notice">
              <strong>Activa el seguimiento privado.</strong>
              <p>
                Ejecuta <code>supabase/order-tracking-v1.sql</code> en Supabase
                después del merge. Luego podrás compartir el enlace de cada
                pedido.
              </p>
            </div>
          )}
          <p className="subtle">
            Hasta 100 pedidos por vista, ordenados por fecha de entrega. El
            estado del pedido y el pago se actualizan por separado.
          </p>

          {orders.length ? (
            orders.map((order) => {
              const number = customerWhatsappNumber(order.customer_phone);
              const trackingUrl =
                trackingReady && order.tracking_token
                  ? publicSiteUrl + "/seguimiento/" + order.tracking_token
                  : undefined;
              const message = orderStatusWhatsappMessage(
                order.public_code,
                order.status,
                trackingUrl,
              );
              return (
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
                    Entrega:{" "}
                    {order.delivery_date.split("-").reverse().join("/")} ·{" "}
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
                    <OrderAdvanceForm
                      order={{
                        id: order.id,
                        status: order.status,
                        quote_required: order.quote_required,
                      }}
                    />
                    <Link
                      className="button secondary"
                      href={"/admin/pedidos/" + order.id}
                    >
                      Ver pedido completo
                    </Link>
                    {number && (
                      <a
                        className="button secondary"
                        href={
                          "https://wa.me/" +
                          number +
                          "?text=" +
                          encodeURIComponent(message)
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle size={16} /> Avisar por WhatsApp
                      </a>
                    )}
                  </div>
                </article>
              );
            })
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
