import type { Product } from "./types";

export type ProductFilmMedia = {
  id: string;
  basePath: string;
  poster: string;
  description: string;
};

const lemonPieFilm: ProductFilmMedia = {
  id: "pie-limon",
  basePath: "/videos/pie-limon",
  poster: "/images/pie-limon-film-poster.webp",
  description:
    "La cámara muestra un pie de limón con merengue dorado y una porción separada para apreciar su interior.",
};

// The owner's uploaded film belongs to this product; photos remain editable.
export function productFilm(product: Product) {
  return product.active && product.id === lemonPieFilm.id
    ? lemonPieFilm
    : undefined;
}
