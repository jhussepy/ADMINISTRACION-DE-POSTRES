export const categories = [
  "Cheesecakes",
  "Tortas",
  "Kekes",
  "Pies",
  "Postres",
  "Salados",
] as const;
export type Category = (typeof categories)[number];
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
};
export type CartItem = { id: string; quantity: number };
export type CheckoutDetails = {
  name: string;
  delivery: "recojo" | "delivery";
  address: string;
  date: string;
  notes: string;
  cakeGuests?: string;
  cakeFlavor?: string;
  cakeDesign?: string;
};
export type Profile = { full_name: string; address: string; phone: string };
export type ActionState = { error?: string; success?: string };
export const orderStatuses = [
  "Pendiente",
  "Confirmado",
  "En preparación",
  "Entregado",
  "Cancelado",
] as const;
export type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  details: string;
  delivery_date: string;
  total_cents: number;
  deposit_cents: number;
  status: (typeof orderStatuses)[number];
  created_at: string;
};
