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

function BotanicalMark({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 140"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M49 132C46 93 59 43 82 8M51 102C13 100 10 75 11 53C39 55 53 77 51 102ZM60 66C25 62 22 36 25 15C48 24 61 42 60 66ZM63 60C95 64 101 40 95 24C77 29 68 40 63 60ZM49 111C85 117 96 94 94 76C72 76 52 91 49 111Z"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
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
  const layered = featured && usesChocolateScene(featured);
  return (
    <section
      ref={root}
      className={`patisserie-hero ${featured ? "" : "without-dessert"}`}
      aria-labelledby="hero-title"
      data-motion="paused"
    >
      <div className="patisserie-copy">
        <span className="patisserie-eyebrow">
          <span /> REPOSTERÍA ARTESANAL · YEMAPE
        </span>
        <h1 id="hero-title">
          La vida sabe
          <br />
          mejor con <em>postre.</em>
        </h1>
        <p>
          Tortas, kekes y pequeños antojos que convierten cualquier día en un
          buen momento.
        </p>
        <div className="patisserie-actions">
          <Link href="/catalogo" className="button">
            Ver catálogo <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <a href="#como-pedir" className="patisserie-text-link">
            Cómo hacer tu pedido <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="patisserie-personal-note">
          <span className="patisserie-note-icon">
            <MessageCircle size={19} aria-hidden="true" />
          </span>
          <p>
            <strong>Un antojo, una conversación.</strong>
            <br />
            Elige a tu ritmo. Lo coordinamos por WhatsApp.
          </p>
        </div>
      </div>
      {featured && (
        <div
          className={`patisserie-scene ${layered ? "is-layered" : "is-photo"}`}
        >
          <div className="patisserie-arch" aria-hidden="true" />
          <span className="patisserie-backword" aria-hidden="true">
            Yemape
          </span>
          <BotanicalMark className="patisserie-botanical" />
          <div className="patisserie-stamp" aria-hidden="true">
            <span>HECHO PARA</span>
            <strong>compartir</strong>
            <span>BUENOS MOMENTOS</span>
          </div>
          <div className="patisserie-floor" aria-hidden="true" />
          <div className="patisserie-cake scene-scroll">
            <div className="scene-ambient">
              <Image
                src={
                  layered
                    ? "/images/torta-chocolate-cuerpo.webp"
                    : featured.image
                }
                alt={featured.name}
                fill
                preload
                sizes="(max-width: 700px) 90vw, (max-width: 1100px) 54vw, 650px"
                className="patisserie-photo"
              />
            </div>
          </div>
          {layered && (
            <div className="patisserie-portion scene-scroll" aria-hidden="true">
              <div className="scene-ambient">
                <Image
                  src="/images/torta-chocolate-porcion.webp"
                  alt=""
                  fill
                  loading="eager"
                  sizes="(max-width: 700px) 58vw, 350px"
                  className="patisserie-photo"
                />
              </div>
            </div>
          )}
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
      className="dessert-spotlight"
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
          <div className="spotlight-ring" aria-hidden="true" />
          <span className="spotlight-word" aria-hidden="true">
            antojo
          </span>
          <div className="spotlight-photo scene-scroll">
            <div className="scene-ambient">
              <Image
                src={
                  layered
                    ? "/images/torta-chocolate-cuerpo.webp"
                    : product.image
                }
                alt={product.name}
                fill
                sizes="(max-width: 700px) 90vw, (max-width: 1100px) 52vw, 540px"
              />
            </div>
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
