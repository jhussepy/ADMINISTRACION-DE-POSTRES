"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  MessageCircle,
  Minus,
  Palette,
  Plus,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import { MAX_QUANTITY, money } from "@/lib/cart";
import { productImages } from "@/lib/products";
import type { Product } from "@/lib/types";

export function ProductPage({
  product,
  products,
  inCart,
  ready,
  onAdd,
  onOrder,
  onViewCart,
}: {
  product: Product;
  products: Product[];
  inCart: number;
  ready: boolean;
  onAdd: (amount: number) => void;
  onOrder: (amount: number) => void;
  onViewCart: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const remaining = Math.max(0, MAX_QUANTITY - inCart);
  const selected = Math.min(quantity, remaining);
  const custom = product.id === "torta-personalizada";
  const imageSize = productImages.find((image) => image.path === product.image);
  const related = products
    .filter((item) => item.id !== product.id)
    .sort(
      (a, b) =>
        Number(b.category === product.category) -
        Number(a.category === product.category),
    )
    .slice(0, 3);

  return (
    <>
      <div
        className="product-breadcrumb section-wrap"
        aria-label="Ruta de navegación"
      >
        <Link href="/">Inicio</Link>
        <ChevronRight size={15} aria-hidden="true" />
        <Link
          href={`/catalogo?categoria=${encodeURIComponent(product.category)}`}
        >
          {product.category}
        </Link>
        <ChevronRight size={15} aria-hidden="true" />
        <span aria-current="page">{product.name}</span>
      </div>
      <article id="ficha-postre" className="product-page section-wrap">
        <div className="product-page-image">
          <Image
            src={product.image}
            alt={`Presentación referencial de ${product.name}`}
            width={imageSize?.width ?? 800}
            height={imageSize?.height ?? 1000}
            sizes="(max-width: 760px) 100vw, (max-width: 1440px) 50vw, 620px"
            preload
          />
          <span>Fotografía referencial</span>
        </div>
        <div className="product-page-copy">
          <span className="eyebrow">
            YEMAPE · {product.category.toUpperCase()}
          </span>
          <h1>{product.name}</h1>
          <p className="product-page-lead">{product.description}</p>
          <div className="product-page-price">
            <span>{product.presentation}</span>
            <strong>
              {product.price_cents === null
                ? "Precio por consultar"
                : money(product.price_cents)}
            </strong>
          </div>
          {custom && (
            <div className="custom-invitation">
              <Palette size={24} aria-hidden="true" />
              <p>
                Cada celebración es distinta. Al finalizar, cuéntanos la
                temática, las porciones que necesitas y la fecha. Confirmaremos
                el diseño y la cotización contigo.
              </p>
            </div>
          )}
          <div className="product-page-actions">
            <div className="product-page-quantity">
              <span id="page-quantity-label">Cantidad</span>
              <div
                className="quantity"
                role="group"
                aria-labelledby="page-quantity-label"
              >
                <button
                  type="button"
                  disabled={selected <= 1}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  aria-label="Reducir cantidad del producto"
                >
                  <Minus size={16} />
                </button>
                <output aria-live="polite">{selected}</output>
                <button
                  type="button"
                  disabled={selected >= remaining}
                  onClick={() =>
                    setQuantity((value) => Math.min(remaining, value + 1))
                  }
                  aria-label="Aumentar cantidad del producto"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <button
              type="button"
              className="button product-page-add"
              disabled={!ready || remaining === 0}
              onClick={() => (custom ? onOrder(selected) : onAdd(selected))}
            >
              <ShoppingBag size={19} />
              {remaining === 0
                ? "Límite de unidades alcanzado"
                : custom
                  ? "Agregar y preparar pedido"
                  : `Agregar ${selected} al carrito`}
            </button>
            {inCart > 0 && (
              <button
                type="button"
                className="text-link product-page-cart-link"
                onClick={onViewCart}
              >
                {inCart} en tu carrito · Ver carrito <ArrowRight size={17} />
              </button>
            )}
          </div>
          <p className="product-page-assurance">
            <MessageCircle size={19} aria-hidden="true" />
            Tu pedido se coordina por WhatsApp, con cuenta o como invitado.
            Antes de confirmarlo, revisaremos disponibilidad, presentación e
            importe.
          </p>
        </div>
      </article>
      {custom && (
        <section
          className="custom-process section-wrap"
          aria-labelledby="custom-process-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">UNA TORTA HECHA PARA TU OCASIÓN</span>
              <h2 id="custom-process-title">Cuéntanos cómo la imaginas.</h2>
            </div>
          </div>
          <div className="custom-process-grid">
            <div>
              <Palette aria-hidden="true" />
              <strong>Tu idea</strong>
              <p>
                Describe la temática, los colores y el estilo en el formulario
                de pedido.
              </p>
            </div>
            <div>
              <UsersRound aria-hidden="true" />
              <strong>Las porciones</strong>
              <p>
                Indica para cuántas personas será y coordinaremos la
                presentación.
              </p>
            </div>
            <div>
              <CalendarDays aria-hidden="true" />
              <strong>La fecha</strong>
              <p>
                Elige el día que necesitas. Confirmaremos disponibilidad por
                WhatsApp.
              </p>
            </div>
          </div>
          <p>
            Si tienes una imagen de referencia, podrás enviárnosla por WhatsApp
            al conversar con nosotros.
          </p>
        </section>
      )}
      {related.length > 0 && (
        <section
          className="related-products section-wrap"
          aria-labelledby="related-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">SIGUE EXPLORANDO</span>
              <h2 id="related-title">También te puede gustar.</h2>
            </div>
            <Link className="text-link" href="/catalogo">
              Ver toda la carta <ArrowRight size={18} />
            </Link>
          </div>
          <div className="related-grid">
            {related.map((item) => (
              <Link
                href={`/postres/${item.id}`}
                className="related-card"
                key={item.id}
              >
                <span className="related-image">
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(max-width: 620px) 45vw, 30vw"
                  />
                </span>
                <span className="related-copy">
                  <small>{item.category}</small>
                  <strong>{item.name}</strong>
                  <span>
                    {item.price_cents === null
                      ? "Precio por consultar"
                      : money(item.price_cents)}
                  </span>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ))}
          </div>
          <Link className="back-to-catalog" href="/catalogo">
            <ArrowLeft size={17} /> Volver al catálogo
          </Link>
        </section>
      )}
    </>
  );
}
