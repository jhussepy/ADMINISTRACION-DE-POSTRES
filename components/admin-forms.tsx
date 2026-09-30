"use client";
import { useActionState } from "react";
import {
  deleteProductImage,
  deleteVariant,
  saveOrder,
  saveProduct,
  saveProductImage,
  saveVariant,
  setProductImageCover,
  updateOrder,
  uploadProductImage,
} from "@/app/admin/actions";
import {
  categories,
  orderStatuses,
  type Product,
  type ProductImage,
  type ProductVariant,
  type Order,
  type ActionState,
} from "@/lib/types";
function Feedback({ state }: { state: ActionState }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="form-success">
          {state.success}
        </p>
      )}
    </>
  );
}
export function ProductForm({ product }: { product?: Product }) {
  const [state, action, pending] = useActionState(saveProduct, {});
  const isNew = !product;

  return (
    <form action={action} className="stack-form product-core-form">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <input
        type="hidden"
        name="presentation"
        value={product?.presentation ?? "Varias presentaciones"}
      />
      <input
        type="hidden"
        name="price"
        value={
          product?.price_cents == null
            ? ""
            : (product.price_cents / 100).toFixed(2)
        }
      />
      <input
        type="hidden"
        name="image"
        value={product?.image ?? "/images/product-placeholder.svg"}
      />

      <label>
        Nombre
        <input
          name="name"
          defaultValue={product?.name ?? ""}
          required
          minLength={3}
          maxLength={120}
          placeholder="Ej.: Keke de zanahoria con almendras y pasas"
        />
      </label>

      <label>
        Descripción
        <textarea
          name="description"
          defaultValue={product?.description ?? ""}
          rows={4}
          maxLength={500}
          placeholder="Describe sabor, textura y para qué ocasión lo recomiendas."
        />
      </label>

      <label>
        Categoría
        <select
          name="category"
          defaultValue={product?.category ?? "Kekes"}
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>

      {isNew ? (
        <>
          <section className="new-product-variants">
            <div>
              <span className="eyebrow">PRECIOS INICIALES</span>
              <h3>¿Cómo lo venderás?</h3>
              <p>
                Crea de una vez la porción individual y el producto entero.
                Después podrás añadir otros tamaños.
              </p>
            </div>

            <div className="initial-variant-grid">
              <label className="initial-variant-card">
                <span className="initial-variant-title">
                  <input
                    name="initial_portion_active"
                    type="checkbox"
                    defaultChecked
                  />
                  <strong>Porción individual</strong>
                </span>
                <span>Precio por porción (S/)</span>
                <input
                  name="initial_portion_price"
                  type="number"
                  min="0"
                  step="0.01"
                  max="999999.99"
                  placeholder="Ej.: 8.00"
                />
                <small>Puede quedar vacío si todavía vas a cotizar.</small>
              </label>

              <label className="initial-variant-card">
                <span className="initial-variant-title">
                  <input
                    name="initial_whole_active"
                    type="checkbox"
                    defaultChecked
                  />
                  <strong>Entero</strong>
                </span>
                <span>Precio entero (S/)</span>
                <input
                  name="initial_whole_price"
                  type="number"
                  min="0"
                  step="0.01"
                  max="999999.99"
                  placeholder="Ej.: 45.00"
                />
                <small>Luego puedes añadir mediano, grande, caja, etc.</small>
              </label>
            </div>
          </section>

          <section className="new-product-photo">
            <div>
              <span className="eyebrow">FOTO PRINCIPAL</span>
              <h3>Sube la foto de este producto</h3>
              <p>
                Ya no tienes que escoger la imagen de otro postre. Si todavía
                no tienes foto, se mostrará un diseño neutro hasta que la subas.
              </p>
            </div>
            <label className="media-file-field">
              <span>Fotografía del producto</span>
              <input
                type="file"
                name="initial_image"
                accept="image/jpeg,image/png,image/webp"
                disabled={pending}
              />
              <small>JPG, PNG o WebP · máximo 5 MB</small>
            </label>
          </section>
        </>
      ) : (
        <div className="product-management-note">
          <strong>Precios y fotografías se gestionan por separado.</strong>
          <p>
            Usa “Presentaciones y precios” y “Galería de fotografías” debajo
            para modificar importes, tamaños y portada.
          </p>
        </div>
      )}

      <label>
        Orden en el catálogo
        <input
          type="number"
          name="sort_order"
          defaultValue={product?.sort_order ?? 10}
          min={0}
          max={999}
          required
        />
      </label>

      <label className="checkbox-label">
        <input
          name="active"
          type="checkbox"
          defaultChecked={product?.active ?? true}
        />{" "}
        Visible en el catálogo
      </label>

      <Feedback state={state} />
      <button className="button" disabled={pending}>
        {pending
          ? "Guardando…"
          : isNew
            ? "Crear producto"
            : "Guardar información"}
      </button>
    </form>
  );
}

export function ProductVariantsPanel({
  product,
  variants,
  enabled,
}: {
  product: Product;
  variants: ProductVariant[];
  enabled: boolean;
}) {
  if (!enabled)
    return (
      <section className="variant-panel variant-panel-disabled">
        <div className="variant-panel-heading">
          <div>
            <span className="eyebrow">COMMERCE V2</span>
            <h3>Presentaciones reales</h3>
          </div>
          <span className="badge inactive">Pendiente</span>
        </div>
        <p>
          Ejecuta <code>supabase/variants-v2.sql</code> en Supabase SQL Editor
          para activar precios y presentaciones administrables. La tienda
          seguirá usando los datos actuales hasta entonces.
        </p>
      </section>
    );

  return (
    <section className="variant-panel">
      <div className="variant-panel-heading">
        <div>
          <span className="eyebrow">COMMERCE V2</span>
          <h3>Presentaciones y precios</h3>
        </div>
        <span className="badge">
          {variants.length} {variants.length === 1 ? "variante" : "variantes"}
        </span>
      </div>
      <p className="subtle">
        Estas opciones tienen prioridad sobre los precios de muestra. Puedes
        activarlas o desactivarlas sin eliminar el producto.
      </p>
      <VariantForm productId={product.id} />
      {variants.length > 0 && (
        <div className="variant-list">
          {variants.map((variant) => (
            <VariantForm
              key={variant.id}
              productId={product.id}
              variant={variant}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function VariantForm({
  productId,
  variant,
}: {
  productId: string;
  variant?: ProductVariant;
}) {
  const [state, action, pending] = useActionState(saveVariant, {});
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteVariant,
    {},
  );
  const existing = Boolean(variant);

  return (
    <article className={`variant-editor ${existing ? "is-existing" : "is-new"}`}>
      <div className="variant-editor-title">
        <strong>{existing ? variant!.label : "Nueva presentación"}</strong>
        {existing && (
          <span className={`badge ${variant!.active ? "" : "inactive"}`}>
            {variant!.active ? "Activa" : "Oculta"}
          </span>
        )}
      </div>
      <form action={action} className="stack-form compact-form">
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="variant_id" value={variant?.id ?? ""} />
        <div className="two-cols">
          <label>
            Nombre visible
            <input
              name="label"
              defaultValue={variant?.label ?? ""}
              placeholder="Ej.: Mediana · 10 porciones"
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <label>
            Identificador
            <input
              name="slug"
              defaultValue={variant?.slug ?? ""}
              placeholder="Ej.: mediana"
              required
              minLength={1}
              maxLength={50}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            />
            <small>Solo minúsculas, números y guiones.</small>
          </label>
        </div>
        <div className="two-cols">
          <label>
            Precio en soles
            <input
              name="price"
              type="number"
              min="0"
              max="999999.99"
              step="0.01"
              defaultValue={
                variant?.price_cents == null
                  ? ""
                  : (variant.price_cents / 100).toFixed(2)
              }
              placeholder="Vacío = por cotizar"
            />
          </label>
          <label>
            Orden
            <input
              name="sort_order"
              type="number"
              min={0}
              max={999}
              defaultValue={variant?.sort_order ?? variantsDefaultOrder(variant)}
              required
            />
          </label>
        </div>
        <label className="checkbox-label">
          <input
            name="active"
            type="checkbox"
            defaultChecked={variant?.active ?? true}
          />
          Disponible para clientes
        </label>
        <Feedback state={state} />
        <button className="button" disabled={pending}>
          {pending
            ? "Guardando…"
            : existing
              ? "Guardar presentación"
              : "Añadir presentación"}
        </button>
      </form>
      {existing && (
        <form action={deleteAction} className="variant-delete-form">
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="variant_id" value={variant!.id} />
          <Feedback state={deleteState} />
          <button className="text-button danger-button" disabled={deleting}>
            {deleting ? "Eliminando…" : "Eliminar presentación"}
          </button>
        </form>
      )}
    </article>
  );
}

function variantsDefaultOrder(variant?: ProductVariant) {
  return variant?.sort_order ?? 10;
}

export function ProductImagesPanel({
  product,
  images,
  enabled,
}: {
  product: Product;
  images: ProductImage[];
  enabled: boolean;
}) {
  if (!enabled)
    return (
      <section className="media-panel media-panel-disabled">
        <div className="variant-panel-heading">
          <div>
            <span className="eyebrow">ADMIN V2</span>
            <h3>Galería de fotografías</h3>
          </div>
          <span className="badge inactive">Pendiente</span>
        </div>
        <p>
          Ejecuta <code>supabase/product-images-v3.sql</code> en Supabase SQL
          Editor para subir y administrar fotografías desde este panel.
        </p>
      </section>
    );

  return (
    <section className="media-panel">
      <div className="variant-panel-heading">
        <div>
          <span className="eyebrow">ADMIN V2</span>
          <h3>Galería de fotografías</h3>
        </div>
        <span className="badge">
          {images.length}/8 {images.length === 1 ? "foto" : "fotos"}
        </span>
      </div>
      <p className="subtle">
        Sube hasta 8 imágenes JPG, PNG o WebP. La portada se usa
        automáticamente en catálogo, ficha y al compartir el producto.
      </p>
      <ProductImageUpload product={product} disabled={images.length >= 8} />
      {images.length > 0 ? (
        <div className="media-grid">
          {images.map((image) => (
            <ProductImageEditor
              key={image.id}
              product={product}
              image={image}
            />
          ))}
        </div>
      ) : (
        <div className="media-empty">
          <strong>Aún no hay fotos subidas desde Admin.</strong>
          <p>
            La tienda seguirá usando la fotografía actual del repositorio hasta
            que subas la primera.
          </p>
        </div>
      )}
    </section>
  );
}

function ProductImageUpload({
  product,
  disabled,
}: {
  product: Product;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(uploadProductImage, {});

  return (
    <form action={action} className="media-upload-form">
      <input type="hidden" name="product_id" value={product.id} />
      <label className="media-file-field">
        <span>Subir nueva fotografía</span>
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={disabled || pending}
        />
        <small>Máximo 5 MB · JPG, PNG o WebP</small>
      </label>
      <label>
        Texto alternativo <small>(opcional)</small>
        <input
          name="alt_text"
          maxLength={160}
          placeholder={`Fotografía de ${product.name}`}
          disabled={disabled || pending}
        />
      </label>
      <Feedback state={state} />
      <button className="button" disabled={disabled || pending}>
        {disabled
          ? "Máximo de 8 fotografías"
          : pending
            ? "Subiendo…"
            : "Subir fotografía"}
      </button>
    </form>
  );
}

function ProductImageEditor({
  product,
  image,
}: {
  product: Product;
  image: ProductImage;
}) {
  const [state, action, pending] = useActionState(saveProductImage, {});
  const [coverState, coverAction, covering] = useActionState(
    setProductImageCover,
    {},
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteProductImage,
    {},
  );

  return (
    <article className={`media-card ${image.is_cover ? "is-cover" : ""}`}>
      <div className="media-preview">
        {/* Admin preview deliberately uses the exact public Storage URL. */}
        <img src={image.url} alt={image.alt_text || product.name} />
        <div className="media-badges">
          {image.is_cover && <span className="badge">Portada</span>}
          {!image.active && <span className="badge inactive">Oculta</span>}
        </div>
      </div>

      <form action={action} className="stack-form compact-form media-editor-form">
        <input type="hidden" name="image_id" value={image.id} />
        <input type="hidden" name="product_id" value={product.id} />
        <label>
          Texto alternativo
          <input
            name="alt_text"
            defaultValue={image.alt_text}
            maxLength={160}
            placeholder={`Fotografía de ${product.name}`}
          />
        </label>
        <label>
          Orden
          <input
            name="sort_order"
            type="number"
            min={0}
            max={999}
            defaultValue={image.sort_order}
            required
          />
        </label>
        <label className="checkbox-label">
          <input name="active" type="checkbox" defaultChecked={image.active} />
          Visible para clientes
        </label>
        <Feedback state={state} />
        <button className="button secondary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar foto"}
        </button>
      </form>

      {!image.is_cover && (
        <form action={coverAction}>
          <input type="hidden" name="image_id" value={image.id} />
          <input type="hidden" name="product_id" value={product.id} />
          <Feedback state={coverState} />
          <button className="text-button media-cover-button" disabled={covering}>
            {covering ? "Publicando…" : "Usar como portada"}
          </button>
        </form>
      )}

      <form action={deleteAction}>
        <input type="hidden" name="image_id" value={image.id} />
        <input type="hidden" name="product_id" value={product.id} />
        <Feedback state={deleteState} />
        <button className="text-button danger-button" disabled={deleting}>
          {deleting ? "Eliminando…" : "Eliminar fotografía"}
        </button>
      </form>
    </article>
  );
}

export function OrderForm() {
  const [state, action, pending] = useActionState(saveOrder, {});
  return (
    <form action={action} className="stack-form">
      <label>
        Nombre del cliente
        <input name="customer_name" required minLength={2} maxLength={100} />
      </label>
      <label>
        Teléfono
        <input name="customer_phone" type="tel" required maxLength={20} />
      </label>
      <label>
        Productos y detalles de entrega
        <textarea
          name="details"
          required
          minLength={3}
          maxLength={2000}
          rows={4}
        />
      </label>
      <label>
        Fecha de entrega
        <input name="delivery_date" type="date" required />
      </label>
      <div className="two-cols">
        <label>
          Total acordado (S/)
          <input
            name="total"
            type="number"
            min="0.01"
            max="999999.99"
            step="0.01"
            required
          />
        </label>
        <label>
          Importe abonado (S/)
          <input
            name="deposit"
            type="number"
            min="0"
            max="999999.99"
            step="0.01"
            defaultValue="0"
            required
          />
        </label>
      </div>
      <Feedback state={state} />
      <button className="button" disabled={pending}>
        {pending ? "Guardando…" : "Registrar pedido"}
      </button>
    </form>
  );
}
export function OrderUpdateForm({ order }: { order: Order }) {
  const [state, action, pending] = useActionState(updateOrder, {});
  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="id" value={order.id} />
      <div className="two-cols">
        <label>
          Estado
          <select name="status" defaultValue={order.status}>
            {orderStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Importe abonado (S/)
          <input
            name="deposit"
            type="number"
            min="0"
            max={order.total_cents / 100}
            step="0.01"
            defaultValue={(order.deposit_cents / 100).toFixed(2)}
            required
          />
        </label>
      </div>
      <Feedback state={state} />
      <button className="button secondary" disabled={pending}>
        {pending ? "Guardando…" : "Actualizar"}
      </button>
    </form>
  );
}
