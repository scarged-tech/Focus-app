import { NextResponse } from "next/server";
import { supabaseAdmin, syncUserCalendar } from "../../../../lib/syncCalendar";

// GET /api/google/cron-sync
// Vercel Cron llama esta ruta cada 15 min (ver vercel.json) para
// sincronizar a TODOS los usuarios que tengan Google Calendar conectado,
// sin que nadie tenga que presionar el botón manual.
//
// Protegida con CRON_SECRET: Vercel Cron manda el header
// "Authorization: Bearer <CRON_SECRET>" automáticamente si defines esa
// variable de entorno (ver README).
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: tokenRows } = await supabaseAdmin.from("google_tokens").select("*");

  // Cada usuario se sincroniza de forma independiente, así que se corren
  // en paralelo en vez de uno por uno; allSettled aísla los fallos de un
  // usuario sin detener al resto (antes un error a mitad del for cortaba
  // el procesamiento de los usuarios restantes solo si no había try/catch
  // por iteración, y de cualquier forma serializaba todo el trabajo).
  const settled = await Promise.allSettled(
    (tokenRows || []).map((tokenRow) => syncUserCalendar(tokenRow.user_id, tokenRow))
  );
  const results = settled.map((r, i) =>
    r.status === "fulfilled"
      ? { user_id: tokenRows[i].user_id, synced: r.value }
      : { user_id: tokenRows[i].user_id, error: String(r.reason) }
  );

  return NextResponse.json({ ok: true, usersProcessed: results.length, results });
}
