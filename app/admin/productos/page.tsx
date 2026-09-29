import Link from "next/link";
import { requireAdmin } from "@/lib/data";
import {
  ProductForm,
  ProductImagesPanel,
  ProductVariantsPanel,
} from "@/components/admin-forms";
import type { Product, ProductImage, ProductVariant } from "@/lib/types";
import { money } from "@/lib/cart";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const db = await requireAdmin();
  const [{ data, error }, variantsResult, imagesResult, params] =
    await Promise.all([
      db.from("products").select("*").order("sort_order"),
      db
        .from("product_variants")
        .select("id,product_id,slug,label,price_cents,active,sort_order")
        .order("product_id")
        .order("sort_order"),
      db
        .from("product_images")
        .select(
          "id,product_id,storage_path,alt_text,is_cover,active,sort_order",
        )
        .order("product_id")
        .order("sort_order"),
      searchParams,
    ]);

  if (error) throw new Error("No se pudieron cargar los productos.");

  const products = data as Product[];
  const editing = products.find((product) => product.id === params.editar);
  const variantsMissing =
    variantsResult.error &&
    ["42P01", "PGRST205"].includes(variantsResult.error.code);
  if (variantsResult.error && !variantsMissing)
    throw new Error("No se pudieron cargar las presentaciones del catálogo.");
  const variantsEnabled = !variantsResult.error;
  const variants = variantsEnabled
    ? ((variantsResult.data ?? []) as ProductVariant[])
    : [];

  const imagesMissing =
    imagesResult.error &&
    ["42P01", "PGRST205"].includes(imagesResult.error.code);
  if (imagesResult.error && !imagesMissing)
    throw new Error("No se pudieron cargar las fotografías del catálogo.");
  const imagesEnabled = !imagesResult.error;
  const images = imagesEnabled
    ? (imagesResult.data ?? []).map((row) => ({
        ...row,
        url: db.storage
          .from("product-images")
          .getPublicUrl(row.storage_path).data.publicUrl,
      })) as ProductImage[]
    : [];

  const variantsFor = (productId: string) =>
    variants.filter((variant) => variant.product_id === productId);
  const imagesFor = (productId: string) =>
    images
      .filter((image) => image.product_id === productId)
      .sort(
        (a, b) =>
          Number(b.is_cover) - Number(a.is_cover) ||
          a.sort_order - b.sort_order,
      );

  return (
    <div className="admin-grid admin-products-grid">
      <section className="panel admin-product-editor">
        <div className="admin-section-kicker">
          <span className="eyebrow">CATÁLOGO</span>
          <h2>{editing ? "Editar producto" : "Nuevo producto"}</h2>
        </div>
        <ProductForm key={editing?.id ?? "new"} product={editing} />
        {editing && (
          <>
            <ProductVariantsPanel
              product={editing}
              variants={variantsFor(editing.id)}
              enabled={variantsEnabled}
            />
            <ProductImagesPanel
              product={editing}
              images={imagesFor(editing.id)}
              enabled={imagesEnabled}
            />
            <Link className="text-link" href="/admin/productos">
              Crear otro producto
            </Link>
          </>
        )}
        {!editing && (
          <p className="subtle admin-edit-hint">
            Guarda el producto y después pulsa “Editar producto” para añadir
            presentaciones y precios reales.
          </p>
        )}
      </section>

      <section className="admin-list" aria-label="Productos del negocio">
        <div className="admin-list-heading">
          <div>
            <span className="eyebrow">TU CARTA</span>
            <h2>{products.length} productos</h2>
          </div>
          <div className="admin-feature-badges">
            <span className={`badge ${variantsEnabled ? "" : "inactive"}`}>
              {variantsEnabled ? "Commerce V2" : "Variantes pendientes"}
            </span>
            <span className={`badge ${imagesEnabled ? "" : "inactive"}`}>
              {imagesEnabled ? "Galería V3" : "Galería pendiente"}
            </span>
          </div>
        </div>

        {!variantsEnabled && (
          <div className="admin-migration-notice">
            <strong>Activa Commerce V2</strong>
            <p>
              Ejecuta <code>supabase/variants-v2.sql</code> en Supabase SQL
              Editor. La tienda pública sigue funcionando mientras tanto con
              sus presentaciones actuales.
            </p>
          </div>
        )}
        {!imagesEnabled && (
          <div className="admin-migration-notice">
            <strong>Activa Galería V3</strong>
            <p>
              Ejecuta <code>supabase/product-images-v3.sql</code> para subir
              fotografías directamente desde Administración.
            </p>
          </div>
        )}

        {products.length ? (
          products.map((product) => {
            const productVariants = variantsFor(product.id);
            const activeVariants = productVariants.filter(
              (variant) => variant.active,
            );
            const productImages = imagesFor(product.id);
            return (
              <article className="admin-row product-admin-card" key={product.id}>
                <div className="admin-row-head">
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.category}</p>
                  </div>
                  <span className={`badge ${product.active ? "" : "inactive"}`}>
                    {product.active ? "Visible" : "Oculto"}
                  </span>
                </div>

                {productVariants.length > 0 ? (
                  <div className="variant-summary">
                    <strong>
                      {activeVariants.length}{" "}
                      {activeVariants.length === 1
                        ? "presentación activa"
                        : "presentaciones activas"}
                    </strong>
                    <div>
                      {productVariants.slice(0, 3).map((variant) => (
                        <span key={variant.id}>
                          {variant.label} ·{" "}
                          {variant.price_cents === null
                            ? "Por cotizar"
                            : money(variant.price_cents)}
                        </span>
                      ))}
                      {productVariants.length > 3 && (
                        <span>+{productVariants.length - 3} más</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p>
                    {product.presentation} ·{" "}
                    {product.price_cents === null
                      ? "Sin precio real todavía"
                      : money(product.price_cents)}
                  </p>
                )}

                <div className="product-admin-media-summary">
                  <span>
                    {productImages.length
                      ? `${productImages.length} ${productImages.length === 1 ? "foto" : "fotos"} en galería`
                      : "Usando foto actual del repositorio"}
                  </span>
                  {productImages.some((image) => image.is_cover) && (
                    <span>Portada configurada</span>
                  )}
                </div>
                <Link
                  href={`/admin/productos?editar=${encodeURIComponent(product.id)}`}
                >
                  Editar producto, precios y fotos
                </Link>
              </article>
            );
          })
        ) : (
          <p>
            Aún no hay productos. Crea el primero para mostrarlo en la carta.
          </p>
        )}
      </section>
    </div>
  );
}
