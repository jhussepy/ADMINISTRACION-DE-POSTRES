import type { Product } from "./types";

// Datos de muestra. Sustituir por presentaciones y condiciones reales antes de vender.
export const DEMO_MODE = true;

export type Presentation = {
  id: string;
  label: string;
  priceCents: number | null;
  example: boolean;
};

const sample = (id: string, label: string, soles: number): Presentation => ({
  id,
  label,
  priceCents: soles * 100,
  example: DEMO_MODE,
});

const demoPresentations: Record<string, Presentation[]> = {
  "torta-chocolate": [
    sample("mediana", "Mediana · aprox. 10 porciones", 85),
    sample("grande", "Grande · aprox. 16 porciones", 125),
  ],
  "terremoto-lucuma": [
    sample("personal", "Vaso personal", 18),
    sample("compartir", "Fuente para compartir", 55),
  ],
  "keke-arandanos": [
    sample("mediano", "Mediano · aprox. 8 porciones", 48),
    sample("grande", "Grande · aprox. 12 porciones", 68),
  ],
  "cheesecake-fresa": [
    sample("porcion", "Porción", 18),
    sample("entero", "Entero · aprox. 10 porciones", 90),
  ],
  "cheesecake-maracumango": [
    sample("porcion", "Porción", 19),
    sample("entero", "Entero · aprox. 10 porciones", 95),
  ],
  "torta-personalizada": [
    {
      id: "a-pedido",
      label: "Diseño a pedido",
      priceCents: null,
      example: false,
    },
  ],
  triples: [
    sample("docena", "Docena", 42),
    sample("dos-docenas", "Dos docenas", 80),
  ],
  "pie-limon": [
    sample("porcion", "Porción", 16),
    sample("entero", "Entero · aprox. 10 porciones", 78),
  ],
  "pie-maracuya": [
    sample("porcion", "Porción", 17),
    sample("entero", "Entero · aprox. 10 porciones", 82),
  ],
  "brownie-chocolate": [
    sample("unidad", "Unidad", 12),
    sample("caja-seis", "Caja de 6", 66),
  ],
  "pie-manzana": [
    sample("porcion", "Porción", 17),
    sample("entero", "Entero · aprox. 10 porciones", 82),
  ],
};

export function presentations(product: Product): Presentation[] {
  const realVariants = (product.variants ?? [])
    .filter((variant) => variant.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((variant) => ({
      id: variant.slug,
      label: variant.label,
      priceCents: variant.price_cents,
      example: false,
    }));

  // Las variantes reales administradas en Supabase tienen máxima prioridad.
  if (realVariants.length) return realVariants;

  // Un precio real cargado directamente en el producto tiene prioridad sobre
  // los ejemplos mientras el negocio migra gradualmente a variantes.
  if (product.price_cents !== null || !demoPresentations[product.id])
    return [
      {
        id: "normal",
        label: product.presentation,
        priceCents: product.price_cents,
        example: false,
      },
    ];

  return demoPresentations[product.id];
}

export function presentation(product: Product, id?: string) {
  const options = presentations(product);
  return options.find((option) => option.id === id) ?? (id ? null : options[0]);
}

export const exampleDelivery = {
  leadTime: "Ejemplo: solicitar con 48 horas de anticipación",
  pickup: "Ejemplo: recojo en Ventanilla; dirección y horario por confirmar",
  coverage: "Ejemplo: Ventanilla y zonas cercanas; cobertura por confirmar",
  cost: "Ejemplo de envío desde S/ 8.00; costo real por confirmar",
};
