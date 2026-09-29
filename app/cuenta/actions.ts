"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const value = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function saveProfile(
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  const { userId } = await auth();
  if (!userId)
    return { error: "Tu sesión ha terminado. Vuelve a entrar con Google." };

  const db = await supabase();
  if (!db) return { error: "Servicio no disponible." };

  const full_name = value(data, "full_name");
  const address = value(data, "address");
  const phone = value(data, "phone");

  if (
    full_name.length < 2 ||
    full_name.length > 100 ||
    address.length > 250 ||
    (phone && !/^[+\d\s()-]{7,20}$/.test(phone))
  )
    return { error: "Revisa el nombre, la dirección y el teléfono." };

  const { error } = await db
    .from("profiles")
    .upsert({ id: userId, full_name, address, phone });

  if (error)
    return { error: "No pudimos guardar tus datos. Inténtalo de nuevo." };

  revalidatePath("/", "layout");
  return { success: "Datos guardados para tus próximos pedidos." };
}
