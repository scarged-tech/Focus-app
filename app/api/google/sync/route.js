import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabaseServer";
import { supabaseAdmin, syncUserCalendar } from "../../../../lib/syncCalendar";

// POST /api/google/sync
// Sincronización manual disparada por el botón "Sincronizar" del Planner,
// para el usuario actualmente logueado.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: tokenRow } = await supabaseAdmin
    .from("google_tokens")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!tokenRow) {
    return NextResponse.json({ error: "Google Calendar no está conectado" }, { status: 400 });
  }

  const synced = await syncUserCalendar(user.id, tokenRow);
  return NextResponse.json({ ok: true, synced });
}
