import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { PasswordForm } from "@/components/account-forms";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Cambiar contraseña",
  robots: { index: false, follow: false },
};
export default async function PasswordPage() {
  if (!(await getAccount())) redirect("/cuenta");
  return (
    <>
      <PageHeader />
      <main className="state-page">
        <h1>Una nueva contraseña</h1>
        <PasswordForm />
        <Link href="/cuenta">Volver a mi cuenta</Link>
      </main>
    </>
  );
}
