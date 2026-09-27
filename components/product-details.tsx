"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, Minus, Plus, ShoppingBag, MessageCircle } from "lucide-react";
import type { Product } from "@/lib/types";
import { MAX_QUANTITY, money } from "@/lib/cart";
export function ProductDetails({
  product,
  inCart,
  returnFocusTo,
  onClose,
  onAdd,
}: {
  product: Product;
  inCart: number;
  returnFocusTo: HTMLElement | null;
  onClose: () => void;
  onAdd: (quantity: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [quantity, setQuantity] = useState(1);
  const remaining = Math.max(0, MAX_QUANTITY - inCart);
  const selected = Math.min(quantity, remaining);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previous;
      returnFocusTo?.focus({ preventScroll: true });
    };
  }, [returnFocusTo]);
  return (
    <dialog
      ref={dialog}
      className="product-dialog"
      aria-labelledby="product-detail-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="product-detail-layout">
        <button
          className="icon-button detail-close"
          aria-label="Cerrar detalle del producto"
          onClick={onClose}
          autoFocus
        >
          <X />
        </button>
        <div className="detail-image">
          <Image
            src={product.image}
            alt={`Diseño referencial completo de ${product.name}`}
            width={700}
            height={940}
            sizes="(max-width: 680px) 85vw, 450px"
          />
        </div>
        <div className="detail-copy">
          <span className="eyebrow">{product.category}</span>
          <h2 id="product-detail-title">{product.name}</h2>
          <p>{product.description}</p>
          <dl className="detail-specs">
            <div>
              <dt>Presentación</dt>
              <dd>{product.presentation}</dd>
            </div>
            <div>
              <dt>Precio por presentación</dt>
              <dd>
                {product.price_cents === null
                  ? "Por consultar"
                  : money(product.price_cents)}
              </dd>
            </div>
          </dl>
          <p className="detail-note">
            Imagen referencial. Confirmaremos el tamaño y la presentación de tu
            pedido por WhatsApp.
          </p>
          <div className="detail-quantity">
            <span id="detail-quantity-label">Cantidad</span>
            <div
              className="quantity"
              role="group"
              aria-labelledby="detail-quantity-label"
            >
              <button
                disabled={selected <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Reducir cantidad del producto"
              >
                <Minus size={16} />
              </button>
              <output aria-live="polite">{selected}</output>
              <button
                disabled={selected >= remaining}
                onClick={() => setQuantity((q) => Math.min(remaining, q + 1))}
                aria-label="Aumentar cantidad del producto"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          {inCart > 0 && (
            <p className="detail-note">Ya tienes {inCart} en el carrito.</p>
          )}
          <button
            className="button full"
            disabled={remaining === 0}
            onClick={() => onAdd(selected)}
          >
            <ShoppingBag size={18} />
            {remaining === 0
              ? "Límite de unidades alcanzado"
              : `Agregar ${selected} al carrito`}
            {product.price_cents !== null && remaining > 0 && (
              <span>· {money(product.price_cents * selected)}</span>
            )}
          </button>
          <p className="detail-reassurance">
            <MessageCircle size={16} /> Coordina tu pedido sin necesidad de
            registrarte.
          </p>
        </div>
      </div>
    </dialog>
  );
}
