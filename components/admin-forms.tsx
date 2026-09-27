"use client";
import { useActionState } from "react";
import { saveProduct, saveOrder, updateOrder } from "@/app/admin/actions";
import {
  categories,
  orderStatuses,
  type Product,
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
