import Link from "next/link";
import { MessageCircle, Search, UserRound, WalletCards } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import {
  customerOrderStats,
  normalizeCustomerPhone,
  safeCrmSearch,
} from "@/lib/crm";
import type { Customer } from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) return "Sin pedidos todavía";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

function whatsappNumber(phone: string) {
  const normalized = normalizeCustomerPhone(phone);
  return normalized.length === 9 ? "51" + normalized : normalized;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const db = await requireAdmin();
  const params = await searchParams;
  const search = safeCrmSearch(params.q);

  let query = db
    .from("customers")
    .select(
      "id,normalized_phone,phone,full_name,clerk_user_id,last_delivery_method,last_delivery_address,last_order_at,created_at,updated_at,orders(id,public_code,status,delivery_method,delivery_address,delivery_date,quote_required,created_at)",
    )
    .order("last_order_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (search) {
    const normalized = normalizeCustomerPhone(search);
    const filters = [
      `full_name.ilike.%${search}%`,
      `phone.ilike.%${search}%`,
    ];
    if (normalized.length >= 4)
      filters.push(`normalized_phone.ilike.%${normalized}%`);
    query = query.or(filters.join(","));
  }

  const { data, error } = await query;

  if (error && ["42P01", "PGRST205", "42703"].includes(error.code))
    return (
      <section className="panel admin-migration-notice">
        <strong>Clientes V1 está listo en el código, falta activarlo.</strong>
        <p>
          Después del merge ejecuta <code>supabase/customers-v1.sql</code> una
          sola vez en Supabase SQL Editor. Los pedidos existentes se vincularán
          automáticamente sin perder información.
        </p>
      </section>
    );

  if (error) throw new Error("No se pudieron cargar los clientes.");

  const customers = (data ?? []) as Customer[];

  return (
    <div className="customers-v1-page">
      <section className="customers-hero">
        <div>
          <span className="eyebrow">CLIENTES V1 · CRM YEMAPE</span>
          <h2>Conoce el historial detrás de cada pedido.</h2>
          <p>
            Yemape agrupa automáticamente los pedidos por teléfono para evitar
            clientes duplicados y conservar una ficha operativa única.
          </p>
        </div>
        <div className="customers-hero-stat">
          <UserRound size={19} />
          <strong>{customers.length}</strong>
          <span>{search ? "resultados" : "clientes visibles"}</span>
        </div>
      </section>

      <form className="crm-search" method="get">
        <Search size={18} />
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Buscar por nombre o teléfono"
          maxLength={80}
          aria-label="Buscar clientes"
        />
        <button className="button" type="submit">
          Buscar
        </button>
        {search && (
          <Link className="button secondary" href="/admin/clientes">
            Limpiar
          </Link>
        )}
      </form>

      {customers.length ? (
        <section className="customer-card-grid">
          {customers.map((customer) => {
            const stats = customerOrderStats(customer.orders ?? []);
            const wa = whatsappNumber(customer.phone);
            return (
              <article className="customer-card" key={customer.id}>
                <div className="customer-card-head">
                  <div className="customer-avatar">
                    {customer.full_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <span className="eyebrow">CLIENTE</span>
                    <h3>{customer.full_name}</h3>
                    <p>{customer.phone}</p>
                  </div>
                  {customer.clerk_user_id && (
                    <span className="badge">Cuenta vinculada</span>
                  )}
                </div>

                <div className="customer-mini-stats">
                  <div>
                    <strong>{stats.total}</strong>
                    <span>Pedidos</span>
                  </div>
                  <div>
                    <strong>{stats.active}</strong>
                    <span>Activos</span>
                  </div>
                  <div className={stats.quotePending ? "has-warning" : ""}>
                    <strong>{stats.quotePending}</strong>
                    <span>Por cotizar</span>
                  </div>
                </div>

                <div className="customer-card-meta">
                  <p>
                    <span>Último pedido</span>
                    <strong>{formatDate(customer.last_order_at)}</strong>
                  </p>
                  <p>
                    <span>Modalidad frecuente</span>
                    <strong>
                      {stats.preferredDelivery === "delivery"
                        ? "Delivery"
                        : stats.preferredDelivery === "recojo"
                          ? "Recojo"
                          : "Sin preferencia clara"}
                    </strong>
                  </p>
                </div>

                <div className="customer-card-actions">
                  <Link
                    className="button secondary"
                    href={"/admin/clientes/" + customer.id}
                  >
                    <WalletCards size={16} /> Ver historial
                  </Link>
                  {wa && (
                    <a
                      className="button secondary"
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
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="empty-state crm-empty">
          <UserRound size={28} />
          <h3>{search ? "No encontramos coincidencias" : "Aún no hay clientes"}</h3>
          <p>
            {search
              ? "Prueba con otro nombre o número de teléfono."
              : "Los clientes aparecerán automáticamente cuando exista un pedido."}
          </p>
        </div>
      )}
    </div>
  );
}
