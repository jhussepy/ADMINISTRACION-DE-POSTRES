import { Plus } from "lucide-react";
const questions = [
  {
    question: "¿Necesito una cuenta para pedir?",
    answer:
      "No. Puedes elegir tus productos, completar los datos del pedido y continuar por WhatsApp como invitado.",
  },
  {
    question: "¿Cuándo queda confirmado mi pedido?",
    answer:
      "Después de enviarnos tu selección por WhatsApp y coordinar disponibilidad, presentación, importe y forma de pago. Armar el carrito o abrir el chat todavía no confirma una compra.",
  },
  {
    question: "¿Puedo solicitar delivery o recoger mi pedido?",
    answer:
      "Puedes elegir cualquiera de las dos opciones al completar el pedido. Por WhatsApp confirmaremos cobertura, costo de delivery o punto y horario de recojo.",
  },
  {
    question: "¿Cómo pido una torta personalizada?",
    answer:
      "Agrega la torta personalizada a tu carrito y cuéntanos en las observaciones la temática, la fecha y el número de personas. Coordinaremos contigo el diseño, la presentación y la cotización.",
  },
];
export function StoreFaq() {
  return (
    <section
      className="faq-section section-wrap"
      id="preguntas"
      aria-labelledby="faq-title"
    >
      <div>
        <span className="eyebrow">ANTES DE ELEGIR</span>
        <h2 id="faq-title">Resolvemos tus dudas.</h2>
        <p>Para que solo tengas que pensar en tu próximo antojo.</p>
      </div>
      <div className="faq-list">
        {questions.map((item) => (
          <details key={item.question}>
            <summary>
              {item.question}
              <Plus size={19} aria-hidden="true" />
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
