"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import {
  signIn,
  signUp,
  resetPassword,
  saveProfile,
  updatePassword,
} from "@/app/cuenta/actions";
import type { ActionState, Profile } from "@/lib/types";
function Feedback({ state }: { state: ActionState }) {
  return (
    <>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          {state.success}
        </p>
      )}
    </>
  );
}
export function AuthForm() {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  return (
    <>
      <div className="tabs" aria-label="Acceso a tu cuenta">
        <button
          className={mode === "login" ? "active" : ""}
          onClick={() => setMode("login")}
        >
          Iniciar sesión
        </button>
        <button
          className={mode === "register" ? "active" : ""}
          onClick={() => setMode("register")}
        >
          Crear cuenta
        </button>
      </div>
      <Credentials key={mode} mode={mode} />
      <button
        className="text-button"
        onClick={() => setMode(mode === "reset" ? "login" : "reset")}
      >
        {mode === "reset"
          ? "Volver a iniciar sesión"
          : "¿Olvidaste tu contraseña?"}
      </button>
      <p className="account-prompt">
        También puedes <Link href="/">seguir como invitado</Link>.
      </p>
    </>
  );
}
function Credentials({ mode }: { mode: "login" | "register" | "reset" }) {
  const [state, action, pending] = useActionState(
    mode === "login" ? signIn : mode === "register" ? signUp : resetPassword,
    {},
  );
  return (
    <form action={action} className="stack-form">
      {mode === "reset" && (
        <p className="subtle">
          Te enviaremos un enlace para recuperar tu cuenta.
        </p>
      )}
      <label>
        Correo electrónico
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      {mode !== "reset" && (
        <label>
          Contraseña
          <input
            type="password"
            name="password"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            required
            minLength={mode === "register" ? 10 : 1}
            maxLength={128}
          />
          {mode === "register" && (
            <small className="subtle">Usa al menos 10 caracteres.</small>
          )}
        </label>
      )}
      {mode === "register" && (
        <label className="checkbox-label">
          <input type="checkbox" name="privacy" required />
          <span>
            He leído el{" "}
            <Link href="/privacidad" className="text-link">
              aviso de privacidad
            </Link>
            .
          </span>
        </label>
      )}
      <Feedback state={state} />
      <button className="button full" disabled={pending}>
        {pending
          ? "Un momento…"
          : mode === "login"
            ? "Entrar a mi cuenta"
            : mode === "register"
              ? "Crear mi cuenta"
              : "Enviar enlace"}
      </button>
    </form>
  );
}
export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, action, pending] = useActionState(saveProfile, {});
  return (
    <form action={action} className="stack-form">
      <label>
        Nombre
        <input
          name="full_name"
          autoComplete="name"
          defaultValue={profile?.full_name ?? ""}
          required
          minLength={2}
          maxLength={100}
        />
      </label>
      <label>
        Teléfono <small>(opcional)</small>
        <input
          name="phone"
          autoComplete="tel"
          type="tel"
          defaultValue={profile?.phone ?? ""}
          maxLength={20}
        />
      </label>
      <label>
        Distrito y dirección habitual <small>(opcional)</small>
        <textarea
          name="address"
          autoComplete="street-address"
          defaultValue={profile?.address ?? ""}
          rows={3}
          maxLength={250}
        />
      </label>
      <Feedback state={state} />
      <button className="button" disabled={pending}>
        {pending ? "Guardando…" : "Guardar mis datos"}
      </button>
    </form>
  );
}
export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, {});
  return (
    <form action={action} className="stack-form">
      <label>
        Nueva contraseña
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
        />
      </label>
      <label>
        Repite la contraseña
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
        />
      </label>
      <Feedback state={state} />
      <button className="button" disabled={pending}>
        {pending ? "Guardando…" : "Actualizar contraseña"}
      </button>
    </form>
  );
}
