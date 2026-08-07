import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabaseServer";
import { getAuthUrl } from "../../../../lib/googleCalendar";

// GET /api/google/auth
// El usuario hace clic en "Conectar Google Calendar" en el Planner,
// que apunta aquí. Lo mandamos al consent screen de Google con su
// user.id como "state" para poder identificarlo cuando Google regrese.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL));
  }

  const url = getAuthUrl(user.id);
  return NextResponse.redirect(url);
}
