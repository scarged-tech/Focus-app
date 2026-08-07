"use client";

import { useEffect, useState } from "react";
import { Target, Plus, Trash2 } from "lucide-react";
import { createClient } from "../../../lib/supabaseClient";

export default function GoalsPage() {
  const supabase = createClient();
  const [goals, setGoals] = useState([]);
  const [userId, setUserId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", target_value: "", deadline: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase.from("goals").select("*").eq("user_id", user.id);
    setGoals(data || []);
  }

  async function addGoal(e) {
    e.preventDefault();
    if (!form.title.trim() || !userId) return;
    const { data, error: err } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title: form.title,
        target_value: Number(form.target_value) || 0,
        current_value: 0,
        deadline: form.deadline || null,
        type: "numeric",
      })
      .select()
      .single();
    if (err || !data) return setError(err?.message || "No se pudo crear la meta.");
    setGoals((g) => [...g, data]);
    setForm({ title: "", target_value: "", deadline: "" });
    setShowForm(false);
  }

  async function updateProgress(goal, value) {
    setGoals((g) => g.map((x) => (x.id === goal.id ? { ...x, current_value: value } : x)));
    await supabase.from("goals").update({ current_value: value }).eq("id", goal.id);
  }

  async function deleteGoal(id) {
    if (!confirm("¿Eliminar esta meta?")) return;
    setGoals((g) => g.filter((x) => x.id !== id));
    await supabase.from("goals").delete().eq("id", id);
  }

  return (
    <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-smoke flex items-center gap-2">
          <Target size={18} className="text-accent" /> Metas
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm btn-primary px-3 py-1.5"
        >
          <Plus size={15} /> Nueva meta
        </button>
      </header>

      {error && (
        <div className="mb-4 bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-2.5 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="text-danger/70 hover:text-danger">✕</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={addGoal} className="mb-6 bg-surface border border-onyx rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <input
            autoFocus
            placeholder="Nombre de la meta"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="flex-1 bg-surface2 border border-onyx rounded-lg px-3 py-2 text-sm outline-none"
          />
          <input
            type="number"
            placeholder="Objetivo (ej. 200000)"
            value={form.target_value}
            onChange={(e) => setForm({ ...form, target_value: e.target.value })}
            className="w-40 bg-surface2 border border-onyx rounded-lg px-3 py-2 text-sm outline-none"
          />
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="bg-surface2 border border-onyx rounded-lg px-3 py-2 text-sm outline-none"
          />
          <button type="submit" className="btn-primary text-sm px-4">
            Guardar
          </button>
        </form>
      )}

      <section className="bg-surface border border-onyx rounded-3xl p-6 flex flex-col gap-5">
        {goals.length === 0 && <p className="text-sm text-onyx">Aún no tienes metas. Crea la primera.</p>}
        {goals.map((g) => {
          const pct = g.target_value ? Math.min((g.current_value / g.target_value) * 100, 100) : 0;
          return (
            <div key={g.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-smoke">{g.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-dimgray">
                    {g.current_value?.toLocaleString("es-MX")} / {g.target_value?.toLocaleString("es-MX")}
                  </span>
                  <button onClick={() => deleteGoal(g.id)} className="text-onyx hover:text-danger">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
                <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <input
                type="range"
                min="0"
                max={g.target_value || 0}
                value={g.current_value || 0}
                onChange={(e) => updateProgress(g, Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          );
        })}
      </section>
    </div>
  );
}
