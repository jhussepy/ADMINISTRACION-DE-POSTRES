"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CakeSlice,
  MessageCircle,
  Pause,
  Play,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { Dessert3D } from "./dessert-3d";

type SelectProduct = (product: Product, trigger: HTMLButtonElement) => void;

// Keep the scene in the native document flow. Only visible scenes respond to
// scroll, with one frame per event; no scroll interception or render loop.
function useSceneMotion(paused: boolean) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let frame = 0;
    function draw() {
      frame = 0;
      const reduced = preference.matches;
      const active = visible && !document.hidden && !paused && !reduced;
      element!.dataset.motion = reduced
        ? "reduced"
        : active
          ? "active"
          : "paused";
      if (reduced) element!.style.setProperty("--scene-shift", "0");
      if (!active) return;
      const bounds = element!.getBoundingClientRect();
      const progress =
        (innerHeight - bounds.top) / (innerHeight + bounds.height) - 0.5;
      element!.style.setProperty(
        "--scene-shift",
        String(Math.max(-0.5, Math.min(0.5, progress))),
      );
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(draw);
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    observer.observe(element);
    function scroll() {
      if (visible && !paused && !preference.matches) schedule();
    }
    function visibility() {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        draw();
      } else schedule();
    }
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", visibility);
    preference.addEventListener("change", schedule);
    schedule();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", visibility);
      preference.removeEventListener("change", schedule);
    };
  }, [paused]);
  return root;
}

function usesChocolateScene(product: Product) {
  // If the administrator replaces the cover, use that real photo everywhere.
  return (
    product.id === "torta-chocolate" &&
    product.image === "/images/torta-chocolate.webp"
  );
}

export function HomeHero({
  featured,
  paused,
  onPause,
  onSelect,
}: {
  featured?: Product;
  paused: boolean;
  onPause: () => void;
  onSelect: SelectProduct;
}) {
  const root = useSceneMotion(paused);
  const modeled = featured && usesChocolateScene(featured);
  return (
    <section
      ref={root}
      className={`patisserie-hero immersive-hero ${featured ? "" : "without-dessert"}`}
      aria-labelledby="hero-title"
      data-motion="paused"
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
          className={`patisserie-scene immersive-scene ${modeled ? "has-model" : "is-photo"}`}
        >
          <span className="hero-scene-word" aria-hidden="true">
            hecho
            <br />
            <em>con cariño</em>
          </span>
          <div className="hero-orbit orbit-one" aria-hidden="true" />
          <div className="hero-orbit orbit-two" aria-hidden="true" />
          <span className="hero-3d-note">
            {modeled ? "CADA ÁNGULO, UN ANTOJO" : "EL ANTOJO DE HOY"}
          </span>
          {modeled ? (
            <Dessert3D name={featured.name} paused={paused} />
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
          {modeled && (
            <button
              className="patisserie-motion-toggle"
              type="button"
              onClick={onPause}
              aria-label={
                paused
                  ? "Reanudar animación del postre"
                  : "Pausar animación del postre"
              }
              aria-pressed={paused}
            >
              {paused ? (
                <Play size={15} aria-hidden="true" />
              ) : (
                <Pause size={15} aria-hidden="true" />
              )}
              <span>{paused ? "Reanudar" : "Pausar"}</span>
            </button>
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
  paused,
  onSelect,
}: {
  product: Product;
  paused: boolean;
  onSelect: SelectProduct;
}) {
  const root = useSceneMotion(paused);
  const layered = usesChocolateScene(product);
  return (
    <section
      id="hecho-con-carino"
      ref={root}
      className="dessert-spotlight immersive-spotlight"
      aria-labelledby="spotlight-title"
      data-motion="paused"
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
        <div
          className={`spotlight-dessert ${layered ? "is-layered" : "is-photo"}`}
        >
          {layered ? (
            <Dessert3D
              name={product.name}
              paused={paused}
              variant="spotlight"
            />
          ) : (
            <div className="spotlight-photo">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 700px) 90vw, 540px"
              />
            </div>
          )}
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
