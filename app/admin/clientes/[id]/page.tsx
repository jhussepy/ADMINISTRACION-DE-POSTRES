import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  MapPin,
  MessageCircle,
  PackageCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { requireAdmin } from "@/lib/data";
import {
  customerOrderStats,
  normalizeCustomerPhone,
} from "@/lib/crm";
import type {
  Customer,
  CustomerNote,
  CustomerOrderSummary,
  Order,
} from "@/lib/types";
import {
  CustomerNoteDeleteForm,
  CustomerNoteForm,
} from "@/components/admin-forms";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

function shortDeliveryDate(value: string) {
  return value.split("-").reverse().join("/");
}

function whatsappNumber(phone: string) {
  const normalized = normalizeCustomerPhone(phone);
  return normalized.length === 9 ? "51" + normalized : normalized;
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await requireAdmin();
  const { id } = await params;

  const [customerResult, ordersResult, notesResult] = await Promise.all([
    db
      .from("customers")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    db
      .from("orders")
      .select(
        "*,order_items(id,order_id,position,product_id,product_name,variant_key,variant_label,quantity,unit_price_cents,line_total_cents,quote_required,created_at)",
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("customer_notes")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (customerResult.error || !customerResult.data) notFound();
  if (ordersResult.error) throw new Error("No pudimos cargar el historial del cliente.");
  if (notesResult.error) throw new Error("No pudimos cargar las notas internas.");

  const customer = customerResult.data as Customer;
  const orders = (ordersResult.data ?? []) as Order[];
  const notes = (notesResult.data ?? []) as CustomerNote[];

  const summaries: CustomerOrderSummary[] = orders.map((order) => ({
    id: order.id,
    public_code: order.public_code,
    status: order.status,
    delivery_method: order.delivery_method,
    delivery_address: order.delivery_address,
    delivery_date: order.delivery_date,
    quote_required: order.quote_required,
    created_at: order.created_at,
  }));
  const stats = customerOrderStats(summaries);

  const products = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.order_items ?? [])
      products.set(
        item.product_name,
        (products.get(item.product_name) ?? 0) + item.quantity,
      );
  }
  const favoriteProducts = [...products.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5);

  const addresses = [
    ...new Set(
      orders
        .filter(
          (order) =>
            order.delivery_method === "delivery" &&
            order.delivery_address.trim().length > 0,
        )
        .map((order) => order.delivery_address.trim()),
    ),
  ].slice(0, 5);

  const wa = whatsappNumber(customer.phone);

  return (
    <div className="customer-detail-shell">
      <Link className="text-link order-back-link" href="/admin/clientes">
        <ArrowLeft size={16} /> Volver a clientes
      </Link>

      <section className="customer-profile-hero">
        <div className="customer-profile-avatar">
          {customer.full_name.slice(0, 1).toUpperCase()}
        </div>
        <div className="customer-profile-copy">
          <span className="eyebrow">FICHA DE CLIENTE</span>
          <h1>{customer.full_name}</h1>
          <p>{customer.phone}</p>
          <div className="customer-profile-badges">
            {customer.clerk_user_id && <span className="badge">Cuenta vinculada</span>}
            {stats.active > 0 && (
              <span className="badge">{stats.active} pedidos activos</span>
            )}
            {stats.quotePending > 0 && (
              <span className="badge inactive">
                {stats.quotePending} por cotizar
              </span>
            )}
          </div>
        </div>
        {wa && (
          <a
            className="button customer-whatsapp"
            href={
              "https://wa.me/" +
              wa +
              "?text=" +
              encodeURIComponent(
                "Hola " +
                  customer.full_name +
                  ", te escribimos de Repostería Yemape.",
              )
            }
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={17} /> Escribir por WhatsApp
          </a>
        )}
      </section>

      <section className="customer-profile-stats">
        <div>
          <ShoppingBag size={18} />
          <span>Pedidos totales</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <Clock3 size={18} />
          <span>Pedidos activos</span>
          <strong>{stats.active}</strong>
        </div>
        <div>
          <PackageCheck size={18} />
          <span>Entregados</span>
          <strong>{stats.delivered}</strong>
        </div>
        <div>
          <UserRound size={18} />
          <span>Modalidad frecuente</span>
          <strong>
            {stats.preferredDelivery === "delivery"
              ? "Delivery"
              : stats.preferredDelivery === "recojo"
                ? "Recojo"
                : "Mixta"}
          </strong>
        </div>
      </section>

      <div className="customer-detail-grid">
        <main className="customer-detail-main">
          <section className="panel">
            <div className="customer-section-head">
              <div>
                <span className="eyebrow">HISTORIAL</span>
                <h2>Pedidos del cliente</h2>
              </div>
              <span className="badge">{orders.length} registrados</span>
            </div>

            {orders.length ? (
              <div className="customer-order-history">
                {orders.map((order) => (
                  <Link
                    className="customer-history-row"
                    href={"/admin/pedidos/" + order.id}
                    key={order.id}
                  >
                    <div>
                      <span className="order-code">{order.public_code}</span>
                      <strong>{shortDeliveryDate(order.delivery_date)}</strong>
                      <small>
                        {order.delivery_method === "delivery"
                          ? "Delivery"
                          : order.delivery_method === "recojo"
                            ? "Recojo"
                            : "Por coordinar"}
                      </small>
                    </div>
                    <div className="customer-history-products">
                      {(order.order_items ?? [])
                        .slice()
                        .sort((a, b) => a.position - b.position)
                        .slice(0, 2)
                        .map((item) => (
                          <span key={item.id}>
                            {item.quantity} × {item.product_name}
                          </span>
                        ))}
                      {(order.order_items?.length ?? 0) > 2 && (
                        <small>
                          +{(order.order_items?.length ?? 0) - 2} líneas más
                        </small>
                      )}
                      {!order.order_items?.length && (
                        <span>{order.details || "Pedido manual"}</span>
                      )}
                    </div>
                    <div className="customer-history-status">
                      <span className="badge">{order.status}</span>
                      {order.quote_required && (
                        <span className="badge inactive">Cotizar</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state compact-empty">
                <h3>Sin historial de pedidos</h3>
                <p>Los próximos pedidos aparecerán aquí automáticamente.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="customer-section-head">
              <div>
                <span className="eyebrow">PREFERENCIAS OBSERVADAS</span>
                <h2>Productos y direcciones recurrentes</h2>
              </div>
            </div>

            <div className="customer-insights-grid">
              <div>
                <h3>Productos solicitados</h3>
                {favoriteProducts.length ? (
                  <ol className="customer-favorites">
                    {favoriteProducts.map(([name, quantity]) => (
                      <li key={name}>
                        <span>{name}</span>
                        <strong>{quantity} uds.</strong>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="subtle">
                    Aún no hay productos estructurados en su historial.
                  </p>
                )}
              </div>
              <div>
                <h3>Direcciones utilizadas</h3>
                {addresses.length ? (
                  <div className="customer-address-list">
                    {addresses.map((address) => (
                      <p key={address}>
                        <MapPin size={14} />
                        <span>{address}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="subtle">
                    No hay direcciones de delivery registradas.
                  </p>
                )}
              </div>
            </div>
          </section>
        </main>

        <aside className="customer-detail-side">
          <section className="panel">
            <span className="eyebrow">NOTAS INTERNAS</span>
            <h2>Contexto para el equipo</h2>
            <p className="subtle">
              Preferencias, coordinaciones y observaciones que nunca se muestran
              al cliente.
            </p>
            <CustomerNoteForm customerId={customer.id} />
          </section>

          <section className="panel customer-notes-list">
            <div className="customer-section-head">
              <h2>Notas guardadas</h2>
              <span className="badge">{notes.length}</span>
            </div>
            {notes.length ? (
              notes.map((note) => (
                <article className="customer-note-card" key={note.id}>
                  <p>{note.note}</p>
                  <div>
                    <span>{formatDate(note.created_at)}</span>
                    <CustomerNoteDeleteForm
                      customerId={customer.id}
                      noteId={note.id}
                    />
                  </div>
                </article>
              ))
            ) : (
              <p className="subtle">
                Todavía no hay notas internas para este cliente.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
