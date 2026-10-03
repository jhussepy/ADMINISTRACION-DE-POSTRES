import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, ShieldCheck, Smartphone } from "lucide-react";
import { money } from "@/lib/cart";
import { serviceSupabase } from "@/lib/supabase/service";
import { yapeConfiguration } from "@/lib/yape";
import { YapeProofForm } from "@/components/yape-proof-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pagar por Yape | Yemape",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function YapePaymentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const config = yapeConfiguration();
  const db = serviceSupabase();
  if (!UUID_RE.test(token) || !config || !db) notFound();

  const { data: order, error } = await db
    .from("orders")
    .select("id,public_code,total_cents,deposit_cents,quote_required,status")
    .eq("yape_payment_token", token)
    .maybeSingle();
  if (error || !order) notFound();

  const { data: pending, error: paymentError } = await db
    .from("payments")
    .select("id")
    .eq("order_id", order.id)
    .eq("method", "yape")
    .eq("status", "pending")
    .limit(1);
  if (paymentError) throw new Error("No se pudo consultar el estado del pago.");

  const outstanding = Math.max(0, order.total_cents - order.deposit_cents);
  const canPay =
    !order.quote_required && order.status !== "Cancelado" && outstanding > 0;

  return (
    <main className="yape-page">
      <div className="yape-shell">
        <Link href="/" className="text-link">← Volver a Yemape</Link>
        <section className="yape-hero">
          <span className="eyebrow">PAGO DEL PEDIDO {order.public_code}</span>
          <h1>Completa tu pedido con Yape</h1>
          <p>Usa los datos oficiales de Yemape y envía tu comprobante aquí.
            Revisaremos el abono antes de confirmarlo.</p>
        </section>

        {!canPay ? (
          <section className="panel yape-unavailable">
            <CheckCircle2 size={28} />
            <h2>{order.status === "Cancelado" ? "Este pedido fue cancelado" : outstanding <= 0 ? "Este pedido no tiene saldo pendiente" : "El pago aún no está disponible"}</h2>
            <p>{outstanding <= 0
              ? "Si ya enviaste un comprobante, espera nuestra confirmación."
              : "Primero confirmaremos el importe final del pedido contigo por WhatsApp."}</p>
          </section>
        ) : (
          <div className="yape-grid">
            <section className="panel yape-instructions">
              <div className="yape-heading">
                <Smartphone size={24} aria-hidden="true" />
                <div>
                  <span className="eyebrow">PASO 1 · YAPEA EL IMPORTE</span>
                  <h2>Datos para pagar</h2>
                </div>
              </div>
              <p className="yape-balance-label">Saldo pendiente del pedido</p>
              <strong className="yape-balance">{money(outstanding)}</strong>
              <div className="yape-account">
                <span>Número de Yape</span>
                <strong>{config.number}</strong>
                <span>Nombre del destinatario</span>
                <strong>{config.holder}</strong>
              </div>
              {config.qrUrl && (
                <div className="yape-qr">
                  <Image
                    src={config.qrUrl}
                    width={280}
                    height={280}
                    unoptimized
                    alt="QR de Yape de Repostería Yemape"
                  />
                  <small>Comprueba que el nombre en Yape coincida antes de enviar dinero.</small>
                </div>
              )}
              <YapeProofForm
                token={token}
                outstandingCents={outstanding}
                hasPendingProof={Boolean(pending?.length)}
                number={config.number}
              />
            </section>

            <aside className="panel yape-help">
              <span className="eyebrow">CÓMO FUNCIONA</span>
              <ol>
                <li><Smartphone size={18} aria-hidden="true" /><span>Abre Yape y paga al número o QR mostrado.</span></li>
                <li><ShieldCheck size={18} aria-hidden="true" /><span>Comprueba el nombre del destinatario y guarda tu captura.</span></li>
                <li><Clock3 size={18} aria-hidden="true" /><span>Adjunta la captura. El pago quedará pendiente hasta que lo verifiquemos.</span></li>
              </ol>
              <p>Esta página no se conecta a tu cuenta de Yape ni confirma el pago automáticamente.</p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
