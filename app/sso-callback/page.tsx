import { redirect } from "next/navigation";
import { clerkConfigured } from "@/lib/clerk-auth";
import { ClerkSsoCallback } from "@/components/clerk-sso-callback";

export const dynamic = "force-dynamic";

export default function SsoCallbackPage() {
  if (!clerkConfigured()) redirect("/cuenta");
  return <ClerkSsoCallback />;
}
