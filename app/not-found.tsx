import Link from "next/link";
export default function NotFound() {
  return (
    <main className="state-page">
      <p className="eyebrow">YEMAPE · 404</p>
      <h1>Por aquí no hay postres.</h1>
      <p>Esta página no está disponible.</p>
      <Link className="button" href="/">
        Volver al catálogo
      </Link>
    </main>
  );
}
