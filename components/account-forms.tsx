"use client";

import { useActionState } from "react";
import { saveProfile } from "@/app/cuenta/actions";
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

export function ProfileForm({
  profile,
  defaultName = "",
}: {
  profile: Profile | null;
  defaultName?: string;
}) {
  const [state, action, pending] = useActionState(saveProfile, {});
  return (
    <form action={action} className="stack-form">
      <label>
        Nombre
        <input
          name="full_name"
          autoComplete="name"
          defaultValue={profile?.full_name || defaultName}
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
