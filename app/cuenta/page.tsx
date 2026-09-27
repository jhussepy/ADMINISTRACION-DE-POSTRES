import Link from "next/link";
import { Heart, ShoppingBag, MapPin } from "lucide-react";
import { getAccount } from "@/lib/data";
import { authConfigured } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { AuthForm, ProfileForm } from "@/components/account-forms";
import { signOut } from "./actions";
export const metadata = {
  title: "Mi cuenta",
  robots: { index: false, follow: false },
};
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [account, params] = await Promise.all([getAccount(), searchParams]);
  return (
    <>
      <PageHeader />
      <main className="account-layout">
        <section className="account-story">
          <span className="eyebrow">TU RINCÓN EN YEMAPE</span>
          <h1>
            {account ? (
              "Qué gusto verte de nuevo."
            ) : (
              <>
                Tus antojos,
                <br />
                <em>a tu manera.</em>
              </>
            )}
          </h1>
          <p>
            Con una cuenta puedes guardar tus datos para coordinar más rápido
            tus próximos pedidos.
          </p>
          <ul>
            <li>
              <MapPin size={18} /> Tu dirección a mano.
            </li>
            <li>
              <ShoppingBag size={18} /> Tu carrito siempre contigo en este
              navegador.
            </li>
            <li>
              <Heart size={18} /> La misma atención, con cuenta o sin ella.
            </li>
          </ul>
          <Link className="button secondary" href="/">
            {account
              ? "Volver a elegir mis postres"
              : "Continuar como invitado"}
          </Link>
          {account?.isAdmin && (
            <p>
              <Link className="text-link" href="/admin">
                Ir a la administración →
              </Link>
            </p>
          )}
        </section>
        <section className="account-card">
          {params.error && (
            <p className="form-error" role="alert">
              El enlace no es válido o ha caducado. Solicita uno nuevo.
            </p>
          )}
          {!authConfigured() ? (
            <>
              <h2>Compra a tu ritmo</h2>
              <p>
                El acceso a cuentas estará disponible pronto. Mientras tanto,
                puedes armar tu carrito y coordinar tu pedido sin registrarte.
              </p>
              <Link className="button" href="/">
                Explorar el catálogo
              </Link>
            </>
          ) : account ? (
            <>
              <h2>Mis datos</h2>
              <p>{account.user.email}</p>
              <ProfileForm profile={account.profile} />
              <Link className="text-link" href="/cuenta/clave">
                Cambiar contraseña
              </Link>
              <form action={signOut}>
                <button className="text-button">Cerrar sesión</button>
              </form>
            </>
          ) : (
            <AuthForm />
          )}
        </section>
      </main>
    </>
  );
}
