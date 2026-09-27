import type { Product } from "./types";
// Productos basados en los diseños aportados por el negocio. Precios sin confirmar.
export const initialProducts: Product[] = [
  {
    id: "cheesecake-fresa",
    name: "Cheesecake de fresa",
    description:
      "Una pausa dulce con el encanto de las fresas. Consulta tamaños y porciones disponibles.",
    category: "Cheesecakes",
    presentation: "Presentación por coordinar",
    price_cents: null,
    image: "/images/fresa.webp",
    active: true,
    sort_order: 1,
  },
  {
    id: "cheesecake-maracumango",
    name: "Cheesecake de maracumango",
    description:
      "El encuentro de dos sabores tropicales para compartir un momento especial.",
    category: "Cheesecakes",
    presentation: "Presentación por coordinar",
    price_cents: null,
    image: "/images/maracumango.webp",
    active: true,
    sort_order: 2,
  },
  {
    id: "torta-personalizada",
    name: "Tu torta, tu celebración",
    description:
      "Cuéntanos tu idea, la temática y para cuántas personas. Coordinamos contigo cada detalle.",
    category: "Tortas",
    presentation: "Diseño personalizado",
    price_cents: null,
    image: "/images/tortas.webp",
    active: true,
    sort_order: 3,
  },
  {
    id: "triples",
    name: "Triples de jamón, queso y tocino",
    description:
      "También hay lugar para un antojo salado. Consulta las presentaciones para tu reunión.",
    category: "Salados",
    presentation: "Cantidad por coordinar",
    price_cents: null,
    image: "/images/triples.webp",
    active: true,
    sort_order: 4,
  },
];
export const productImages = [
  { path: "/images/fresa.webp", label: "Cheesecake de fresa" },
  { path: "/images/maracumango.webp", label: "Cheesecake de maracumango" },
  { path: "/images/tortas.webp", label: "Tortas personalizadas" },
  { path: "/images/triples.webp", label: "Triples" },
];
