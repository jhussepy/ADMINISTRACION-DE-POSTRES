import Link from "next/link";
import { CreditCard, Search, WalletCards } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { money } from "@/lib/cart";
import { safeCrmSearch } from "@/lib/crm";
import {
  paymentMethodLabel,
  paymentStatusClass,
  paymentStatusLabel,
  paymentSummary,
} from "@/lib/payments";
import {
  paymentMethods,
  paymentStatuses,
  type PaymentWithOrder,
} from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; metodo?: string; q?: string }>;
}) {
  const db = await requireAdmin();
  const params = await searchParams;
  const search = safeCrmSearch(params.q);
  const status = paymentStatuses.find((item) => item === params.estado);
  const method = paymentMethods.find((item) => item === params.metodo);

  let query = db
    .from("payments")
    .select(
      "*,orders(id,public_code,customer_name,customer_phone,total_cents,deposit_cents,quote_required,status),payment_proofs(id)",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (status) query = query.eq("status", status);
  if (method) query = query.eq("method", method);

  const { data, error } = await query;

  if (error && ["42P01", "PGRST205", "42703"].includes(error.code))
    return (
      <section className="panel admin-migration-notice">
        <strong>Pagos V2 está listo en el código, falta activarlo.</strong>
        <p>
          Después del merge ejecuta <code>supabase/payments-v2.sql</code> una
          sola vez en Supabase SQL Editor.
        </p>
      </section>
    );

  if (error) throw new Error("No se pudieron cargar los pagos.");

  const all = (data ?? []) as PaymentWithOrder[];
  const payments = search
    ? all.filter((payment) => {
        const haystack = [
          payment.reference,
          payment.provider_payment_id ?? "",
          payment.orders?.public_code ?? "",
          payment.orders?.customer_name ?? "",
          payment.orders?.customer_phone ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
    : all;
  const summary = paymentSummary(payments);

  const filterSuffix =
    (status ? "&estado=" + encodeURIComponent(status) : "") +
    (method ? "&metodo=" + encodeURIComponent(method) : "");

  return (
    <div className="payments-v2-page">
      <section className="payments-hero">
        <div>
          <span className="eyebrow">PAGOS V2 · YEMAPE</span>
          <h2>Cobros verificables, no números sueltos.</h2>
          <p>
            Cada adelanto queda asociado a un pedido, método, estado y
            comprobante. El saldo del pedido se calcula solo con pagos
            confirmados.
          </p>
        </div>
        <div className="payments-hero-icon">
          <WalletCards size={25} />
        </div>
      </section>

      <section className="payments-kpis">
        <div>
          <span>Confirmado en esta vista</span>
          <strong>{money(summary.confirmed)}</strong>
          <small>{summary.confirmedCount} movimientos confirmados</small>
        </div>
        <div>
          <span>Pendiente de verificar</span>
          <strong>{money(summary.pending)}</strong>
          <small>{summary.pendingCount} movimientos pendientes</small>
        </div>
        <div>
          <span>Reembolsado</span>
          <strong>{money(summary.refunded)}</strong>
          <small>No se contabiliza como abonado actual.</small>
        </div>
      </section>

      <form className="crm-search payments-search" method="get">
        <Search size={18} />
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Buscar YMP, cliente, teléfono, operación o ID proveedor"
          maxLength={80}
          aria-label="Buscar pagos"
        />
        {status && <input type="hidden" name="estado" value={status} />}
        {method && <input type="hidden" name="metodo" value={method} />}
        <button className="button">Buscar</button>
        {search && (
          <Link
            className="button secondary"
            href={"/admin/pagos?" + filterSuffix.replace(/^&/, "")}
          >
            Limpiar
          </Link>
        )}
      </form>

      <div className="payments-filter-row">
        <nav className="admin-nav" aria-label="Filtrar pagos por estado">
          <Link href="/admin/pagos">Todos</Link>
          {paymentStatuses.map((item) => (
            <Link
              key={item}
              href={
                "/admin/pagos?estado=" +
                item +
                (method ? "&metodo=" + method : "") +
                (search ? "&q=" + encodeURIComponent(search) : "")
              }
            >
              {paymentStatusLabel(item)}
            </Link>
          ))}
        </nav>
        <nav className="admin-nav" aria-label="Filtrar pagos por método">
          {paymentMethods.map((item) => (
            <Link
              key={item}
              href={
                "/admin/pagos?metodo=" +
                item +
                (status ? "&estado=" + status : "") +
                (search ? "&q=" + encodeURIComponent(search) : "")
              }
            >
              {paymentMethodLabel(item)}
            </Link>
          ))}
        </nav>
      </div>

      {payments.length ? (
        <section className="payments-admin-list">
          {payments.map((payment) => (
            <article
              className={"payments-admin-row " + paymentStatusClass(payment.status)}
              key={payment.id}
            >
              <div className="payments-admin-method">
                <CreditCard size={17} />
                <div>
                  <strong>{paymentMethodLabel(payment.method)}</strong>
                  <span>{formatDate(payment.created_at)}</span>
                </div>
              </div>

              <div className="payments-admin-order">
                {payment.orders ? (
                  <>
                    <Link href={"/admin/pedidos/" + payment.orders.id}>
                      {payment.orders.public_code}
                    </Link>
                    <strong>{payment.orders.customer_name}</strong>
                    <span>{payment.orders.customer_phone}</span>
                  </>
                ) : (
                  <span>Pedido no disponible</span>
                )}
              </div>

              <div className="payments-admin-reference">
                <span>{payment.reference || "Sin referencia manual"}</span>
                {payment.provider_payment_id && (
                  <small>ID proveedor: {payment.provider_payment_id}</small>
                )}
                {!!payment.payment_proofs?.length && (
                  <small>
                    {payment.payment_proofs.length}{" "}
                    {payment.payment_proofs.length === 1
                      ? "comprobante"
                      : "comprobantes"}
                  </small>
                )}
              </div>

              <div className="payments-admin-amount">
                <strong>{money(payment.amount_cents)}</strong>
                <span className="badge">
                  {paymentStatusLabel(payment.status)}
                </span>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="empty-state">
          <WalletCards size={28} />
          <h3>No hay pagos en esta vista</h3>
          <p>Los movimientos registrados desde los pedidos aparecerán aquí.</p>
        </div>
      )}
    </div>
  );
}
