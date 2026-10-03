import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";

export default function PaymentResultPage() {
  return (
    <main className="payment-result-page">
      <section className="payment-result-card">
        <div className="payment-result-icon">
          <Clock3 size={28} />
        </div>
        <span className="eyebrow">PAGO EN VERIFICACIÓN</span>
        <h1>Estamos confirmando tu pago.</h1>
        <p>
          Volver desde la pasarela no significa que el pago ya esté confirmado.
          Yemape actualizará el pedido únicamente cuando reciba y verifique la
          confirmación del proveedor.
        </p>
        <div className="payment-result-rule">
          <CheckCircle2 size={17} />
          <span>
            No necesitas volver a pagar mientras la operación esté en revisión.
          </span>
        </div>
        <Link className="button" href="/">
          Volver a Repostería Yemape
        </Link>
      </section>
    </main>
  );
}
