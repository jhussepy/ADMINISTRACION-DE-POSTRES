"use client";

import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";

export function GoogleAuthButton() {
  const { signIn, fetchStatus } = useSignIn();
  const [error, setError] = useState("");
  const pending = fetchStatus === "fetching";

  async function continueWithGoogle() {
    setError("");
    try {
      const result = await signIn.sso({
        strategy: "oauth_google",
        redirectCallbackUrl: "/sso-callback",
        redirectUrl: "/cuenta",
      });
      if (result.error) {
        setError("No pudimos abrir Google. Inténtalo de nuevo.");
      }
    } catch {
      setError("No pudimos conectar con Google. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="google-auth">
      <button
        type="button"
        className="google-auth-button"
        onClick={continueWithGoogle}
        disabled={pending}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M21.6 12.23c0-.72-.06-1.25-.2-1.8H12v3.42h5.52a4.72 4.72 0 0 1-2.05 3.1l-.03.11 2.98 2.31.21.02c1.94-1.79 2.97-4.42 2.97-7.16Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 4.96-.89 6.63-2.41l-3.16-2.44c-.85.57-1.98.97-3.47.97a6.02 6.02 0 0 1-5.69-4.16l-.1.01-3.1 2.4-.04.1A10 10 0 0 0 12 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.31 13.96A6.16 6.16 0 0 1 6 12c0-.68.11-1.34.3-1.96l-.01-.13-3.14-2.44-.1.05A10.03 10.03 0 0 0 2 12c0 1.61.38 3.13 1.06 4.48l3.25-2.52Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.88c1.88 0 3.15.81 3.88 1.49l2.82-2.75C16.97 3 14.7 2 12 2a10 10 0 0 0-8.94 5.52l3.25 2.52A6.04 6.04 0 0 1 12 5.88Z"
          />
        </svg>
        {pending ? "Abriendo Google…" : "Continuar con Google"}
      </button>
      <p className="google-auth-note">
        Usa tu cuenta de Google. Yemape no recibe ni guarda tu contraseña.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
