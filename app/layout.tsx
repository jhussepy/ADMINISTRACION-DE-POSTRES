import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Yemape · Repostería artesanal", template: "%s | Yemape" },
  description:
    "Postres para compartir. Explora el catálogo de Repostería Yemape, arma tu carrito y coordina tu pedido por WhatsApp.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-PE">
      <body>{children}</body>
    </html>
  );
}
