import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, MessageCircle, UserRound } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { money } from "@/lib/cart";
import type { Order } from "@/lib/types";
import { OrderUpdateForm } from "@/components/admin-forms";

function formatCreated(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await requireAdmin();
  const { id } = await params;

  const { data, error } = await db
    .from("orders")
    .select(
      "*,order_items(id,order_id,position,product_id,product_name,variant_key,variant_label,quantity,unit_price_cents,line_total_cents,quote_required,created_at)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const order = data as Order;
  const items = (order.order_items ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);
  const digits = order.customer_phone.replace(/\D/g, "");
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
        <section className="panel order-detail-main">
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
              {order.cake_design && <p>Idea o temática: {order.cake_design}</p>}
            </div>
          )}
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
