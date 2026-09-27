"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="state-page">
      <p className="eyebrow">YEMAPE</p>
      <h1>Un momento, por favor.</h1>
      <p>
        No pudimos cargar esta página. Tu carrito sigue guardado en este
        navegador.
      </p>
      <button className="button" onClick={reset}>
        Volver a intentar
      </button>
      <a href="/">Volver al catálogo</a>
    </main>
  );
}
