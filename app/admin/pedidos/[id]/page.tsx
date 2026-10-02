import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  CircleDot,
  CreditCard,
  History,
  MapPin,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { money } from "@/lib/cart";
import { normalizeCustomerPhone } from "@/lib/crm";
import type { Order, OrderEvent } from "@/lib/types";
import { OrderUpdateForm } from "@/components/admin-forms";

function formatCreated(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

function actorLabel(event: OrderEvent) {
  if (event.actor_role === "admin") return "Administrador";
  if (event.actor_role === "customer") return "Cliente";
  return "Sistema";
}

function eventCopy(event: OrderEvent) {
  if (event.event_type === "status_change")
    return {
      title: event.to_status ?? "Estado actualizado",
      detail: event.from_status
        ? `${event.from_status} → ${event.to_status}`
        : "Cambio de estado",
      icon: <CircleDot size={15} />,
    };

  if (event.event_type === "quote_resolved")
    return {
      title: "Cotización confirmada",
      detail:
        event.amount_cents == null
          ? "Precio final definido"
          : "Total acordado: " + money(event.amount_cents),
      icon: <BadgeDollarSign size={15} />,
    };

  if (event.event_type === "payment_update")
    return {
      title: "Adelanto actualizado",
      detail:
        event.amount_cents == null
          ? "Importe abonado actualizado"
          : "Abonado acumulado: " + money(event.amount_cents),
      icon: <CreditCard size={15} />,
    };

  return {
    title: "Total actualizado",
    detail:
      event.amount_cents == null
        ? "Importe del pedido actualizado"
        : "Nuevo total: " + money(event.amount_cents),
    icon: <BadgeDollarSign size={15} />,
  };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await requireAdmin();
  const { id } = await params;

  const [orderResult, eventsResult] = await Promise.all([
    db
      .from("orders")
      .select(
        "*,order_items(id,order_id,position,product_id,product_name,variant_key,variant_label,quantity,unit_price_cents,line_total_cents,quote_required,created_at)",
      )
      .eq("id", id)
      .maybeSingle(),
    db
      .from("order_events")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (orderResult.error || !orderResult.data) notFound();

  const timelineEnabled =
    !eventsResult.error ||
    !["42P01", "PGRST205", "42703"].includes(eventsResult.error.code);
  if (eventsResult.error && timelineEnabled)
    throw new Error("No pudimos cargar el historial del pedido.");

  const order = orderResult.data as Order;
  const events = ((eventsResult.data ?? []) as OrderEvent[]).slice();
  const items = (order.order_items ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);

  const normalizedPhone = normalizeCustomerPhone(order.customer_phone);
  const digits =
    normalizedPhone.length === 9 ? "51" + normalizedPhone : normalizedPhone;
  const whatsappText = encodeURIComponent(
    "Hola " +
      order.customer_name +
      ", te escribimos de Repostería Yemape por tu pedido " +
      order.public_code +
      ".",
  );

  return (
    <div className="order-detail-shell">
      <Link className="text-link order-back-link" href="/admin/pedidos">
        <ArrowLeft size={16} /> Volver a pedidos
      </Link>

      <section className="panel order-detail-hero">
        <div>
          <span className="eyebrow">
            {order.source === "web" ? "SOLICITUD WEB" : "PEDIDO MANUAL"}
          </span>
          <h1>{order.public_code}</h1>
          <p>
            Creado {formatCreated(order.created_at)} · Entrega{" "}
            {order.delivery_date.split("-").reverse().join("/")}
          </p>
        </div>
        <div className="order-badges">
          <span className="badge">{order.status}</span>
          {order.quote_required && (
            <span className="badge inactive">Requiere cotización</span>
          )}
        </div>
      </section>

      <div className="order-detail-grid">
        <section className="order-detail-main">
          <section className="panel">
            <div className="order-detail-section">
              <span className="eyebrow">PRODUCTOS</span>
              <h2>Detalle congelado del pedido</h2>

              {items.length ? (
                <div className="order-item-list">
                  {items.map((item) => (
                    <article className="order-item-row" key={item.id}>
                      <div>
                        <strong>
                          {item.quantity} × {item.product_name}
                        </strong>
                        <span>{item.variant_label}</span>
                      </div>
                      <div>
                        {item.quote_required ||
                        item.unit_price_cents === null ||
                        item.line_total_cents === null ? (
                          <strong>Por cotizar</strong>
                        ) : (
                          <>
                            <span>{money(item.unit_price_cents)} c/u</span>
                            <strong>{money(item.line_total_cents)}</strong>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p style={{ whiteSpace: "pre-wrap" }}>{order.details}</p>
              )}
            </div>

            <div className="order-total-box">
              <span>
                {order.quote_required ? "Subtotal conocido" : "Total registrado"}
              </span>
              <strong>{money(order.total_cents)}</strong>
              {order.quote_required && <small>+ productos por cotizar</small>}
            </div>

            <div className="order-detail-section">
              <span className="eyebrow">ENTREGA</span>
              <h2>
                {order.delivery_method === "delivery"
                  ? "Delivery"
                  : order.delivery_method === "recojo"
                    ? "Recojo"
                    : "Por coordinar"}
              </h2>
              {order.delivery_method === "delivery" && (
                <p className="order-detail-icon-line">
                  <MapPin size={17} /> {order.delivery_address}
                </p>
              )}
              {order.occasion && <p>Ocasión: {order.occasion}</p>}
              {order.gift_note && (
                <p>Dedicatoria solicitada: {order.gift_note}</p>
              )}
              {order.notes && <p>Observaciones: {order.notes}</p>}
            </div>

            {(order.cake_guests ||
              order.cake_flavor ||
              order.cake_design) && (
              <div className="order-detail-section">
                <span className="eyebrow">TORTA PERSONALIZADA</span>
                {order.cake_guests && <p>Personas: {order.cake_guests}</p>}
                {order.cake_flavor && <p>Sabor: {order.cake_flavor}</p>}
                {order.cake_design && (
                  <p>Idea o temática: {order.cake_design}</p>
                )}
              </div>
            )}
          </section>

          <section className="panel order-timeline-panel">
            <div className="customer-section-head">
              <div>
                <span className="eyebrow">TRAZABILIDAD</span>
                <h2>Timeline del pedido</h2>
              </div>
              <History size={20} />
            </div>

            <div className="order-timeline">
              <article className="timeline-event is-created">
                <div className="timeline-marker">
                  <CircleDot size={15} />
                </div>
                <div>
                  <strong>Pedido creado</strong>
                  <p>
                    {order.source === "web"
                      ? "Solicitud registrada desde la tienda."
                      : "Pedido registrado manualmente por el equipo."}
                  </p>
                  <span>{formatCreated(order.created_at)}</span>
                </div>
              </article>

              {events.map((event) => {
                const copy = eventCopy(event);
                return (
                  <article className="timeline-event" key={event.id}>
                    <div className="timeline-marker">{copy.icon}</div>
                    <div>
                      <strong>{copy.title}</strong>
                      <p>{copy.detail}</p>
                      <span>
                        {formatCreated(event.created_at)} · {actorLabel(event)}
                      </span>
                    </div>
                  </article>
                );
              })}

              {!timelineEnabled && (
                <div className="admin-migration-notice timeline-migration">
                  <strong>Timeline avanzado pendiente de activar.</strong>
                  <p>
                    Ejecuta <code>supabase/customers-v1.sql</code> después del
                    merge. Los próximos cambios de estado y pagos quedarán
                    registrados automáticamente.
                  </p>
                </div>
              )}

              {timelineEnabled && events.length === 0 && (
                <p className="subtle timeline-empty">
                  Aún no hay cambios posteriores a la creación del pedido.
                </p>
              )}
            </div>
          </section>
        </section>

        <aside className="order-detail-side">
          <section className="panel">
            <span className="eyebrow">CLIENTE</span>
            <h2>{order.customer_name}</h2>
            <p className="order-detail-icon-line">
              <UserRound size={17} /> {order.customer_phone}
            </p>
            {order.customer_user_id && (
              <p className="subtle">Pedido vinculado a una cuenta de cliente.</p>
            )}
            {order.customer_id && (
              <Link
                className="button secondary full"
                href={"/admin/clientes/" + order.customer_id}
              >
                <UserRound size={17} /> Ver ficha del cliente
              </Link>
            )}
            {digits.length >= 7 && (
              <a
                className="button whatsapp-button full"
                href={"https://wa.me/" + digits + "?text=" + whatsappText}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={18} /> Escribir por WhatsApp
              </a>
            )}
          </section>

          <section className="panel">
            <span className="eyebrow">COBRO Y ESTADO</span>
            <div className="order-side-money">
              <span>Total conocido</span>
              <strong>{money(order.total_cents)}</strong>
              <span>Abonado</span>
              <strong>{money(order.deposit_cents)}</strong>
              <span>Saldo</span>
              <strong>{money(order.total_cents - order.deposit_cents)}</strong>
            </div>
            <OrderUpdateForm
              key={order.id + "-" + order.status + "-" + order.deposit_cents}
              order={order}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
