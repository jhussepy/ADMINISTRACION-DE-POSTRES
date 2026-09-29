"use client";

import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function ClerkSsoCallback() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!clerk.loaded || hasRun.current) return;
    hasRun.current = true;

    const goToAccount = () => router.replace("/cuenta");

    const finalizeSignIn = async () => {
      await signIn.finalize({
        navigate: async ({ session, decorateUrl }) => {
          if (session?.currentTask) return goToAccount();
          const url = decorateUrl("/cuenta");
          if (url.startsWith("http")) window.location.href = url;
          else router.replace(url);
        },
      });
    };

    const finalizeSignUp = async () => {
      await signUp.finalize({
        navigate: async ({ session, decorateUrl }) => {
          if (session?.currentTask) return goToAccount();
          const url = decorateUrl("/cuenta");
          if (url.startsWith("http")) window.location.href = url;
          else router.replace(url);
        },
      });
    };

    void (async () => {
      try {
        if (signIn.status === "complete") {
          await finalizeSignIn();
          return;
        }

        if (signUp.isTransferable) {
          await signIn.create({ transfer: true });
          const status = signIn.status as typeof signIn.status | "complete";
          if (status === "complete") {
            await finalizeSignIn();
            return;
          }
          return goToAccount();
        }

        if (
          signIn.status === "needs_first_factor" &&
          !signIn.supportedFirstFactors?.every(
            (factor) => factor.strategy === "enterprise_sso",
          )
        )
          return goToAccount();

        if (signIn.isTransferable) {
          await signUp.create({ transfer: true });
          if (signUp.status === "complete") {
            await finalizeSignUp();
            return;
          }
          return goToAccount();
        }

        if (signUp.status === "complete") {
          await finalizeSignUp();
          return;
        }

        if (
          signIn.status === "needs_second_factor" ||
          signIn.status === "needs_new_password"
        )
          return goToAccount();

        const sessionId =
          signIn.existingSession?.sessionId ??
          signUp.existingSession?.sessionId;

        if (sessionId) {
          await clerk.setActive({
            session: sessionId,
            navigate: async ({ session, decorateUrl }) => {
              if (session?.currentTask) return goToAccount();
              const url = decorateUrl("/cuenta");
              if (url.startsWith("http")) window.location.href = url;
              else router.replace(url);
            },
          });
          return;
        }

        goToAccount();
      } catch {
        router.replace("/cuenta?error=google");
      }
    })();
  }, [clerk, router, signIn, signUp]);

  return (
    <main className="state-page auth-callback">
      <h1>Conectando tu cuenta…</h1>
      <p className="subtle">Estamos terminando el acceso seguro con Google.</p>
      <div id="clerk-captcha" />
    </main>
  );
}
