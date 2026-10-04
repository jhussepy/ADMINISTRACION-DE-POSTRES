import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Check, Clock3, PackageCheck } from "lucide-react";
import { serviceSupabase } from "@/lib/supabase/service";
import { customerStatusCopy, orderProgress } from "@/lib/order-progress";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Seguimiento de pedido | Yemape",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = serviceSupabase();
  if (!UUID_RE.test(token) || !db) notFound();

  const { data, error } = await db
    .from("orders")
    .select("public_code,status,quote_required,delivery_date,delivery_method")
    .eq("tracking_token", token)
    .maybeSingle();

  if (error || !data) notFound();
  const order = data as Pick<
    Order,
    | "public_code"
    | "status"
    | "quote_required"
    | "delivery_date"
    | "delivery_method"
  >;
  const currentIndex = orderProgress.findIndex(
    (status) => status === order.status,
  );
  const statusCopy = customerStatusCopy[order.status];
  const deliveryDate = order.delivery_date.split("-").reverse().join("/");

  return (
    <main className="tracking-page">
      <div className="tracking-shell">
        <Link href="/" className="text-link">
          ← Volver a Yemape
        </Link>

        <section className="panel tracking-intro">
          <span className="eyebrow">SEGUIMIENTO DEL PEDIDO</span>
          <h1>{order.public_code}</h1>
          <p>Consulta aquí el estado actual de tu pedido cuando quieras.</p>
          <div className="tracking-current" role="status">
            <PackageCheck size={23} aria-hidden="true" />
            <div>
              <span>Estado actual</span>
              <strong>{statusCopy.title}</strong>
              <p>{statusCopy.description}</p>
            </div>
          </div>
          {order.quote_required && order.status !== "Cancelado" && (
            <p className="tracking-quote">
              El precio final aún debe confirmarse contigo antes de cobrar el
              pedido.
            </p>
          )}
          <p className="tracking-delivery">
            <CalendarDays size={18} aria-hidden="true" />
            Fecha solicitada: {deliveryDate} ·{" "}
            {order.delivery_method === "delivery"
              ? "Delivery"
              : order.delivery_method === "recojo"
                ? "Recojo"
                : "Por coordinar"}
          </p>
        </section>

        {order.status !== "Cancelado" && (
          <section className="panel tracking-stages">
            <h2>Progreso del pedido</h2>
            <ol>
              {orderProgress.map((status, index) => {
                const done = index < currentIndex;
                const active = index === currentIndex;
                return (
                  <li
                    key={status}
                    className={active ? "is-current" : done ? "is-done" : ""}
                    aria-current={active ? "step" : undefined}
                  >
                    <span className="tracking-stage-icon">
                      {done ? (
                        <Check size={16} />
                      ) : active ? (
                        <Clock3 size={16} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span>{customerStatusCopy[status].title}</span>
                  </li>
                );
              })}
            </ol>
            <p className="subtle">
              El estado cambia cuando nuestro equipo actualiza el pedido. Vuelve
              a abrir este enlace para ver la información más reciente.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
