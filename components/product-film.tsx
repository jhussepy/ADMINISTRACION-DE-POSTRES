"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { ProductFilmMedia } from "@/lib/product-media";

type Connection = EventTarget & { saveData?: boolean };

export function ProductFilm({
  media,
  name,
  paused = false,
  autoplay = false,
  requestedPlay = false,
}: {
  media: ProductFilmMedia;
  name: string;
  paused?: boolean;
  autoplay?: boolean;
  requestedPlay?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const sync = useRef<() => void>(() => {});
  const blockedByOverlay = useRef(paused);
  blockedByOverlay.current = paused;
  const userPaused = useRef(false);
  const optedIn = useRef(requestedPlay);
  const ended = useRef(false);
  const failed = useRef(false);
  const [source, setSource] = useState("");
  const [hasFrame, setHasFrame] = useState(false);
  const [status, setStatus] = useState("poster");
  const descriptionId = useId();

  useEffect(() => {
    const element = root.current;
    const player = video.current;
    if (!element || !player) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: Connection })
      .connection;
    let visible = false;
    let disposed = false;
    let attempt = 0;
    const shouldPlay = () =>
      visible &&
      !document.hidden &&
      !blockedByOverlay.current &&
      !userPaused.current &&
      !failed.current &&
      !ended.current &&
      (optedIn.current ||
        (autoplay && !preference.matches && !connection?.saveData));

    function update() {
      if (disposed) return;
      if (!shouldPlay()) {
        attempt++;
        player!.pause();
        setStatus(
          failed.current ? "fallback" : ended.current ? "ended" : "paused",
        );
        return;
      }
      setSource((current) => {
        if (current) return current;
        const mobile = matchMedia("(max-width: 700px)").matches;
        const format = player!.canPlayType('video/mp4; codecs="avc1.64001f"')
          ? "mp4"
          : "webm";
        return `${media.basePath}${mobile ? "-mobile" : ""}.${format}`;
      });
      if (!player!.getAttribute("src")) {
        setStatus("loading");
        return;
      }
      const currentAttempt = ++attempt;
      player!
        .play()
        .then(() => {
          if (disposed || !shouldPlay()) player!.pause();
          else if (currentAttempt === attempt) setStatus("playing");
        })
        .catch(() => {
          if (!disposed && currentAttempt === attempt) setStatus("blocked");
        });
    }
    sync.current = update;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.1;
        update();
      },
      { threshold: [0, 0.1] },
    );
    observer.observe(element);
    function preferenceChanged() {
      optedIn.current = false;
      update();
    }
    preference.addEventListener("change", preferenceChanged);
    connection?.addEventListener("change", preferenceChanged);
    document.addEventListener("visibilitychange", update);
    return () => {
      disposed = true;
      attempt++;
      observer.disconnect();
      player.pause();
      sync.current = () => {};
      preference.removeEventListener("change", preferenceChanged);
      connection?.removeEventListener("change", preferenceChanged);
      document.removeEventListener("visibilitychange", update);
    };
  }, [media.basePath, autoplay]);

  useEffect(() => {
    sync.current();
  }, [paused, source]);

  function toggle() {
    if (status === "playing" || status === "loading") userPaused.current = true;
    else {
      userPaused.current = false;
      optedIn.current = true;
      if (ended.current) {
        ended.current = false;
        if (video.current) video.current.currentTime = 0;
      }
    }
    sync.current();
  }
  const playing = status === "playing" || status === "loading";
  const label = playing
    ? `Pausar video de ${name}`
    : status === "ended"
      ? `Ver otra vez el video de ${name}`
      : `Reproducir video de ${name}`;

  return (
    <div
      ref={root}
      className="product-film"
      data-media={media.id}
      data-state={status}
    >
      <div className="product-film-frame">
        <Image
          src={media.poster}
          alt={`Fotograma del video de ${name}`}
          fill
          unoptimized
          loading={requestedPlay ? "eager" : "lazy"}
          sizes="(max-width: 760px) 92vw, 700px"
        />
        <video
          ref={video}
          src={source || undefined}
          muted
          playsInline
          preload="none"
          width="1280"
          height="720"
          aria-label={`Video de ${name}`}
          aria-describedby={descriptionId}
          className={hasFrame && status !== "fallback" ? "has-frame" : ""}
          onLoadedData={() => setHasFrame(true)}
          onEnded={() => {
            ended.current = true;
            sync.current();
          }}
          onError={() => {
            failed.current = true;
            setHasFrame(false);
            sync.current();
          }}
        >
          {media.description}
        </video>
        {status !== "fallback" && (
          <button
            type="button"
            className="product-film-toggle"
            onClick={toggle}
            aria-label={label}
            aria-pressed={playing}
          >
            {playing ? (
              <Pause size={17} aria-hidden="true" />
            ) : status === "ended" ? (
              <RotateCcw size={17} aria-hidden="true" />
            ) : (
              <Play size={17} aria-hidden="true" />
            )}
            <span>
              {playing
                ? "Pausar"
                : status === "ended"
                  ? "Ver otra vez"
                  : "Reproducir"}
            </span>
          </button>
        )}
      </div>
      <p id={descriptionId} className="sr-only">
        {media.description}
      </p>
      {status === "fallback" && (
        <p className="product-film-fallback" role="status">
          El video no pudo cargarse. Puedes seguir viendo las fotos y elegir tu
          presentación.
        </p>
      )}
    </div>
  );
}
