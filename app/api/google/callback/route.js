import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { exchangeCodeForTokens } from "../../../../lib/googleCalendar";

// GET /api/google/callback
// Google regresa aquí con ?code=...&state=<user_id> después de que
// el usuario acepta el consentimiento. Guardamos los tokens en
// google_tokens para poder leer/escribir su calendario después.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(`${origin}/planner?google=error`);
  }

  const tokens = await exchangeCodeForTokens(code);

  await supabaseAdmin.from("google_tokens").upsert({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    calendar_id: "primary",
    updated_at: new Date().toISOString(),
  });

  return NextResponse.redirect(`${origin}/planner?google=connected`);
}
