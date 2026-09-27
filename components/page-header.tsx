import Link from "next/link";
import { Brand } from "./storefront";
export function PageHeader() {
  return (
    <header className="page-header">
      <Brand />
      <Link href="/">← Volver a la carta</Link>
    </header>
  );
}
