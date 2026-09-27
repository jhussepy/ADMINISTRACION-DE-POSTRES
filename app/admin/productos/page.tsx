import Link from "next/link";
import { requireAdmin } from "@/lib/data";
import { ProductForm } from "@/components/admin-forms";
import type { Product } from "@/lib/types";
import { money } from "@/lib/cart";
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const db = await requireAdmin();
  const [{ data, error }, params] = await Promise.all([
    db.from("products").select("*").order("sort_order"),
    searchParams,
  ]);
  if (error) throw new Error("No se pudieron cargar los productos.");
  const products = data as Product[],
    editing = products.find((p) => p.id === params.editar);
  return (
    <div className="admin-grid">
      <section className="panel">
        <h2>{editing ? "Editar producto" : "Nuevo producto"}</h2>
        <ProductForm key={editing?.id ?? "new"} product={editing} />
        {editing && (
          <Link className="text-link" href="/admin/productos">
            Crear otro producto
          </Link>
        )}
      </section>
      <section className="admin-list" aria-label="Productos del negocio">
        {products.length ? (
          products.map((p) => (
            <article className="admin-row" key={p.id}>
              <div className="admin-row-head">
                <h3>{p.name}</h3>
                <span className={`badge ${p.active ? "" : "inactive"}`}>
                  {p.active ? "Visible" : "Oculto"}
                </span>
              </div>
              <p>
                {p.presentation} ·{" "}
                {p.price_cents === null ? "Por cotizar" : money(p.price_cents)}
              </p>
              <Link
                href={`/admin/productos?editar=${encodeURIComponent(p.id)}`}
              >
                Editar producto
              </Link>
            </article>
          ))
        ) : (
          <p>
            Aún no hay productos. Crea el primero para mostrarlo en la carta.
          </p>
        )}
      </section>
    </div>
  );
}
