"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CakeSlice, ReceiptText, WalletCards, Users, CalendarDays, ArrowUpRight } from "lucide-react";

const sections = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: ReceiptText },
  { href: "/admin/productos", label: "Productos", icon: CakeSlice },
  { href: "/admin/pagos", label: "Pagos", icon: WalletCards },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/calendario", label: "Calendario", icon: CalendarDays },
];

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <aside className="atelier-sidebar">
      <div className="atelier-sidebar-title"><span className="eyebrow">REPOSTERÍA YEMAPE</span><strong>Mi taller</strong><p>Cada detalle cuenta.</p></div>
      <nav className="atelier-navigation" aria-label="Administración">
        {sections.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return <Link key={href} href={href} aria-current={active ? "page" : undefined}><Icon size={19} aria-hidden="true" /><span>{label}</span></Link>;
        })}
      </nav>
      <Link className="atelier-store-link" href="/">Ver mi tienda <ArrowUpRight size={17} aria-hidden="true" /></Link>
    </aside>
  );
}
