import "server-only";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk-auth";

export function databaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function supabase() {
  if (!databaseConfigured()) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    clerkConfigured()
      ? {
          async accessToken() {
            return (await auth()).getToken();
          },
        }
      : undefined,
  );
}
