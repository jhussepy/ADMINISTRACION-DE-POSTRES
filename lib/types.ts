export const categories = [
  "Cheesecakes",
  "Tortas",
  "Kekes",
  "Pies",
  "Postres",
  "Salados",
] as const;
export type Category = (typeof categories)[number];
export type ProductVariant = {
  id: string;
  product_id: string;
  slug: string;
  label: string;
  price_cents: number | null;
  active: boolean;
  sort_order: number;
};

export type ProductImage = {
  id: string;
  product_id: string;
  storage_path: string;
  alt_text: string;
  is_cover: boolean;
  active: boolean;
  sort_order: number;
  url: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  category: Category;
  presentation: string;
  price_cents: number | null;
  image: string;
  active: boolean;
  sort_order: number;
  variants?: ProductVariant[];
  gallery?: ProductImage[];
};
export type CartItem = { id: string; quantity: number; variant?: string };
export type CheckoutDetails = {
  name: string;
  phone: string;
  delivery: "recojo" | "delivery";
  address: string;
  date: string;
  notes: string;
  cakeGuests?: string;
  cakeFlavor?: string;
  cakeDesign?: string;
  occasion?: string;
  giftNote?: string;
};
export type Profile = { full_name: string; address: string; phone: string };
export type ActionState = { error?: string; success?: string };
export const orderStatuses = [
  "Nuevo",
  "Por confirmar",
  "Confirmado",
  "En preparación",
  "Listo",
  "Entregado",
  "Cancelado",
] as const;
export type OrderItem = {
  id: string;
  order_id: string;
  position: number;
  product_id: string | null;
  product_name: string;
  variant_key: string;
  variant_label: string;
  quantity: number;
  unit_price_cents: number | null;
  line_total_cents: number | null;
  quote_required: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  public_code: string;
  source: "manual" | "web";
  customer_user_id: string | null;
  customer_name: string;
  customer_phone: string;
  details: string;
  delivery_method: "recojo" | "delivery" | null;
  delivery_address: string;
  delivery_date: string;
  occasion: string;
  gift_note: string;
  notes: string;
  cake_guests: number | null;
  cake_flavor: string;
  cake_design: string;
  total_cents: number;
  deposit_cents: number;
  quote_required: boolean;
  status: (typeof orderStatuses)[number];
  created_at: string;
  order_items?: OrderItem[];
};
