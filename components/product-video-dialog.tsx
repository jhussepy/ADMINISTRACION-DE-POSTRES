"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import type { ProductFilmMedia } from "@/lib/product-media";
import { ProductFilm } from "./product-film";

export function ProductVideoDialog({
  media,
  name,
  onClose,
  returnFocusTo,
}: {
  media: ProductFilmMedia;
  name: string;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    const nested = !!element?.parentElement?.closest("dialog[open]");
    const previous = document.body.style.overflow;
    element?.showModal();
    if (!nested) document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      if (!nested) document.body.style.overflow = previous;
      returnFocusTo?.focus({ preventScroll: true });
    };
  }, [returnFocusTo]);
  return (
    <dialog
      ref={dialog}
      className="photo-lightbox product-video-lightbox"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="photo-lightbox-heading">
        <div>
          <span className="eyebrow">EL POSTRE EN MOVIMIENTO</span>
          <h2 id={titleId}>Video de {name}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          autoFocus
          onClick={onClose}
          aria-label="Cerrar video ampliado"
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="product-video-lightbox-content">
        <ProductFilm media={media} name={name} requestedPlay />
      </div>
      <p className="product-video-lightbox-note">
        Video referencial. Confirmaremos presentación y disponibilidad contigo.
      </p>
    </dialog>
  );
}
