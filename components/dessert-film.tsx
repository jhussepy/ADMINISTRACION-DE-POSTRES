"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

type Connection = EventTarget & { saveData?: boolean };
const poster = "/images/torta-chocolate-film-poster.webp";

export function DessertFilm({
  name,
  paused,
}: {
  name: string;
  paused: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const sync = useRef<() => void>(() => {});
  const blockedByOverlay = useRef(paused);
  blockedByOverlay.current = paused;
  const userPaused = useRef(false);
  const optedIn = useRef(false);
  const failed = useRef(false);
  const [source, setSource] = useState("");
  const [hasFrame, setHasFrame] = useState(false);
  const [status, setStatus] = useState("poster");

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
      ((!preference.matches && !connection?.saveData) || optedIn.current);

    function update() {
      if (disposed) return;
      if (!shouldPlay()) {
        attempt++;
        player!.pause();
        setStatus(failed.current ? "fallback" : "paused");
        return;
      }
      setSource((current) => {
        if (current) return current;
        const mobile = matchMedia("(max-width: 700px)").matches;
        const format = player!.canPlayType('video/mp4; codecs="avc1.64001f"')
          ? "mp4"
          : "webm";
        return `/videos/torta-chocolate${mobile ? "-mobile" : ""}.${format}`;
      });
      if (!player!.getAttribute("src")) return;
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
  }, []);

  useEffect(() => {
    sync.current();
  }, [paused, source]);

  function toggle() {
    if (status === "playing") userPaused.current = true;
    else {
      userPaused.current = false;
      optedIn.current = true;
    }
    sync.current();
  }

  return (
    <div ref={root} className="dessert-film" data-state={status}>
      <div className="dessert-film-frame">
        <Image
          src={poster}
          alt={`${name} con chocolate, fresas y arándanos`}
          fill
          preload
          unoptimized
          sizes="(max-width: 700px) 100vw, 60vw"
        />
        <video
          ref={video}
          src={source || undefined}
          muted
          loop
          playsInline
          preload="none"
          width="1280"
          height="720"
          aria-label={`Video de ${name}`}
          aria-describedby="dessert-film-description"
          className={hasFrame && status !== "fallback" ? "has-frame" : ""}
          onLoadedData={() => setHasFrame(true)}
          onError={() => {
            failed.current = true;
            setHasFrame(false);
            sync.current();
          }}
        >
          Torta de chocolate con relleno cremoso, fresas y arándanos.
        </video>
        {status !== "fallback" && (
          <button
            type="button"
            className="dessert-film-toggle"
            onClick={toggle}
            aria-label={
              status === "playing"
                ? "Pausar video de la torta"
                : "Reproducir video de la torta"
            }
            aria-pressed={status === "playing"}
          >
            {status === "playing" ? (
              <Pause size={16} aria-hidden="true" />
            ) : (
              <Play size={16} aria-hidden="true" />
            )}
            <span>{status === "playing" ? "Pausar" : "Reproducir"}</span>
          </button>
        )}
      </div>
      <p id="dessert-film-description" className="sr-only">
        La cámara se acerca a una torta de chocolate con una porción separada,
        relleno cremoso, cobertura de chocolate, fresas y arándanos.
      </p>
    </div>
  );
}
