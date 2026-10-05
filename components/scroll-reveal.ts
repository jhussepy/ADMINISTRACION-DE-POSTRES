"use client";

import { useEffect, type RefObject } from "react";

/** Content is visible by default, including without JavaScript or animation support. */
export function useScrollReveal(
  root: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !root.current || !("IntersectionObserver" in window))
      return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    const elements = Array.from(
      root.current.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const showAll = () => {
      elements.forEach((element) =>
        element.removeAttribute("data-reveal-state"),
      );
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.removeAttribute("data-reveal-state");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px 60px 0px", threshold: 0 },
    );

    for (const element of elements) {
      // Do not hide content already visible when hydration completes.
      if (element.getBoundingClientRect().top < window.innerHeight) continue;
      element.setAttribute("data-reveal-state", "pending");
      observer.observe(element);
    }
    const stopMotion = () => {
      if (motion.matches) {
        observer.disconnect();
        showAll();
      }
    };
    motion.addEventListener("change", stopMotion);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", stopMotion);
      showAll();
    };
  }, [root, enabled]);
}
