import type { Metadata } from "next";
import localFont from "next/font/local";
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
import "./yemape-design.css";
const sans = localFont({src: "./fonts/dm-sans.woff", variable: "--yemape-sans", display: "swap", weight: "100 1000"});
const serif = localFont({
  src: [
    {path: "./fonts/playfair-display.woff", weight: "400 900", style: "normal"},
    {path: "./fonts/playfair-display-italic.woff", weight: "400 900", style: "italic"},
  ],
  variable: "--yemape-serif", display: "swap", preload: false,
});

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
    <html lang="es-PE" className={`${sans.variable} ${serif.variable}`}>
      <body>{content}</body>
    </html>
  );
}
