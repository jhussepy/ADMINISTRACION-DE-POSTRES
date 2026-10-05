"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Expand,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Product, ProductImage } from "@/lib/types";

export function ProductGallery({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const available = product.gallery?.filter((photo) => photo.active) ?? [];
  const photos: ProductImage[] = available.length
    ? available
    : [
        {
          id: "cover",
          product_id: product.id,
          storage_path: product.image,
          url: product.image,
          alt_text: `${compact ? "Presentación" : "Presentación referencial"} de ${product.name}`,
          active: true,
          is_cover: true,
          sort_order: 0,
        },
      ];
  const cover = photos.find((photo) => photo.is_cover) ?? photos[0];
  const [activeId, setActiveId] = useState(cover.id);
  const [expanded, setExpanded] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const index = Math.max(
    0,
    photos.findIndex((photo) => photo.id === activeId),
  );
  const active = photos[index];
  function move(direction: number) {
    setActiveId(photos[(index + direction + photos.length) % photos.length].id);
  }

  return (
    <div
      className={`product-page-media${compact ? " compact-product-gallery" : ""}`}
    >
      <div className={`product-page-image${compact ? " detail-image" : ""}`}>
        <button
          ref={trigger}
          type="button"
          className="product-gallery-open"
          aria-label={`Ampliar fotografía de ${product.name}`}
          aria-haspopup="dialog"
          onClick={() => setExpanded(true)}
        >
          <span className="product-gallery-frame" key={active.id}>
            <Image
              src={active.url}
              alt={
                active.alt_text || `Presentación referencial de ${product.name}`
              }
              fill
              sizes={
                compact
                  ? "(max-width: 760px) 92vw, 490px"
                  : "(max-width: 760px) 92vw, (max-width: 1440px) 50vw, 620px"
              }
              loading="eager"
            />
          </span>
          <span className="product-gallery-expand">
            <Expand size={16} aria-hidden="true" /> Ampliar foto
          </span>
        </button>
      </div>
      <div className="product-gallery-caption">
        <span>Fotografía referencial</span>
        {photos.length > 1 && (
          <div className="product-gallery-navigation">
            <button
              type="button"
              className="icon-button"
              aria-label="Foto anterior"
              onClick={() => move(-1)}
            >
              <ArrowLeft size={17} aria-hidden="true" />
            </button>
            <output aria-live="polite">
              {index + 1} / {photos.length}
            </output>
            <button
              type="button"
              className="icon-button"
              aria-label="Foto siguiente"
              onClick={() => move(1)}
            >
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {photos.length > 1 && (
        <div
          className="product-gallery-thumbs"
          aria-label={`Galería de ${product.name}`}
        >
          {photos.map((photo, position) => (
            <button
              type="button"
              key={photo.id}
              className={photo.id === active.id ? "is-active" : ""}
              aria-label={`Ver foto ${position + 1} de ${photos.length} de ${product.name}`}
              aria-pressed={photo.id === active.id}
              onClick={() => setActiveId(photo.id)}
            >
              <Image src={photo.url} alt="" fill sizes="84px" />
            </button>
          ))}
        </div>
      )}
      {expanded && (
        <PhotoLightbox
          productName={product.name}
          photo={active}
          index={index}
          count={photos.length}
          move={move}
          onClose={() => setExpanded(false)}
          returnFocusTo={trigger.current}
        />
      )}
    </div>
  );
}

function PhotoLightbox({
  productName,
  photo,
  index,
  count,
  move,
  onClose,
  returnFocusTo,
}: {
  productName: string;
  photo: ProductImage;
  index: number;
  count: number;
  move: (direction: number) => void;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [zoomed, setZoomed] = useState(false);
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
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    element.scrollTo({
      left: zoomed ? (element.scrollWidth - element.clientWidth) / 2 : 0,
      top: zoomed ? (element.scrollHeight - element.clientHeight) / 2 : 0,
      behavior: "instant",
    });
  }, [zoomed]);
  function navigate(direction: number) {
    setZoomed(false);
    move(direction);
  }
  return (
    <dialog
      ref={dialog}
      className="photo-lightbox"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      onKeyDown={(event) => {
        if (
          count < 2 ||
          (event.key !== "ArrowLeft" && event.key !== "ArrowRight") ||
          zoomed
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        navigate(event.key === "ArrowLeft" ? -1 : 1);
      }}
    >
      <div className="photo-lightbox-heading">
        <div>
          <span className="eyebrow">MIRA CADA DETALLE</span>
          <h2 id={titleId}>Fotografías de {productName}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          autoFocus
          onClick={onClose}
          aria-label="Cerrar fotografía ampliada"
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div
        ref={viewport}
        className="photo-lightbox-viewport"
        tabIndex={0}
        aria-label={
          zoomed
            ? "Fotografía ampliada: desliza para recorrerla"
            : "Fotografía del producto"
        }
      >
        <div className={`photo-lightbox-image${zoomed ? " is-zoomed" : ""}`}>
          <Image
            src={photo.url}
            alt={photo.alt_text || productName}
            fill
            sizes="(max-width: 760px) 100vw, 1100px"
            loading="eager"
          />
        </div>
      </div>
      <div className="photo-lightbox-toolbar">
        <button
          type="button"
          className="photo-zoom-button"
          aria-pressed={zoomed}
          onClick={() => setZoomed((value) => !value)}
        >
          {zoomed ? (
            <ZoomOut size={18} aria-hidden="true" />
          ) : (
            <ZoomIn size={18} aria-hidden="true" />
          )}
          {zoomed ? "Ver foto completa" : "Acercar fotografía"}
        </button>
        {count > 1 && (
          <div className="product-gallery-navigation">
            <button
              type="button"
              className="icon-button"
              aria-label="Foto anterior ampliada"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={18} />
            </button>
            <output aria-live="polite">
              {index + 1} / {count}
            </output>
            <button
              type="button"
              className="icon-button"
              aria-label="Foto siguiente ampliada"
              onClick={() => navigate(1)}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
