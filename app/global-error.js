"use client";

// Red de seguridad de último nivel: si el error ocurre en el layout raíz
// mismo (fuera del alcance de app/(app)/error.js), Next.js usa este
// archivo. Debe incluir sus propias etiquetas <html>/<body> porque
// reemplaza TODO el layout, incluido el que se rompió.
export default function GlobalError({ error, reset }) {
  return (
    <html lang="es">
      <body style={{ background: "#050505", color: "#f5f5f7", fontFamily: "system-ui" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 380, textAlign: "center" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Algo salió mal</h2>
            <p style={{ fontSize: 14, color: "#7a7a7f", marginBottom: 20 }}>
              La aplicación tuvo un error inesperado. Intenta recargar la página.
            </p>
            <button
              onClick={() => reset()}
              style={{
                background: "linear-gradient(135deg, #8B5CF6 0%, #38BDF8 100%)",
                color: "#fff",
                fontWeight: 500,
                fontSize: 14,
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
