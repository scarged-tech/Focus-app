import { createClient } from "@supabase/supabase-js";

// Cliente único con la service_role key, para código de servidor que
// necesita saltarse RLS (cron jobs, webhooks, callbacks de OAuth).
// Antes se construía por separado en syncCalendar.js, callback/route.js
// y whatsapp/webhook/route.js — centralizado aquí para no triplicar
// la instanciación del cliente con las mismas credenciales.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
