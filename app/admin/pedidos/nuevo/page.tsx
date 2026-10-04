import Link from "next/link";
import { OrderForm } from "@/components/admin-forms";

export default function NewManualOrderPage() {
  return (
    <div className="manual-order-page">
      <Link href="/admin/pedidos" className="text-link">
        ← Volver a pedidos
      </Link>
      <section className="panel">
        <span className="eyebrow">PEDIDOS FUERA DE LA WEB</span>
        <h2>Registrar pedido manual</h2>
        <p className="subtle">
          Para pedidos recibidos por teléfono, Instagram o WhatsApp. Los pedidos
          hechos desde el carrito ya se registran automáticamente.
        </p>
        <OrderForm />
      </section>
    </div>
  );
}
