"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabaseClient";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error"); // "error" | "success"
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessageType("error");
      setMessage(error.message);
    } else {
      setMessageType("success");
      setMessage("Contraseña actualizada. Redirigiendo…");
      setTimeout(() => (window.location.href = "/"), 1500);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-onyx rounded-3xl p-6">
        <h1 className="text-lg font-semibold text-smoke mb-1">Nueva contraseña</h1>
        <p className="text-sm text-dimgray mb-5">Elige una contraseña nueva para tu cuenta.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            required
            minLength={6}
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-surface2 border border-onyx rounded-lg px-3 py-2 text-sm text-smoke outline-none focus:border-accent/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary text-sm py-2 disabled:opacity-50"
          >
            {loading ? "Guardando…" : "Actualizar contraseña"}
          </button>
        </form>

        {message && (
          <p className={`text-xs mt-3 ${messageType === "success" ? "text-success" : "text-danger"}`}>{message}</p>
        )}
      </div>
    </div>
  );
}
