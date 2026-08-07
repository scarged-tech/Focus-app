import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Protege todas las rutas excepto /login: si no hay sesión, redirige a /login.
// También refresca el token de sesión en cada request (requerido por Supabase SSR).
export async function middleware(request) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");
  const isResetPassword = request.nextUrl.pathname.startsWith("/reset-password");

  if (!user && !isLoginPage && !isAuthCallback && !isResetPassword) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  // Excluye assets estáticos, los archivos de la PWA (manifest, service worker,
  // íconos) y TODAS las rutas /api/* — estas últimas manejan su propia
  // autenticación internamente (sesión de usuario, o CRON_SECRET / firma de
  // Twilio para las que se llaman desde fuera de la app).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-192.png|icon-512.png|apple-touch-icon.png|api/).*)",
  ],
};
