"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { DessertScene } from "@/lib/dessert-scene";

export function Dessert3D({
  paused,
  variant = "hero",
  name,
}: {
  paused: boolean;
  variant?: "hero" | "spotlight";
  name: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<DessertScene | null>(null);
  const pause = useRef(paused);
  pause.current = paused;
  useEffect(() => {
    api.current?.setPaused(paused);
  }, [paused]);
  useEffect(() => {
    const element = host.current!;
    const controller = new AbortController();
    let starting = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || starting) return;
        starting = true;
        observer.disconnect();
        void import("@/lib/dessert-scene")
          .then(({ createDessertScene }) => {
            if (controller.signal.aborted) return null;
            return createDessertScene(element, {
              paused: pause.current,
              signal: controller.signal,
              variant,
            });
          })
          .then((scene) => {
            if (!scene) return;
            if (controller.signal.aborted) scene.dispose();
            else {
              api.current = scene;
              scene.setPaused(pause.current);
            }
          })
          .catch(() => {
            if (!controller.signal.aborted)
              element.dataset.renderer = "fallback";
          });
      },
      { rootMargin: "120px" },
    );
    observer.observe(element);
    return () => {
      controller.abort();
      observer.disconnect();
      api.current?.dispose();
      api.current = null;
    };
  }, [variant]);
  return (
    <div className={`dessert-viewer viewer-${variant}`}>
      <div
        className="dessert-render-host"
        ref={host}
        data-renderer="loading"
        data-state="paused"
      >
        <div className="dessert-static-photo">
          <Image
            src="/images/torta-chocolate-cuerpo.webp"
            alt={name}
            fill
            sizes="(max-width: 700px) 90vw, 650px"
            preload={variant === "hero"}
          />
        </div>
      </div>
      <div className="dessert-viewer-controls">
        <span>Arrastra y descubre cada ángulo</span>
        <div>
          <button
            type="button"
            aria-label="Girar postre a la izquierda"
            onClick={() => api.current?.turn(-1)}
          >
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Restablecer vista del postre"
            onClick={() => api.current?.reset()}
          >
            <RotateCcw size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Girar postre a la derecha"
            onClick={() => api.current?.turn(1)}
          >
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
