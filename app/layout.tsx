import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { siteUrl } from "@/lib/site-url";
import { clerkConfigured } from "@/lib/clerk-auth";
import "./globals.css";
import "./home.css";
import "./dessert-film.css";
import "./commerce.css";
import "./editorial.css";
import "./product-experience.css";
import "./product-video.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Yemape · Repostería artesanal", template: "%s | Yemape" },
  description:
    "Postres para compartir. Explora el catálogo de Repostería Yemape, arma tu carrito y coordina tu pedido por WhatsApp.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = clerkConfigured() ? (
    <ClerkProvider>{children}</ClerkProvider>
  ) : (
    children
  );

  return (
    <html lang="es-PE">
      <body>{content}</body>
    </html>
  );
}
