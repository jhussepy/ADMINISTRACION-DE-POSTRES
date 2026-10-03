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
export type ActionState = {
  error?: string;
  success?: string;
  url?: string;
};
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
  yape_payment_token?: string | null;
  customer_id: string | null;
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


export type CustomerOrderSummary = Pick<
  Order,
  | "id"
  | "public_code"
  | "status"
  | "delivery_method"
  | "delivery_address"
  | "delivery_date"
  | "quote_required"
  | "created_at"
>;

export type Customer = {
  id: string;
  normalized_phone: string;
  phone: string;
  full_name: string;
  clerk_user_id: string | null;
  last_delivery_method: "recojo" | "delivery" | null;
  last_delivery_address: string;
  last_order_at: string | null;
  created_at: string;
  updated_at: string;
  orders?: CustomerOrderSummary[];
};

export type CustomerNote = {
  id: string;
  customer_id: string;
  note: string;
  created_by: string;
  created_at: string;
};

export type OrderEvent = {
  id: string;
  order_id: string;
  event_type:
    | "status_change"
    | "quote_resolved"
    | "payment_update"
    | "total_update";
  from_status: string | null;
  to_status: string | null;
  amount_cents: number | null;
  actor_user_id: string | null;
  actor_role: "admin" | "customer" | "system";
  created_at: string;
};


export const paymentMethods = [
  "yape",
  "plin",
  "transferencia",
  "efectivo",
  "mercadopago",
  "otro",
] as const;

export const paymentStatuses = [
  "pending",
  "confirmed",
  "rejected",
  "refunded",
  "failed",
] as const;

export type PaymentMethod = (typeof paymentMethods)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];

export type PaymentProof = {
  id: string;
  payment_id: string;
  storage_path: string;
  original_name: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
  signed_url?: string;
};

export type Payment = {
  id: string;
  order_id: string;
  provider: "manual" | "mercadopago";
  method: PaymentMethod;
  status: PaymentStatus;
  amount_cents: number;
  currency: "PEN";
  reference: string;
  note: string;
  provider_payment_id: string | null;
  provider_preference_id: string | null;
  provider_checkout_url: string | null;
  idempotency_key: string | null;
  paid_at: string | null;
  verified_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  payment_proofs?: PaymentProof[];
};

export type PaymentWithOrder = Payment & {
  orders?: {
    id: string;
    public_code: string;
    customer_name: string;
    customer_phone: string;
    total_cents: number;
    deposit_cents: number;
    quote_required: boolean;
    status: Order["status"];
  } | null;
};
