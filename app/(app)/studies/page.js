"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Plus, Play, Pause, RotateCcw } from "lucide-react";
import { createClient } from "../../../lib/supabaseClient";
import { BarChart } from "../../../components/Charts";

const FOCUS_SECONDS = 25 * 60;

export default function StudiesPage() {
  const supabase = createClient();
  const [subjects, setSubjects] = useState([]);
  const [userId, setUserId] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [weeklyChart, setWeeklyChart] = useState([]);
  const [subjectTotals, setSubjectTotals] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            logSession();
            return FOCUS_SECONDS;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase.from("subjects").select("*").eq("user_id", user.id);
    setSubjects(data || []);
    if (data?.length) setActiveSubject(data[0]);

    if (data?.length) {
      const subjectIds = data.map((s) => s.id);
      const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0];
      const { data: sessions } = await supabase
        .from("study_sessions")
        .select("subject_id, duration_minutes, session_date")
        .in("subject_id", subjectIds)
        .gte("session_date", weekAgo);

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });
      const dayLabels = ["D", "L", "M", "M", "J", "V", "S"];
      setWeeklyChart(
        days.map((day) => ({
          label: dayLabels[new Date(day + "T00:00:00").getDay()],
          value: (sessions || []).filter((s) => s.session_date === day).reduce((sum, s) => sum + s.duration_minutes, 0),
        }))
      );

      const totals = {};
      (sessions || []).forEach((s) => {
        totals[s.subject_id] = (totals[s.subject_id] || 0) + s.duration_minutes;
      });
      setSubjectTotals(totals);
    }
  }

  async function addSubject() {
    const name = prompt("Nombre de la materia (ej. Cálculo II)");
    if (!name || !userId) return;
    const { data, error: err } = await supabase
      .from("subjects")
      .insert({ user_id: userId, name, topics_count: 0 })
      .select()
      .single();
    if (err || !data) return setError(err?.message || "No se pudo crear la materia.");
    setSubjects((s) => [...s, data]);
    setActiveSubject(data);
  }

  async function logSession() {
    if (!activeSubject) return;
    await supabase.from("study_sessions").insert({
      subject_id: activeSubject.id,
      duration_minutes: 25,
    });
    load();
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(FOCUS_SECONDS);
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const progress = 1 - secondsLeft / FOCUS_SECONDS;
  const circumference = 2 * Math.PI * 42;
  const maxSubjectMinutes = Math.max(...Object.values(subjectTotals), 1);

  return (
    <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-smoke flex items-center gap-2">
          <BookOpen size={18} className="text-accent" /> Estudios
        </h1>
        <button onClick={addSubject} className="flex items-center gap-1.5 text-sm btn-primary px-3 py-1.5">
          <Plus size={15} /> Materia
        </button>
      </header>

      {error && (
        <div className="mb-4 bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-2.5 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="text-danger/70 hover:text-danger">✕</button>
        </div>
      )}

      {weeklyChart.length > 0 && (
        <section className="bg-surface border border-onyx rounded-3xl p-6 mb-5">
          <p className="text-sm font-medium text-silver mb-4">Minutos de estudio · esta semana</p>
          <BarChart data={weeklyChart.map((d) => ({ ...d, highlight: true }))} height={80} />
          <div className="flex justify-between mt-2">
            {weeklyChart.map((d, i) => (
              <span key={i} className="flex-1 text-center text-[10px] text-onyx">
                {d.label}
              </span>
            ))}
          </div>
        </section>
      )}

      {subjects.length > 0 && (
        <section className="bg-surface border border-onyx rounded-3xl p-6 mb-5">
          <div className="flex justify-between text-xs text-dimgray mb-3">
            <span>Materias</span>
            <span>Esta semana</span>
          </div>
          <ul className="flex flex-col divide-y divide-onyx">
            {subjects.map((s) => {
              const minutes = subjectTotals[s.id] || 0;
              return (
                <li key={s.id} className="py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-smoke">{s.name}</span>
                    <span className="text-sm text-silver">
                      {Math.floor(minutes / 60)}h {minutes % 60}min
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface2 overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${(minutes / maxSubjectMinutes) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSubject(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              activeSubject?.id === s.id ? "bg-accent text-base font-medium" : "bg-surface2 text-silver"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <section className="bg-surface border border-onyx rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs uppercase tracking-wide text-dimgray">Pomodoro</span>
          {activeSubject && <span className="text-xs text-dimgray">Sesión de 25 min · {activeSubject.name}</span>}
        </div>

        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
              <defs>
                <linearGradient id="pomodoroRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff14" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="url(#pomodoroRing)"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold text-smoke">
                {mm}:{ss}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setRunning((r) => !r)}
              disabled={!activeSubject}
              className="flex items-center gap-1.5 btn-primary text-sm px-3 py-1.5 disabled:opacity-40"
            >
              {running ? <Pause size={14} /> : <Play size={14} />}
              {running ? "Pausar" : "Iniciar"}
            </button>
            <button onClick={reset} className="flex items-center gap-1.5 text-dimgray text-sm px-3 py-1.5 rounded-lg border border-onyx">
              <RotateCcw size={14} /> Reiniciar
            </button>
          </div>
        </div>
        <p className="text-xs text-onyx mt-4">
          Cada ciclo completado se registra automáticamente en las horas de estudio de la materia activa.
        </p>
      </section>
    </div>
  );
}
