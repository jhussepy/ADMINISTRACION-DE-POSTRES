"use client";
import { useActionState } from "react";
import {
  deleteVariant,
  saveOrder,
  saveProduct,
  saveVariant,
  updateOrder,
} from "@/app/admin/actions";
import {
  categories,
  orderStatuses,
  type Product,
  type ProductVariant,
  type Order,
  type ActionState,
} from "@/lib/types";
import { productImages } from "@/lib/products";
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
  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <label>
        Nombre
        <input
          name="name"
          defaultValue={product?.name ?? ""}
          required
          minLength={3}
          maxLength={120}
        />
      </label>
      <label>
        Descripción
        <textarea
          name="description"
          defaultValue={product?.description ?? ""}
          rows={3}
          maxLength={500}
        />
      </label>
      <div className="two-cols">
        <label>
          Categoría
          <select
            name="category"
            defaultValue={product?.category ?? "Cheesecakes"}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Precio en soles
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            max="999999.99"
            defaultValue={
              product?.price_cents == null
                ? ""
                : (product.price_cents / 100).toFixed(2)
            }
            placeholder="Vacío = por cotizar"
          />
        </label>
      </div>
      <label>
        Presentación
        <input
          name="presentation"
          defaultValue={product?.presentation ?? ""}
          placeholder="Ej.: Torta entera · 12 porciones"
          required
          minLength={2}
          maxLength={120}
        />
      </label>
      <label>
        Diseño de producto
        <select
          name="image"
          defaultValue={product?.image ?? productImages[0].path}
        >
          {productImages.map((i) => (
            <option value={i.path} key={i.path}>
              {i.label}
            </option>
          ))}
        </select>
      </label>
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
        {pending ? "Guardando…" : "Guardar producto"}
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
