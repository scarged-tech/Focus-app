"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Plus, TrendingUp } from "lucide-react";
import { createClient } from "../../../lib/supabaseClient";
import { LineChart } from "../../../components/Charts";

export default function TrainingPage() {
  const supabase = createClient();
  const [workouts, setWorkouts] = useState([]);
  const [userId, setUserId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({ exercise_name: "", reps: "", weight_kg: "" });
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [activeExercise, setActiveExercise] = useState(null);
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
    const { data, error: err } = await supabase.from("workouts").select("*").eq("user_id", user.id);
    if (err) return setError(err.message);
    setWorkouts(data || []);
    if (data?.length) selectWorkout(data[0]);
  }

  async function selectWorkout(w) {
    if (!w) return; // guarda contra llamadas accidentales con datos vacíos
    setActiveWorkout(w);
    const { data, error: err } = await supabase
      .from("exercise_logs")
      .select("*")
      .eq("workout_id", w.id)
      .order("log_date", { ascending: false })
      .limit(50);
    if (err) return setError(err.message);
    setLogs(data || []);
    setActiveExercise(data?.[0]?.exercise_name || null);
  }

  async function addWorkout() {
    const name = prompt("Nombre de la rutina (ej. Push Day)");
    if (!name || !userId) return;
    const { data, error: err } = await supabase
      .from("workouts")
      .insert({ user_id: userId, name, workout_type: "strength" })
      .select()
      .single();

    if (err || !data) {
      setError(err?.message || "No se pudo crear la rutina. Intenta de nuevo.");
      return;
    }
    setWorkouts((w) => [...w, data]);
    selectWorkout(data);
  }

  async function logSet(e) {
    e.preventDefault();
    if (!activeWorkout || !form.exercise_name) return;
    const { data, error: err } = await supabase
      .from("exercise_logs")
      .insert({
        workout_id: activeWorkout.id,
        exercise_name: form.exercise_name,
        sets: [{ reps: Number(form.reps), weight_kg: Number(form.weight_kg) }],
      })
      .select()
      .single();

    if (err || !data) {
      setError(err?.message || "No se pudo registrar la serie.");
      return;
    }
    setLogs((l) => [data, ...l]);
    setForm({ exercise_name: "", reps: "", weight_kg: "" });
    if (!activeExercise) setActiveExercise(data.exercise_name);
  }

  const exerciseNames = [...new Set(logs.map((l) => l.exercise_name))];
  const progressionData = logs
    .filter((l) => l.exercise_name === activeExercise)
    .slice()
    .sort((a, b) => new Date(a.log_date) - new Date(b.log_date))
    .map((l) => ({ label: l.log_date?.slice(5), value: l.sets?.[0]?.weight_kg || 0 }));
  const record = progressionData.length ? Math.max(...progressionData.map((d) => d.value)) : 0;

  return (
    <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-smoke flex items-center gap-2">
          <Dumbbell size={18} className="text-accent" /> Entrenamiento
        </h1>
        <button onClick={addWorkout} className="flex items-center gap-1.5 text-sm btn-primary px-3 py-1.5">
          <Plus size={15} /> Rutina
        </button>
      </header>

      {error && (
        <div className="mb-4 bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-2.5 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="text-danger/70 hover:text-danger">✕</button>
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {workouts.map((w) => (
          <button
            key={w.id}
            onClick={() => selectWorkout(w)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              activeWorkout?.id === w.id ? "bg-accent text-base font-medium" : "bg-surface2 text-silver"
            }`}
          >
            {w.name}
          </button>
        ))}
      </div>

      {activeWorkout && (
        <>
          <form onSubmit={logSet} className="mb-5 bg-surface border border-onyx rounded-xl p-4 grid grid-cols-3 gap-3">
            <input
              placeholder="Ejercicio"
              value={form.exercise_name}
              onChange={(e) => setForm({ ...form, exercise_name: e.target.value })}
              className="bg-surface2 border border-onyx rounded-lg px-2 py-2 text-sm col-span-3 sm:col-span-1"
            />
            <input
              type="number"
              placeholder="Reps"
              value={form.reps}
              onChange={(e) => setForm({ ...form, reps: e.target.value })}
              className="bg-surface2 border border-onyx rounded-lg px-2 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Peso (kg)"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              className="bg-surface2 border border-onyx rounded-lg px-2 py-2 text-sm"
            />
            <button type="submit" className="btn-primary text-sm col-span-3 sm:col-span-1">
              Registrar serie
            </button>
          </form>

          {exerciseNames.length > 0 && (
            <section className="bg-surface border border-onyx rounded-3xl p-6 mb-5">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex gap-1.5 flex-wrap">
                  {exerciseNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => setActiveExercise(name)}
                      className={`px-2.5 py-1 rounded-md text-xs ${
                        activeExercise === name ? "bg-accent text-base font-medium" : "bg-surface2 text-silver"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                {progressionData.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-accent shrink-0">
                    <TrendingUp size={13} /> Récord · {record}kg
                  </span>
                )}
              </div>
              <LineChart data={progressionData} height={100} />
              {progressionData.length > 0 && (
                <div className="flex justify-between text-[10px] text-onyx mt-1">
                  <span>{progressionData[0]?.label}</span>
                  <span>{progressionData[progressionData.length - 1]?.label}</span>
                </div>
              )}
            </section>
          )}

          <section className="bg-surface border border-onyx rounded-3xl p-6">
            <h2 className="text-sm font-medium text-silver mb-3">Historial · {activeWorkout.name}</h2>
            {logs.length === 0 && <p className="text-sm text-onyx">Sin registros todavía.</p>}
            <ul className="flex flex-col divide-y divide-onyx">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{l.exercise_name}</span>
                  <span className="text-dimgray">
                    {l.sets?.[0]?.reps} × {l.sets?.[0]?.weight_kg} kg
                  </span>
                  <span className="text-onyx text-xs">{l.log_date}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
