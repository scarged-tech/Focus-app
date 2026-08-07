"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // signin | signup
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error"); // "error" | "success"
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessageType("error");
        setMessage(error.message);
      } else {
        window.location.href = "/";
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setMessageType(error ? "error" : "success");
      setMessage(error ? error.message : "Revisa tu correo para confirmar la cuenta.");
    }

    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) {
      setMessageType("error");
      setMessage("Escribe tu correo arriba primero.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setMessageType(error ? "error" : "success");
    setMessage(error ? error.message : "Te enviamos un correo para restablecer tu contraseña.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-glow-brand blur-3xl rounded-full pointer-events-none" />
      <div className="w-full max-w-sm bg-surface border border-onyx rounded-3xl p-6 relative z-10">
        <div className="w-8 h-8 rounded-md bg-gradient-brand flex items-center justify-center text-white font-bold mb-4">
          F
        </div>
        <h1 className="text-lg font-semibold mb-1">
          <span className="text-gradient">{mode === "signin" ? "Inicia sesión" : "Crea tu cuenta"}</span>
        </h1>
        <p className="text-sm text-dimgray mb-5">
          {mode === "signin" ? "Bienvenido de nuevo." : "Empieza a organizar tu día."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-surface2 border border-onyx rounded-lg px-3 py-2 text-sm text-smoke outline-none focus:border-accent/50"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-surface2 border border-onyx rounded-lg px-3 py-2 text-sm text-smoke outline-none focus:border-accent/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary text-sm py-2 mt-1 disabled:opacity-50"
          >
            {loading ? "Cargando…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        {message && (
          <p className={`text-xs mt-3 ${messageType === "success" ? "text-success" : "text-danger"}`}>{message}</p>
        )}

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-xs text-dimgray hover:text-silver"
          >
            {mode === "signin" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
          {mode === "signin" && (
            <button onClick={handleForgotPassword} className="text-xs text-dimgray hover:text-silver">
              Olvidé mi contraseña
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
