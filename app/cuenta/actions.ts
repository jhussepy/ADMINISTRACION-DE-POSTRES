"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
const value = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
function siteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("Falta configurar la dirección de la tienda.");
  return new URL(url).origin;
}
export async function signIn(
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  const db = await supabase();
  if (!db)
    return {
      error:
        "Las cuentas aún no están habilitadas. Puedes comprar como invitado.",
    };
  const email = value(data, "email"),
    password = String(data.get("password") ?? "");
  if (!email || !password || email.length > 254 || password.length > 128)
    return { error: "Revisa tu correo y contraseña." };
  try {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error)
      return {
        error:
          "No pudimos iniciar sesión. Revisa tus datos y confirma tu correo si acabas de registrarte.",
      };
  } catch {
    return { error: "No pudimos conectar. Inténtalo de nuevo." };
  }
  revalidatePath("/", "layout");
  redirect("/cuenta");
}
export async function signUp(
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  const db = await supabase();
  if (!db) return { error: "Las cuentas aún no están habilitadas." };
  const email = value(data, "email"),
    password = String(data.get("password") ?? "");
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 10 ||
    password.length > 128
  )
    return {
      error: "Usa un correo válido y una contraseña de 10 a 128 caracteres.",
    };
  if (data.get("privacy") !== "on")
    return { error: "Lee y acepta el uso de datos para crear tu cuenta." };
  try {
    const { error } = await db.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
    });
    if (error)
      return {
        error:
          "No pudimos completar el registro. Inténtalo más tarde o inicia sesión si ya tienes cuenta.",
      };
  } catch {
    return { error: "No pudimos conectar con el servicio de cuentas." };
  }
  return {
    success:
      "Revisa tu correo para confirmar la cuenta. Si ya la tenías, inicia sesión o recupera tu contraseña.",
  };
}
export async function resetPassword(
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  const db = await supabase();
  if (!db) return { error: "Las cuentas aún no están habilitadas." };
  const email = value(data, "email");
  if (!email || email.length > 254)
    return { error: "Indica un correo válido." };
  try {
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/cuenta/clave`,
    });
    if (error)
      return { error: "No pudimos solicitar el enlace. Inténtalo más tarde." };
  } catch {
    return { error: "No pudimos conectar. Inténtalo de nuevo." };
  }
  return {
    success:
      "Si hay una cuenta asociada, recibirás un enlace para cambiar tu contraseña.",
  };
}
export async function updatePassword(
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  const db = await supabase();
  if (!db) return { error: "Servicio no disponible." };
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return {
      error: "Abre el enlace de recuperación de tu correo o inicia sesión.",
    };
  const password = String(data.get("password") ?? "");
  if (password.length < 10 || password.length > 128)
    return { error: "La contraseña debe tener de 10 a 128 caracteres." };
  if (password !== data.get("confirm"))
    return { error: "Las contraseñas no coinciden." };
  const { error } = await db.auth.updateUser({ password });
  if (error)
    return {
      error:
        "No pudimos cambiar la contraseña. Vuelve a solicitar un enlace si ha caducado.",
    };
  return { success: "Contraseña actualizada. Ya puedes volver a tu cuenta." };
}
export async function saveProfile(
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  const db = await supabase();
  if (!db) return { error: "Servicio no disponible." };
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return { error: "Tu sesión ha terminado. Vuelve a iniciar sesión." };
  const full_name = value(data, "full_name"),
    address = value(data, "address"),
    phone = value(data, "phone");
  if (
    full_name.length < 2 ||
    full_name.length > 100 ||
    address.length > 250 ||
    (phone && !/^[+\d\s()-]{7,20}$/.test(phone))
  )
    return { error: "Revisa el nombre, la dirección y el teléfono." };
  const { error } = await db
    .from("profiles")
    .upsert({ id: user.id, full_name, address, phone });
  if (error)
    return { error: "No pudimos guardar tus datos. Inténtalo de nuevo." };
  revalidatePath("/", "layout");
  return { success: "Datos guardados para tus próximos pedidos." };
}
export async function signOut() {
  const db = await supabase();
  if (db) await db.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
