import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { Heart, ShoppingBag, MapPin, ShieldCheck } from "lucide-react";
import { getAccount } from "@/lib/data";
import { clerkConfigured } from "@/lib/clerk-auth";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/account-forms";
import { GoogleAuthButton } from "@/components/google-auth-button";

export const dynamic = "force-dynamic";
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
  const googleError = params.error === "google";

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
            Entra con Google para guardar tus datos y coordinar más rápido tus
            próximos pedidos.
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
          {googleError && (
            <p className="form-error" role="alert">
              No pudimos completar el acceso con Google. Inténtalo de nuevo.
            </p>
          )}

          {!clerkConfigured() ? (
            <>
              <h2>Entra con Google</h2>
              <p>
                El acceso con Google está temporalmente deshabilitado. Puedes
                seguir comprando como invitado.
              </p>
              <Link className="button" href="/">
                Explorar el catálogo
              </Link>
            </>
          ) : account ? (
            <>
              <div className="account-identity">
                <span className="account-identity-icon">
                  <ShieldCheck size={19} />
                </span>
                <div>
                  <span>Sesión protegida por Clerk</span>
                  <strong>{account.email}</strong>
                </div>
              </div>
              <h2>Mis datos</h2>
              <ProfileForm
                profile={account.profile}
                defaultName={account.name}
              />
              <SignOutButton redirectUrl="/">
                <button className="text-button">Cerrar sesión</button>
              </SignOutButton>
            </>
          ) : (
            <>
              <span className="eyebrow">ACCESO SEGURO</span>
              <h2>Entra con Google</h2>
              <p>
                No necesitas crear otra contraseña. Usa tu cuenta de Google para
                identificarte de forma segura.
              </p>
              <GoogleAuthButton />
              <p className="account-prompt">
                Al continuar aceptas nuestro{" "}
                <Link href="/privacidad" className="text-link">
                  aviso de privacidad
                </Link>
                . También puedes <Link href="/">seguir como invitado</Link>.
              </p>
            </>
          )}
        </section>
      </main>
    </>
  );
}
