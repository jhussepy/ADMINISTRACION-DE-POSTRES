"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, MessageCircle } from "lucide-react";
import type { Product } from "@/lib/types";
import { categories } from "@/lib/types";
import { DessertFilm } from "./dessert-film";
import { ProductFilm } from "./product-film";
import { productFilm } from "@/lib/product-media";

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

export function HomeCategories({ products }: { products: Product[] }) {
  const selections = categories.flatMap((category) => {
    const cover = products.find((product) => product.category === category);
    return cover ? [{ category, cover }] : [];
  });
  if (!selections.length) return null;

  return (
    <section
      className="home-categories category-section"
      aria-label="Categorías de postres"
    >
      <div className="section-heading" data-reveal>
        <div>
          <span className="eyebrow">LA CARTA, A TU MANERA</span>
          <h2>Cada antojo tiene su lugar.</h2>
        </div>
        <Link className="text-link" href="/catalogo">
          Toda la carta <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <div className="category-list photo-category-list">
        {selections.map(({ category, cover }, index) => (
          <Link
            className="photo-category"
            key={category}
            href={`/catalogo?categoria=${encodeURIComponent(category)}`}
            aria-label={category}
          >
            <div className="photo-category-frame">
              <Image
                src={cover.image}
                alt=""
                fill
                sizes="(max-width: 620px) 42vw, (max-width: 950px) 28vw, 180px"
              />
            </div>
            <div className="photo-category-caption">
              <span className="photo-category-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{category}</span>
              <ArrowRight size={17} aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
      <span className="photo-category-hint" aria-hidden="true">
        Desliza y encuentra tu antojo <ArrowRight size={14} />
      </span>
    </section>
  );
}

export function DessertSpotlight({
  product,
  onSelect,
  paused,
}: {
  product: Product;
  onSelect: SelectProduct;
  paused: boolean;
}) {
  const film = productFilm(product);
  return (
    <section
      id="hecho-con-carino"
      className="dessert-spotlight immersive-spotlight editorial-spotlight"
      aria-labelledby="spotlight-title"
    >
      <div className="spotlight-editorial-layout">
        <figure className="spotlight-editorial-figure" data-reveal>
          <div
            className={`spotlight-editorial-photo${film ? " has-product-film" : ""}`}
          >
            {film ? (
              <ProductFilm
                media={film}
                name={product.name}
                autoplay
                paused={paused}
              />
            ) : (
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 760px) 90vw, (max-width: 1300px) 50vw, 640px"
              />
            )}
          </div>
          <figcaption>
            <span>POSTRE DESTACADO</span>
            <span>{product.category}</span>
          </figcaption>
        </figure>
        <div className="spotlight-editorial-copy" data-reveal>
          <span className="patisserie-eyebrow">EL TOQUE YEMAPE</span>
          <h2 id="spotlight-title">
            El detalle que hace <em>la diferencia.</em>
          </h2>
          <div className="spotlight-editorial-product">
            <h3>{product.name}</h3>
            <p>{product.description}</p>
          </div>
          <button
            type="button"
            className="button"
            onClick={(event) => onSelect(product, event.currentTarget)}
            aria-label={`Elegir ${product.name} en el postre estrella`}
          >
            Elige tu presentación <ArrowRight size={18} aria-hidden="true" />
          </button>
          <p className="spotlight-editorial-note">
            Lo coordinamos contigo por WhatsApp.
            <small>Presentación, disponibilidad y precio por confirmar.</small>
          </p>
        </div>
      </div>
    </section>
  );
}
