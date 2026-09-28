export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const candidate =
    configured ||
    (production ? `https://${production}` : "http://localhost:3000");
  try {
    return new URL(candidate).origin;
  } catch {
    return "http://localhost:3000";
  }
}
