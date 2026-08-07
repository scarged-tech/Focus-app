"use client";

import { useEffect, useMemo, useState } from "react";
import { Repeat, Plus, Flame, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "../../../lib/supabaseClient";
import { BarChart } from "../../../components/Charts";

const EMOJI_OPTIONS = ["💧", "🛌", "📚", "🏋️", "🧘", "🥗", "🚶", "✍️"];

export default function HabitsPage() {
  const supabase = createClient();
  const [habits, setHabits] = useState([]);
  const [logsByHabit, setLogsByHabit] = useState({}); // habit_id -> Set de fechas "YYYY-MM-DD" completadas
  const [userId, setUserId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", icon: "💧" });
  const [error, setError] = useState("");
  const [monthOffset, setMonthOffset] = useState(0); // 0 = mes actual, -1 = mes anterior...

  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = today.toISOString().split("T")[0];
  const isCurrentMonth = monthOffset === 0;

  const monthDays = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(year, month, i + 1);
        return d.toISOString().split("T")[0];
      }),
    [year, month, daysInMonth]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOffset]);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: habitRows } = await supabase.from("habits").select("*").eq("user_id", user.id);
    setHabits(habitRows || []);

    if (habitRows?.length) {
      const ids = habitRows.map((h) => h.id);
      const { data: logRows } = await supabase
        .from("habit_logs")
        .select("*")
        .in("habit_id", ids)
        .gte("log_date", monthDays[0])
        .lte("log_date", monthDays[monthDays.length - 1]);

      const map = {};
      ids.forEach((id) => (map[id] = new Set()));
      (logRows || []).forEach((l) => {
        if (l.completed) map[l.habit_id].add(l.log_date);
      });
      setLogsByHabit(map);
    } else {
      setLogsByHabit({});
    }
  }

  async function addHabit(e) {
    e.preventDefault();
    if (!form.title.trim() || !userId) return;
    const { data, error: err } = await supabase
      .from("habits")
      .insert({ user_id: userId, title: form.title, icon: form.icon, schedule: "daily" })
      .select()
      .single();
    if (err || !data) return setError(err?.message || "No se pudo crear el hábito.");
    setHabits((h) => [...h, data]);
    setLogsByHabit((m) => ({ ...m, [data.id]: new Set() }));
    setForm({ title: "", icon: "💧" });
    setShowForm(false);
  }

  async function deleteHabit(id) {
    if (!confirm("¿Eliminar este hábito? Se borrará también su historial.")) return;
    setHabits((h) => h.filter((x) => x.id !== id));
    await supabase.from("habits").delete().eq("id", id);
  }

  async function toggleDay(habit, date) {
    const set = new Set(logsByHabit[habit.id]);
    const isCompleted = set.has(date);

    if (isCompleted) set.delete(date);
    else set.add(date);
    setLogsByHabit((m) => ({ ...m, [habit.id]: set }));

    await supabase
      .from("habit_logs")
      .upsert(
        { habit_id: habit.id, log_date: date, completed: !isCompleted },
        { onConflict: "habit_id,log_date" }
      );
  }

  function currentStreak(habitId) {
    const set = logsByHabit[habitId] || new Set();
    let streak = 0;
    for (let i = monthDays.length - 1; i >= 0; i--) {
      const d = monthDays[i];
      if (d > todayStr) continue; // no cuentes días futuros
      if (set.has(d)) streak++;
      else break;
    }
    return streak;
  }

  // Barras diarias: cuántos hábitos se cumplieron cada día del mes (para el gráfico de arriba)
  const dailyChart = monthDays.map((day) => {
    const count = habits.reduce((sum, h) => sum + ((logsByHabit[h.id]?.has(day)) ? 1 : 0), 0);
    return { label: String(Number(day.slice(8))), value: count, highlight: day === todayStr };
  });

  const totalPossible = habits.length * monthDays.filter((d) => d <= todayStr).length;
  const totalDone = habits.reduce((sum, h) => sum + (logsByHabit[h.id]?.size || 0), 0);
  const monthPct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto w-full pb-24 sm:pb-10">
      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-smoke flex items-center gap-2">
          <Repeat size={18} className="text-accent" /> Hábitos
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="p-1.5 rounded-lg border border-onyx text-dimgray hover:text-silver"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-silver w-32 text-center capitalize">
            {viewDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg border border-onyx text-dimgray hover:text-silver disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm btn-primary px-3 py-1.5"
          >
            <Plus size={15} /> Nuevo
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-2.5 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="text-danger/70 hover:text-danger">✕</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={addHabit} className="mb-6 bg-surface border border-onyx rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1.5 flex-wrap">
            {EMOJI_OPTIONS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setForm({ ...form, icon: e })}
                className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center ${
                  form.icon === e ? "bg-accent/20 border border-accent" : "bg-surface2"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            autoFocus
            placeholder="Nombre del hábito (ej. Dormir 8h)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="flex-1 bg-surface2 border border-onyx rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50"
          />
          <button type="submit" className="btn-primary text-sm px-4">
            Guardar
          </button>
        </form>
      )}

      {habits.length === 0 ? (
        <section className="bg-surface border border-onyx rounded-3xl p-6">
          <p className="text-sm text-dimgray">Aún no tienes hábitos. Crea el primero para empezar a ver tu progreso del mes.</p>
        </section>
      ) : (
        <>
          {/* Gráfico mensual: cuántos hábitos cumpliste cada día */}
          <section className="bg-surface border border-onyx rounded-3xl p-6 mb-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-silver">Cumplimiento del mes</p>
              <span className="text-xs text-accent">{monthPct}% · {totalDone}/{totalPossible}</span>
            </div>
            <BarChart data={dailyChart} height={70} maxOverride={habits.length} />
            <div className="flex mt-1">
              {dailyChart.map((d, i) => (
                <span key={i} className="flex-1 text-center text-[8px] text-onyx">
                  {Number(d.label) % 5 === 0 || Number(d.label) === 1 ? d.label : ""}
                </span>
              ))}
            </div>
          </section>

          {/* Cuadrícula del mes por hábito */}
          <section className="bg-surface border border-onyx rounded-3xl p-6 overflow-x-auto">
            <div style={{ minWidth: daysInMonth * 26 + 160 }}>
              {/* Encabezado de días */}
              <div className="flex items-center gap-[3px] mb-2 pl-[136px]">
                {monthDays.map((d) => (
                  <div
                    key={d}
                    className={`w-5 text-center text-[9px] shrink-0 ${d === todayStr ? "text-accent font-semibold" : "text-onyx"}`}
                  >
                    {Number(d.slice(8))}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                {habits.map((h) => {
                  const set = logsByHabit[h.id] || new Set();
                  const streak = currentStreak(h.id);
                  const monthCount = set.size;
                  return (
                    <div key={h.id} className="flex items-center gap-2">
                      <div className="w-[136px] shrink-0 flex items-center justify-between gap-1.5 pr-2">
                        <span className="flex items-center gap-1.5 text-sm text-smoke truncate">
                          <span>{h.icon}</span>
                          <span className="truncate">{h.title}</span>
                        </span>
                        <button onClick={() => deleteHabit(h.id)} className="text-onyx hover:text-danger shrink-0">
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="flex items-center gap-[3px]">
                        {monthDays.map((d) => {
                          const done = set.has(d);
                          const isFuture = d > todayStr;
                          return (
                            <button
                              key={d}
                              onClick={() => !isFuture && toggleDay(h, d)}
                              disabled={isFuture}
                              title={d}
                              className={`w-5 h-5 rounded-[4px] shrink-0 transition ${
                                done
                                  ? "bg-accent"
                                  : isFuture
                                  ? "bg-surface2/40"
                                  : d === todayStr
                                  ? "border border-accent/60"
                                  : "bg-surface2"
                              }`}
                            />
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-1.5 pl-2 shrink-0">
                        <Flame size={12} className="text-warning" />
                        <span className="text-xs text-dimgray w-16">
                          {streak}d racha · {monthCount}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
