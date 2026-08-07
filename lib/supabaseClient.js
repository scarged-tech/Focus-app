"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para usar dentro de Client Components ("use client").
// Lee las variables públicas expuestas por Next.js (NEXT_PUBLIC_*).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
