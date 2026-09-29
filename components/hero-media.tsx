"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const HERO_VIDEO_URL = process.env.NEXT_PUBLIC_HERO_VIDEO_URL?.trim();

export function HeroMedia({ productName }: { productName: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setMotionAllowed(!preference.matches);

    syncPreference();
    preference.addEventListener("change", syncPreference);
    return () => preference.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!motionAllowed) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    void video.play().catch(() => {
      setVideoFailed(true);
    });
  }, [motionAllowed]);

  if (!HERO_VIDEO_URL || !motionAllowed || videoFailed) {
    return (
      <Image
        src="/images/torta-chocolate-hero.webp"
        alt={productName}
        fill
        preload
        sizes="(max-width: 620px) 90vw, (max-width: 1440px) 52vw, 700px"
        className="hero-image hero-dessert-image"
      />
    );
  }

  return (
    <video
      ref={videoRef}
      className="hero-dessert-video"
      poster="/images/torta-chocolate-hero.webp"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={`Video de ${productName}`}
      onError={() => setVideoFailed(true)}
    >
      <source src={HERO_VIDEO_URL} type="video/mp4" />
    </video>
  );
}
