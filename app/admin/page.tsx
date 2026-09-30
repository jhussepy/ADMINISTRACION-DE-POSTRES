import Link from "next/link";
import {
  CalendarDays,
  ChefHat,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { limaToday, money } from "@/lib/cart";
import { operationalOrderMetrics } from "@/lib/admin-dashboard";
import type { Order } from "@/lib/types";

function shortDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default async function AdminPage() {
  const db = await requireAdmin();
  const today = limaToday();

  const [ordersResult, productsResult] = await Promise.all([
    db
      .from("orders")
      .select("*")
      .order("delivery_date", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(300),
    db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
  ]);

  if (ordersResult.error)
    throw new Error("No se pudo cargar el centro de operaciones.");
  if (productsResult.error)
    throw new Error("No se pudo cargar el catálogo.");

  const orders = (ordersResult.data ?? []) as Order[];
  const metrics = operationalOrderMetrics(orders, today);
  const activeOrders = orders
    .filter((order) =>
      ["Nuevo", "Por confirmar", "Confirmado", "En preparación", "Listo"].includes(
        order.status,
      ),
    )
    .sort(
      (a, b) =>
        a.delivery_date.localeCompare(b.delivery_date) ||
        b.created_at.localeCompare(a.created_at),
    );
  const upcoming = activeOrders.slice(0, 6);

  return (
    <div className="dashboard-v2">
      <section className="dashboard-v2-hero">
        <div>
          <span className="eyebrow">CENTRO DE OPERACIONES</span>
          <h2>Lo importante de Yemape, en una sola vista.</h2>
          <p>
            Pedidos, producción y entregas. Los importes pendientes de
            cotización no se contabilizan como ventas ni saldos oficiales.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <Link className="button" href="/admin/pedidos">
            <ReceiptText size={17} /> Ver pedidos
          </Link>
          <Link className="button secondary" href="/admin/calendario">
            <CalendarDays size={17} /> Calendario
          </Link>
        </div>
      </section>

      <section className="dashboard-kpis" aria-label="Resumen operativo">
        <Link className="dashboard-kpi is-attention" href="/admin/pedidos">
          <span>
            <Clock3 size={18} /> Requieren atención
          </span>
          <strong>{metrics.attention}</strong>
          <small>Nuevos o por confirmar</small>
        </Link>

        <Link
          className="dashboard-kpi"
          href="/admin/pedidos?estado=En%20preparaci%C3%B3n"
        >
          <span>
            <ChefHat size={18} /> En operación
          </span>
          <strong>{metrics.production}</strong>
          <small>Confirmados, preparando o listos</small>
        </Link>

        <Link className="dashboard-kpi" href="/admin/calendario">
          <span>
            <PackageCheck size={18} /> Entregas hoy
          </span>
          <strong>{metrics.today}</strong>
          <small>{metrics.tomorrow} programadas para mañana</small>
        </Link>

        <Link className="dashboard-kpi is-quote" href="/admin/pedidos">
          <span>
            <ReceiptText size={18} /> Cotización pendiente
          </span>
          <strong>{metrics.quotes}</strong>
          <small>No se suma a ventas</small>
        </Link>
      </section>

      <section className="dashboard-finance-strip">
        <div>
          <span>
            <CircleDollarSign size={17} /> Importe acordado
          </span>
          <strong>{money(metrics.confirmedAmount)}</strong>
          <small>Solo pedidos con precio confirmado, no cancelados.</small>
        </div>
        <div>
          <span>Saldo confirmado por cobrar</span>
          <strong>{money(metrics.outstanding)}</strong>
          <small>Las cotizaciones pendientes quedan fuera de este cálculo.</small>
        </div>
        <div>
          <span>
            <ShoppingBag size={17} /> Productos visibles
          </span>
          <strong>{productsResult.count ?? 0}</strong>
          <small>Catálogo activo actualmente.</small>
        </div>
      </section>

      <div className="dashboard-main-grid">
        <section className="panel dashboard-upcoming">
          <div className="dashboard-section-head">
            <div>
              <span className="eyebrow">PRÓXIMAS ENTREGAS</span>
              <h2>Qué viene ahora</h2>
            </div>
            <Link className="text-link" href="/admin/calendario">
              Ver calendario →
            </Link>
          </div>

          {upcoming.length ? (
            <div className="dashboard-order-list">
              {upcoming.map((order) => (
                <Link
                  href={"/admin/pedidos/" + order.id}
                  className="dashboard-order-row"
                  key={order.id}
                >
                  <div className="dashboard-order-date">
                    <strong>{order.delivery_date.slice(8, 10)}</strong>
                    <span>
                      {new Intl.DateTimeFormat("es-PE", {
                        month: "short",
                        timeZone: "UTC",
                      }).format(new Date(order.delivery_date + "T12:00:00Z"))}
                    </span>
                  </div>
                  <div className="dashboard-order-copy">
                    <span>{order.public_code}</span>
                    <strong>{order.customer_name}</strong>
                    <small>
                      {order.delivery_method === "delivery"
                        ? "Delivery"
                        : order.delivery_method === "recojo"
                          ? "Recojo"
                          : "Por coordinar"}{" "}
                      · {order.status}
                    </small>
                  </div>
                  {order.quote_required ? (
                    <span className="badge inactive">Cotizar</span>
                  ) : (
                    <span className="badge">{money(order.total_cents)}</span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <h3>No hay entregas operativas pendientes</h3>
              <p>Los próximos pedidos confirmados aparecerán aquí.</p>
            </div>
          )}
        </section>

        <aside className="dashboard-side-stack">
          <section className="panel dashboard-today-card">
            <span className="eyebrow">HOY · {shortDate(today)}</span>
            <h2>
              {metrics.today
                ? `${metrics.today} ${metrics.today === 1 ? "entrega" : "entregas"}`
                : "Sin entregas hoy"}
            </h2>
            <p>
              Mañana hay {metrics.tomorrow}{" "}
              {metrics.tomorrow === 1 ? "pedido programado" : "pedidos programados"}.
            </p>
            <Link className="button secondary full" href="/admin/calendario">
              <CalendarDays size={17} /> Organizar entregas
            </Link>
          </section>

          <section className="panel dashboard-rule-card">
            <span className="eyebrow">CONTROL FINANCIERO</span>
            <h2>Sin cifras ficticias.</h2>
            <p>
              Mientras un pedido requiera cotización, el Dashboard no usa ese
              importe para ventas ni saldos. Cuando confirmes el precio desde el
              pedido, entrará automáticamente a las métricas.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
