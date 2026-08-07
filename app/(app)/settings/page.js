"use client";

import { useEffect, useState } from "react";
import { Settings, Check } from "lucide-react";
import { createClient } from "../../../lib/supabaseClient";

export default function SettingsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState({ full_name: "", phone: "", currency: "MXN" });
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email);
    setUserId(user.id);

    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) setProfile(data);
    setLoading(false);
  }

  async function save(e) {
    e.preventDefault();
    const { error: err } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone || null,
        currency: profile.currency,
      })
      .eq("id", userId);

    if (err) {
      setError(err.message || "No se pudieron guardar los cambios.");
      return;
    }
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div className="p-8 text-dimgray text-sm">Cargando…</div>;

  return (
    <div className="p-6 sm:p-10 max-w-lg mx-auto w-full pb-24 sm:pb-10">
      <h1 className="text-xl font-semibold text-smoke flex items-center gap-2 mb-6">
        <Settings size={18} className="text-accent" /> Ajustes
      </h1>

      {error && (
        <div className="mb-4 bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-2.5 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="text-danger/70 hover:text-danger">✕</button>
        </div>
      )}

      <form onSubmit={save} className="bg-surface border border-onyx rounded-3xl p-6 flex flex-col gap-4">
        <div>
          <label className="text-xs text-dimgray block mb-1">Correo (no editable)</label>
          <input
            disabled
            value={email}
            className="w-full bg-surface/60 border border-onyx rounded-lg px-3 py-2 text-sm text-dimgray"
          />
        </div>

        <div>
          <label className="text-xs text-dimgray block mb-1">Nombre</label>
          <input
            value={profile.full_name || ""}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            className="w-full bg-surface2 border border-onyx rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50"
          />
        </div>

        <div>
          <label className="text-xs text-dimgray block mb-1">
            Número de WhatsApp (con código de país, ej. +5215512345678)
          </label>
          <input
            value={profile.phone || ""}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            placeholder="+52..."
            className="w-full bg-surface2 border border-onyx rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50"
          />
          <p className="text-[11px] text-onyx mt-1">
            Vincula tu número para poder crear tareas y gastos escribiéndole al bot de WhatsApp.
          </p>
        </div>

        <div>
          <label className="text-xs text-dimgray block mb-1">Moneda principal</label>
          <select
            value={profile.currency || "MXN"}
            onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
            className="w-full bg-surface2 border border-onyx rounded-lg px-3 py-2 text-sm outline-none"
          >
            {["MXN", "USD", "EUR", "COP", "ARS", "CLP", "PEN"].map((c) => (
              <option key={c} value={c} className="bg-base">
                {c}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary text-sm py-2 flex items-center justify-center gap-1.5">
          {saved ? (
            <>
              <Check size={15} /> Guardado
            </>
          ) : (
            "Guardar cambios"
          )}
        </button>
      </form>
    </div>
  );
}
