import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const db = await supabase();
  if (
    hash &&
    db &&
    (type === "email" || type === "signup" || type === "recovery")
  ) {
    const { error } = await db.auth.verifyOtp({ token_hash: hash, type });
    if (!error)
      return NextResponse.redirect(
        new URL(type === "recovery" ? "/cuenta/clave" : "/cuenta", request.url),
      );
  }
  return NextResponse.redirect(new URL("/cuenta?error=enlace", request.url));
}
