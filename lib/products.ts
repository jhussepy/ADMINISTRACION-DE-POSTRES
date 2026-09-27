import type { Product } from "./types";
// Fotografías y diseños aportados por el negocio. Precios y tamaños por confirmar.
export const initialProducts: Product[] = [
  {
    id: "torta-chocolate",
    name: "Torta de chocolate",
    description:
      "Chocolate para celebrar y compartir. Consulta las presentaciones y opciones de decoración disponibles.",
    category: "Tortas",
    presentation: "Tamaño por coordinar",
    price_cents: null,
    image: "/images/torta-chocolate.webp",
    active: true,
    sort_order: 1,
  },
  {
    id: "terremoto-lucuma",
    name: "Terremoto de lúcuma",
    description:
      "Un antojo de lúcuma y chocolate para disfrutar a cucharadas. Consulta la presentación disponible.",
    category: "Postres",
    presentation: "Presentación por coordinar",
    price_cents: null,
    image: "/images/terremoto-lucuma.webp",
    active: true,
    sort_order: 2,
  },
  {
    id: "keke-arandanos",
    name: "Keke de arándanos",
    description:
      "El compañero de una pausa con café o de una tarde para compartir. Consulta tamaños y porciones disponibles.",
    category: "Kekes",
    presentation: "Tamaño por coordinar",
    price_cents: null,
    image: "/images/keke-arandanos.webp",
    active: true,
    sort_order: 3,
  },
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
    sort_order: 4,
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
    sort_order: 5,
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
    sort_order: 6,
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
    sort_order: 7,
  },
];
export const productImages = [
  {
    path: "/images/torta-chocolate.webp",
    width: 1122,
    height: 1402,
    label: "Torta de chocolate",
  },
  {
    path: "/images/terremoto-lucuma.webp",
    width: 1312,
    height: 1199,
    label: "Terremoto de lúcuma",
  },
  {
    path: "/images/keke-arandanos.webp",
    width: 1130,
    height: 1392,
    label: "Keke de arándanos",
  },

  {
    path: "/images/fresa.webp",
    width: 1086,
    height: 1448,
    label: "Cheesecake de fresa",
  },
  {
    path: "/images/maracumango.webp",
    width: 1086,
    height: 1448,
    label: "Cheesecake de maracumango",
  },
  {
    path: "/images/tortas.webp",
    width: 1086,
    height: 1448,
    label: "Tortas personalizadas",
  },
  { path: "/images/triples.webp", width: 1086, height: 1448, label: "Triples" },
];
