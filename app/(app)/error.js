"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

// Next.js renderiza este componente automáticamente si CUALQUIER página
// dentro de app/(app)/ truena (por ejemplo, un error de Supabase no
// manejado). En vez de la pantalla en blanco de "Application error",
// el usuario ve esto y puede reintentar sin perder toda la sesión.
export default function AppError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={20} className="text-danger" />
        </div>
        <h2 className="text-lg font-semibold text-smoke mb-1">Algo salió mal</h2>
        <p className="text-sm text-dimgray mb-5">
          Esta sección tuvo un error inesperado. Puedes intentar de nuevo o volver al inicio.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="btn-primary text-sm px-4 py-2"
          >
            Reintentar
          </button>
          <a href="/" className="text-sm text-dimgray hover:text-silver px-4 py-2">
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
