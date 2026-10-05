"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import type { Product } from "@/lib/types";
import type { WaveRenderer } from "@/lib/wave-gallery-renderer";

type GalleryMode = "static" | "webgl";

export function WaveGallery({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect: (product: Product, trigger: HTMLButtonElement) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const renderer = useRef<WaveRenderer | null>(null);
  const wake = useRef(() => {});
  const motion = useRef({ current: 0, target: 0 });
  const staticScrollIsManual = useRef(false);
  const interaction = useRef({
    paused: products.length < 5,
    hover: false,
    focused: false,
    visible: false,
  });
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    target: number;
    dragged: boolean;
  } | null>(null);
  const [mode, setMode] = useState<GalleryMode>("static");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(products.length < 5);
  const [reduced, setReduced] = useState(false);
  const photoKey = products
    .map((product) => product.id + ":" + product.image)
    .join("|");
  const loop = products.length >= 5;
  const selected = products[active] ?? products[0];

  useEffect(() => {
    interaction.current.paused = paused;
    wake.current();
  }, [paused]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = stage.current;
    const surface = canvas.current;
    if (!element || !surface || !products.length || reduced) return;
    let disposed = false;
    let initialized = false;
    let frame = 0;
    let previousTime = 0;
    let phase = 0;
    let announced = 0;
    let scene: WaveRenderer | null = null;
    motion.current = { current: 0, target: 0 };
    setActive(0);
    setMode("static");

    function schedule() {
      if (
        !frame &&
        !disposed &&
        scene &&
        interaction.current.visible &&
        !document.hidden
      )
        frame = requestAnimationFrame(animate);
    }
    function animate(now: number) {
      frame = 0;
      if (
        disposed ||
        !scene ||
        !interaction.current.visible ||
        document.hidden
      ) {
        previousTime = 0;
        return;
      }
      const dt = previousTime ? Math.min((now - previousTime) / 1000, 0.1) : 0;
      if (previousTime && now - previousTime < scene.frameInterval) {
        schedule();
        return;
      }
      previousTime = now;
      const conditions = interaction.current;
      const auto =
        loop &&
        !conditions.paused &&
        !conditions.hover &&
        !conditions.focused &&
        !gesture.current;
      if (auto) {
        motion.current.target += dt * 0.12;
        phase += dt * 0.3;
      }
      const delta = motion.current.target - motion.current.current;
      motion.current.current += gesture.current?.dragged
        ? delta
        : delta * (1 - Math.exp(-dt * 8));
      if (Math.abs(delta) < 0.0005)
        motion.current.current = motion.current.target;
      scene.draw(motion.current.current, phase);
      const next =
        ((Math.round(motion.current.current) % products.length) +
          products.length) %
        products.length;
      if (next !== announced) {
        announced = next;
        setActive(next);
      }
      if (
        auto ||
        Math.abs(motion.current.target - motion.current.current) > 0.0005
      )
        schedule();
      else previousTime = 0;
    }
    wake.current = schedule;
    async function initialize() {
      if (initialized) return;
      initialized = true;
      try {
        const { createWaveRenderer } =
          await import("@/lib/wave-gallery-renderer");
        if (disposed) return;
        const photos = Array.from(
          element!.querySelectorAll<HTMLImageElement>(".wave-static-list img"),
        );
        if (photos.length !== products.length)
          throw new Error("Gallery photos unavailable");
        scene = createWaveRenderer(surface!, photos);
        await scene.ready;
        if (disposed) return;
        renderer.current = scene;
        setMode("webgl");
        schedule();
      } catch (error) {
        surface?.setAttribute("data-renderer-error", String(error));
        scene?.dispose();
        scene = null;
        renderer.current = null;
        if (!disposed) setMode("static");
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        interaction.current.visible = entry.isIntersecting;
        if (entry.isIntersecting) {
          void initialize();
          schedule();
        } else {
          cancelAnimationFrame(frame);
          frame = 0;
          previousTime = 0;
        }
      },
      { rootMargin: "0px" },
    );
    observer.observe(element);
    const resize = new ResizeObserver(schedule);
    resize.observe(element);
    function visibility() {
      previousTime = 0;
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else schedule();
    }
    function contextLost(event: Event) {
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      scene?.dispose();
      scene = null;
      renderer.current = null;
      setMode("static");
    }
    surface.addEventListener("webglcontextlost", contextLost);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      surface.removeEventListener("webglcontextlost", contextLost);
      document.removeEventListener("visibilitychange", visibility);
      scene?.dispose();
      renderer.current = null;
      wake.current = () => {};
    };
    // photoKey tracks the stable identity/order/URL of the photos across cart renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey, reduced, loop]);

  function move(position: number) {
    setPaused(true);
    const target = loop
      ? position
      : Math.max(0, Math.min(products.length - 1, position));
    motion.current.target = target;
    const next =
      ((Math.round(target) % products.length) + products.length) %
      products.length;
    if (mode === "static") {
      // A wide list cannot align its last cards to the leading edge. Keep the
      // requested product selected while scrollTo moves to that clamped position.
      staticScrollIsManual.current = false;
      motion.current.current = target;
      setActive(next);
      const card = stage.current?.querySelector<HTMLElement>(
        `[data-wave-card="${next}"]`,
      );
      if (card && stage.current) {
        const list =
          stage.current.querySelector<HTMLElement>(".wave-static-list");
        list?.scrollTo({
          left: card.offsetLeft - list.offsetLeft,
          behavior: reduced ? "instant" : "smooth",
        });
      }
    }
    wake.current();
  }

  function show(index: number) {
    const current = Math.round(motion.current.current);
    let distance =
      index -
      (((current % products.length) + products.length) % products.length);
    if (loop && distance > products.length / 2) distance -= products.length;
    if (loop && distance < -products.length / 2) distance += products.length;
    move(current + distance);
  }

  function select(product: Product, trigger: HTMLButtonElement) {
    setPaused(true);
    onSelect(product, trigger);
  }

  if (!selected) return null;
  return (
    <div
      className="wave-gallery"
      data-mode={reduced ? "static" : mode}
      data-selected={selected.id}
      onMouseEnter={() => {
        interaction.current.hover = true;
      }}
      onMouseLeave={() => {
        interaction.current.hover = false;
        wake.current();
      }}
      onFocusCapture={() => {
        interaction.current.focused = true;
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          interaction.current.focused = false;
          wake.current();
        }
      }}
    >
      <div
        className="wave-stage"
        ref={stage}
        role="group"
        tabIndex={0}
        aria-label="Galería de postres destacados. Usa las flechas izquierda y derecha para explorar."
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(
              Math.round(motion.current.target) +
                (event.key === "ArrowRight" ? 1 : -1),
            );
          }
          if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            move(event.key === "Home" ? 0 : products.length - 1);
          }
        }}
        onPointerDown={(event) => {
          if (mode !== "webgl" || reduced || event.button !== 0) return;
          gesture.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            target: motion.current.current,
            dragged: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = gesture.current;
          if (!drag || drag.id !== event.pointerId) return;
          const dx = event.clientX - drag.x,
            dy = event.clientY - drag.y;
          if (
            !drag.dragged &&
            Math.abs(dx) > 8 &&
            Math.abs(dx) > Math.abs(dy)
          ) {
            drag.dragged = true;
            setPaused(true);
          }
          if (drag.dragged) {
            const position =
              drag.target -
              dx / ((event.currentTarget.clientHeight * 2.35) / 3.1);
            motion.current.target = loop
              ? position
              : Math.max(0, Math.min(products.length - 1, position));
            wake.current();
          }
        }}
        onPointerUp={(event) => {
          const drag = gesture.current;
          if (!drag || drag.id !== event.pointerId) return;
          gesture.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
          if (drag.dragged) move(Math.round(motion.current.target));
          else if (Math.abs(event.clientY - drag.y) < 8) {
            const bounds = event.currentTarget.getBoundingClientRect();
            const index = renderer.current?.pick(
              event.clientX - bounds.left,
              event.clientY - bounds.top,
            );
            if (index != null) {
              if (index === active && openButton.current)
                select(selected, openButton.current);
              else show(index);
            }
          }
        }}
        onPointerCancel={() => {
          if (!gesture.current) return;
          gesture.current = null;
          move(Math.round(motion.current.target));
        }}
      >
        <span className="wave-stage-shadow" aria-hidden="true" />
        <canvas
          ref={canvas}
          className="wave-canvas"
          aria-hidden="true"
          hidden={mode !== "webgl" || reduced}
        />
        <div
          className="wave-static-list"
          role="list"
          hidden={mode === "webgl" && !reduced}
          onPointerDown={() => {
            staticScrollIsManual.current = true;
          }}
          onWheel={() => {
            staticScrollIsManual.current = true;
          }}
          onScroll={(event) => {
            if ((mode === "webgl" && !reduced) || !staticScrollIsManual.current)
              return;
            const list = event.currentTarget;
            const cards = Array.from(
              list.querySelectorAll<HTMLElement>("[data-wave-card]"),
            );
            const nearest = cards.reduce(
              (best, card, index) =>
                Math.abs(card.offsetLeft - list.offsetLeft - list.scrollLeft) <
                Math.abs(
                  cards[best].offsetLeft - list.offsetLeft - list.scrollLeft,
                )
                  ? index
                  : best,
              0,
            );
            motion.current = { current: nearest, target: nearest };
            setActive(nearest);
          }}
        >
          {products.map((product, index) => (
            <div
              className="wave-static-card"
              role="listitem"
              data-wave-card={index}
              key={product.id}
            >
              <button
                type="button"
                aria-label={`Ver detalles de ${product.name}`}
                onClick={(event) => select(product, event.currentTarget)}
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  crossOrigin="anonymous"
                  fill
                  sizes="(max-width: 620px) 70vw, 340px"
                />
                <span>{product.name}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="wave-toolbar">
        <p className="wave-hint">Desliza y encuentra tu próximo antojo</p>
        <div className="wave-controls">
          <button
            className="wave-control"
            type="button"
            aria-label="Postre anterior"
            disabled={products.length < 2 || (!loop && active === 0)}
            onClick={() => move(Math.round(motion.current.target) - 1)}
          >
            <ArrowLeft size={18} />
          </button>
          {mode === "webgl" && !reduced && loop && (
            <button
              className="wave-control"
              type="button"
              aria-label={paused ? "Reanudar galería" : "Pausar galería"}
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          )}
          <button
            className="wave-control"
            type="button"
            aria-label="Postre siguiente"
            disabled={
              products.length < 2 || (!loop && active === products.length - 1)
            }
            onClick={() => move(Math.round(motion.current.target) + 1)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div className="wave-selection" aria-live={paused ? "polite" : "off"}>
        <div>
          <span className="eyebrow">
            {selected.category} · {String(active + 1).padStart(2, "0")} /{" "}
            {String(products.length).padStart(2, "0")}
          </span>
          <h3>{selected.name}</h3>
          <p>{selected.description}</p>
        </div>
        <button
          ref={openButton}
          className="button"
          type="button"
          aria-label={`Descubrir ${selected.name} en destacados`}
          onClick={(event) => select(selected, event.currentTarget)}
        >
          Ver este postre <ArrowRight size={17} />
        </button>
      </div>
      <div className="wave-pagination" aria-label="Elegir postre destacado">
        {products.map((product, index) => (
          <button
            type="button"
            key={product.id}
            className={active === index ? "is-active" : ""}
            aria-label={`Mostrar ${product.name}`}
            aria-pressed={active === index}
            onClick={() => show(index)}
          >
            <span />
          </button>
        ))}
      </div>
    </div>
  );
}
