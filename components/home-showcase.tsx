"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, CakeSlice, MessageCircle } from "lucide-react";
import type { Product } from "@/lib/types";
import { DessertFilm } from "./dessert-film";

type SelectProduct = (product: Product, trigger: HTMLButtonElement) => void;

function usesChocolateFilm(product: Product) {
  // If the administrator replaces the cover, use that real photo everywhere.
  return (
    product.id === "torta-chocolate" &&
    product.image === "/images/torta-chocolate.webp"
  );
}

export function HomeHero({
  featured,
  paused,
  onSelect,
}: {
  featured?: Product;
  paused: boolean;
  onSelect: SelectProduct;
}) {
  const hasFilm = featured && usesChocolateFilm(featured);
  return (
    <section
      className={`patisserie-hero immersive-hero ${featured ? "" : "without-dessert"}`}
      aria-labelledby="hero-title"
    >
      <div className="hero-grain" aria-hidden="true" />
      <div className="patisserie-copy">
        <span className="patisserie-eyebrow">
          <span /> EL ARTE DE COMPARTIR · YEMAPE
        </span>
        <h1 id="hero-title">
          Un pequeño
          <br />
          <em>antojo.</em>
          <br />
          Un gran momento.
        </h1>
        <p>
          Tortas, kekes y postres para convertir cualquier día en algo especial.
        </p>
        <div className="patisserie-actions">
          <Link href="/catalogo" className="button">
            Explorar la carta <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <a href="#como-pedir" className="patisserie-text-link">
            Cómo hacer tu pedido <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="patisserie-personal-note">
          <MessageCircle size={18} aria-hidden="true" />
          <p>
            Elige a tu ritmo.
            <br />
            <strong>Lo coordinamos por WhatsApp.</strong>
          </p>
        </div>
      </div>
      {featured && (
        <div
          className={`patisserie-scene immersive-scene ${hasFilm ? "has-film" : "is-photo"}`}
        >
          {hasFilm ? (
            <DessertFilm name={featured.name} paused={paused} />
          ) : (
            <div className="hero-custom-photo">
              <Image
                src={featured.image}
                alt={featured.name}
                fill
                preload
                sizes="(max-width: 700px) 90vw, 650px"
              />
            </div>
          )}
          <div className="patisserie-caption">
            <div>
              <span>EL ANTOJO DE HOY</span>
              <strong>{featured.name}</strong>
            </div>
            <button
              type="button"
              onClick={(event) => onSelect(featured, event.currentTarget)}
              aria-label={`Descubrir ${featured.name}`}
            >
              <ArrowRight size={22} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      <a className="patisserie-explore" href="#destacados">
        <ArrowDown size={16} aria-hidden="true" /> Sigue tu antojo
      </a>
      <span className="hero-bottom-note">
        REPOSTERÍA ARTESANAL · BUENOS MOMENTOS
      </span>
    </section>
  );
}

export function DessertSpotlight({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: SelectProduct;
}) {
  return (
    <section
      id="hecho-con-carino"
      className="dessert-spotlight immersive-spotlight"
      aria-labelledby="spotlight-title"
    >
      <div className="spotlight-intro">
        <span className="patisserie-eyebrow">EL TOQUE YEMAPE</span>
        <h2 id="spotlight-title">
          El detalle que hace
          <br />
          <em>la diferencia.</em>
        </h2>
        <p>
          Ese cumpleaños que esperabas, una tarde en familia o un detalle para
          alguien especial. Hay un postre para cada momento.
        </p>
      </div>
      <div className="spotlight-composition">
        <article className="spotlight-feature feature-one">
          <span>01 / TU ANTOJO</span>
          <h3>El sabor que eliges</h3>
          <p>
            Descubre la descripción de cada postre y encuentra tu próximo
            favorito.
          </p>
        </article>
        <article className="spotlight-feature feature-two">
          <span>02 / TU PRESENTACIÓN</span>
          <h3>Para tu momento</h3>
          <p>
            Revisa las presentaciones en la ficha. Coordinamos tamaño y
            disponibilidad contigo.
          </p>
        </article>
        <div className="spotlight-dessert is-photo">
          <div className="spotlight-photo">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 700px) 90vw, 540px"
            />
          </div>
        </div>
        <article className="spotlight-feature feature-three">
          <span>03 / A TU RITMO</span>
          <h3>Con cuenta o sin ella</h3>
          <p>
            Explora, elige y llena tu carrito. Puedes pedir sin crear una
            cuenta.
          </p>
        </article>
        <article className="spotlight-feature feature-four">
          <span>04 / CONTIGO</span>
          <h3>Lo conversamos</h3>
          <p>
            Confirmamos fecha, entrega e importe por WhatsApp antes de preparar
            tu pedido.
          </p>
        </article>
      </div>
      <div className="spotlight-choice">
        <span className="spotlight-category">
          <CakeSlice size={17} aria-hidden="true" /> {product.category}
        </span>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <button
          type="button"
          className="button"
          onClick={(event) => onSelect(product, event.currentTarget)}
          aria-label={`Elegir ${product.name} en el postre estrella`}
        >
          Elige tu presentación <ArrowRight size={18} aria-hidden="true" />
        </button>
        <small>Presentación, disponibilidad y precio por confirmar.</small>
      </div>
    </section>
  );
}
