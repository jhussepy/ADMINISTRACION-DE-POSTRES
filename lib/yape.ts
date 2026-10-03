import "server-only";

export type YapeConfiguration = {
  number: string;
  holder: string;
  qrUrl: string | null;
};

export function yapeConfiguration(): YapeConfiguration | null {
  const number = (process.env.YAPE_NUMBER ?? "").replace(/[\s-]/g, "");
  const holder = (process.env.YAPE_HOLDER ?? "").trim();
  if (!/^9\d{8}$/.test(number) || holder.length < 3 || holder.length > 100)
    return null;

  const rawQr = (process.env.YAPE_QR_URL ?? "").trim();
  let qrUrl: string | null = null;
  if (/^\/images\/[a-zA-Z0-9._-]+$/.test(rawQr)) {
    qrUrl = rawQr;
  } else if (rawQr) {
    try {
      const parsed = new URL(rawQr);
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password)
        qrUrl = parsed.toString();
    } catch {
      // QR opcional: los datos numéricos siguen disponibles.
    }
  }
  return { number, holder, qrUrl };
}
