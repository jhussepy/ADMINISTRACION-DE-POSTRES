import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Store } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { limaToday } from "@/lib/cart";
import {
  calendarLeadingDays,
  monthBounds,
  shiftMonth,
} from "@/lib/admin-dashboard";
import { orderStatuses, type Order } from "@/lib/types";

const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export default async function DeliveryCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; estado?: string }>;
}) {
  const db = await requireAdmin();
  const params = await searchParams;
  const today = limaToday();
  let month = params.mes ?? today.slice(0, 7);

  try {
    monthBounds(month);
  } catch {
    month = today.slice(0, 7);
  }

  const bounds = monthBounds(month);
  let query = db
    .from("orders")
    .select("*")
    .gte("delivery_date", bounds.start)
    .lte("delivery_date", bounds.end)
    .order("delivery_date", { ascending: true })
    .order("created_at", { ascending: true });

  const selectedStatus = orderStatuses.find((status) => status === params.estado);
  if (selectedStatus) query = query.eq("status", selectedStatus);
  else query = query.neq("status", "Cancelado");

  const { data, error } = await query;
  if (error) throw new Error("No se pudo cargar el calendario de entregas.");

  const orders = (data ?? []) as Order[];
  const byDate = new Map<string, Order[]>();
  for (const order of orders) {
    const dayOrders = byDate.get(order.delivery_date) ?? [];
    dayOrders.push(order);
    byDate.set(order.delivery_date, dayOrders);
  }

  const leading = calendarLeadingDays(month);
  const days = Array.from({ length: bounds.lastDay }, (_, index) => index + 1);
  const quotes = orders.filter((order) => order.quote_required).length;
  const deliveries = orders.filter((order) => order.delivery_method === "delivery").length;
  const pickups = orders.filter((order) => order.delivery_method === "recojo").length;

  const filterQuery = selectedStatus
    ? "&estado=" + encodeURIComponent(selectedStatus)
    : "";

  return (
    <div className="delivery-calendar-page">
      <section className="calendar-hero">
        <div>
          <span className="eyebrow">CALENDARIO DE PRODUCCIÓN Y ENTREGAS</span>
          <h2>{monthLabel(month)}</h2>
          <p>
            Organiza recojos, delivery y trabajo de producción por fecha. Las
            cotizaciones pendientes permanecen visibles sin convertirse en
            ventas.
          </p>
        </div>
        <div className="calendar-month-nav">
          <Link
            className="icon-button"
            aria-label="Mes anterior"
            href={"/admin/calendario?mes=" + shiftMonth(month, -1) + filterQuery}
          >
            <ChevronLeft size={18} />
          </Link>
          <Link className="button secondary" href="/admin/calendario">
            Hoy
          </Link>
          <Link
            className="icon-button"
            aria-label="Mes siguiente"
            href={"/admin/calendario?mes=" + shiftMonth(month, 1) + filterQuery}
          >
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      <section className="calendar-summary">
        <div>
          <span>Pedidos del mes</span>
          <strong>{orders.length}</strong>
        </div>
        <div>
          <span>Delivery</span>
          <strong>{deliveries}</strong>
        </div>
        <div>
          <span>Recojo</span>
          <strong>{pickups}</strong>
        </div>
        <div className={quotes ? "has-warning" : ""}>
          <span>Cotización pendiente</span>
          <strong>{quotes}</strong>
        </div>
      </section>

      <nav className="admin-nav calendar-filters" aria-label="Filtrar calendario">
        <Link href={"/admin/calendario?mes=" + month}>Operativos</Link>
        {orderStatuses.map((status) => (
          <Link
            key={status}
            href={
              "/admin/calendario?mes=" +
              month +
              "&estado=" +
              encodeURIComponent(status)
            }
          >
            {status}
          </Link>
        ))}
      </nav>

      <section className="calendar-shell" aria-label={"Calendario " + monthLabel(month)}>
        <div className="calendar-weekdays" aria-hidden="true">
          {weekdayLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="calendar-grid">
          {Array.from({ length: leading }, (_, index) => (
            <div className="calendar-day is-empty" key={"empty-" + index} />
          ))}

          {days.map((day) => {
            const date = `${month}-${String(day).padStart(2, "0")}`;
            const dayOrders = byDate.get(date) ?? [];
            const isToday = date === today;

            return (
              <article
                className={
                  "calendar-day " +
                  (isToday ? "is-today " : "") +
                  (dayOrders.length ? "has-orders" : "")
                }
                key={date}
              >
                <div className="calendar-day-head">
                  <strong>{day}</strong>
                  {isToday && <span>Hoy</span>}
                </div>

                <div className="calendar-day-orders">
                  {dayOrders.slice(0, 4).map((order) => (
                    <Link
                      className={
                        "calendar-order-chip status-" +
                        order.status
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/\s+/g, "-")
                      }
                      href={"/admin/pedidos/" + order.id}
                      key={order.id}
                      title={
                        order.public_code +
                        " · " +
                        order.customer_name +
                        " · " +
                        order.status
                      }
                    >
                      <span className="calendar-order-code">{order.public_code}</span>
                      <strong>{order.customer_name}</strong>
                      <small>
                        {order.delivery_method === "delivery" ? (
                          <>
                            <MapPin size={11} /> Delivery
                          </>
                        ) : (
                          <>
                            <Store size={11} /> Recojo
                          </>
                        )}
                        {order.quote_required && " · Cotizar"}
                      </small>
                    </Link>
                  ))}

                  {dayOrders.length > 4 && (
                    <span className="calendar-more">
                      +{dayOrders.length - 4} pedidos más
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="calendar-mobile-note">
        <CalendarDays size={16} />
        <span>
          En celular puedes desplazarte horizontalmente para mantener la vista
          semanal completa.
        </span>
      </div>
    </div>
  );
}
