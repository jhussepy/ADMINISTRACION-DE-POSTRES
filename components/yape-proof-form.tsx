"use client";

import { useActionState, useState } from "react";
import { submitYapeProof } from "@/app/pagar/actions";

export function YapeProofForm({
  token,
  outstandingCents,
  hasPendingProof,
  number,
}: {
  token: string;
  outstandingCents: number;
  hasPendingProof: boolean;
  number: string;
}) {
  const [state, action, pending] = useActionState(submitYapeProof, {});
  const [copied, setCopied] = useState(false);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button className="button secondary yape-copy" type="button" onClick={copyNumber}>
        {copied ? "Número copiado" : "Copiar número de Yape"}
      </button>
      {hasPendingProof ? (
        <p className="yape-pending" role="status">
          Ya recibimos un comprobante de este pedido. Estamos verificándolo.
          Te avisaremos antes de marcar el pago como confirmado.
        </p>
      ) : (
        <form action={action} className="stack-form yape-proof-form">
          <input type="hidden" name="token" value={token} />
          <label>
            Importe enviado (S/)
            <input
              name="amount"
              type="number"
              min="0.01"
              max={(outstandingCents / 100).toFixed(2)}
              step="0.01"
              defaultValue={(outstandingCents / 100).toFixed(2)}
              required
            />
          </label>
          <label>
            Número de operación <small>(opcional)</small>
            <input
              name="reference"
              maxLength={120}
              placeholder="Aparece en tu comprobante de Yape"
            />
          </label>
          <label>
            Captura del comprobante
            <input
              name="proof"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
            <small>JPG, PNG o WebP · máximo 5 MB</small>
          </label>
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
          {state.success && <p className="yape-pending" role="status">{state.success}</p>}
          <button className="button full" type="submit" disabled={pending || !!state.success}>
            {pending ? "Enviando comprobante…" : "Enviar comprobante para verificar"}
          </button>
        </form>
      )}
    </>
  );
}
