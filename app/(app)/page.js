"use client";

import { useEffect, useState } from "react";
import {
  ListChecks,
  Repeat,
  Wallet,
  StickyNote,
  Plus,
  Flame,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { createClient } from "../../lib/supabaseClient";
import { LineChart } from "../../components/Charts";

export default function DashboardPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState({});
  const [noteText, setNoteText] = useState("");
  const [noteId, setNoteId] = useState(null);
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: taskRows }, { data: habitRows }, { data: logRows }, { data: txRows }, { data: noteRows }, { data: profileRow }] =
      await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user.id)
          .eq("due_date", today)
          .order("created_at"),
        supabase.from("habits").select("*").eq("user_id", user.id),
        supabase.from("habit_logs").select("*").eq("log_date", today),
        supabase
          .from("transactions")
          .select("amount, tx_date, accounts!inner(user_id)")
          .eq("accounts.user_id", user.id)
          .gte("tx_date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
          .order("tx_date"),
        supabase
          .from("notes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      ]);

    setTasks(taskRows || []);
    setHabits(habitRows || []);
    setFirstName(profileRow?.full_name?.split(" ")[0] || "");

    const logsMap = {};
    (logRows || []).forEach((l) => (logsMap[l.habit_id] = l));
    setHabitLogs(logsMap);

    const income = (txRows || []).filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = (txRows || []).filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    setTotals({ income, expenses });

    // Serie diaria acumulada de los últimos 14 días para el gráfico.
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split("T")[0];
    });
    let running = 0;
    const series = days.map((day) => {
      const dayTotal = (txRows || []).filter((t) => t.tx_date === day).reduce((s, t) => s + t.amount, 0);
      running += dayTotal;
      return { label: day.slice(5), value: running };
    });
    setChartData(series);

    if (noteRows && noteRows[0]) {
      setNoteText(noteRows[0].content || "");
      setNoteId(noteRows[0].id);
    }

    setLoading(false);
  }

  async function toggleTask(task) {
    const newStatus = task.status === "done" ? "todo" : "done";
    setTasks((t) => t.map((x) => (x.id === task.id ? { ...x, status: newStatus } : x)));
    await supabase.from("tasks").update({ status: newStatus }).eq("id", task.id);
  }

  async function toggleHabit(habit) {
    const existing = habitLogs[habit.id];
    if (existing) {
      const newVal = !existing.completed;
      setHabitLogs((h) => ({ ...h, [habit.id]: { ...existing, completed: newVal } }));
      await supabase.from("habit_logs").update({ completed: newVal }).eq("id", existing.id);
    } else {
      const { data } = await supabase
        .from("habit_logs")
        .insert({ habit_id: habit.id, log_date: today, completed: true })
        .select()
        .single();
      setHabitLogs((h) => ({ ...h, [habit.id]: data }));
    }
  }

  async function saveNote(text) {
    setNoteText(text);
    if (noteId) {
      await supabase.from("notes").update({ content: text }).eq("id", noteId);
    } else if (userId) {
      const { data } = await supabase
        .from("notes")
        .insert({ user_id: userId, content: text, title: "Nota rápida" })
        .select()
        .single();
      setNoteId(data.id);
    }
  }

  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const habitsDone = habits.filter((h) => habitLogs[h.id]?.completed).length;
  const balance = totals.income - totals.expenses;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const dateLabel = now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

  if (loading) {
    return <div className="p-8 text-dimgray text-sm">Cargando…</div>;
  }

  return (
    <div className="p-5 sm:p-8 max-w-6xl mx-auto w-full">
      <header className="relative overflow-hidden bg-gradient-to-br from-surface2 to-surface border border-onyx rounded-3xl p-6 sm:p-7 mb-6 flex items-center gap-5">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-glow-brand blur-3xl rounded-full pointer-events-none" />
        <div className="w-16 h-16 shrink-0 rounded-2xl bg-surface2 border border-onyx flex flex-col items-center justify-center leading-none relative z-10">
          <span className="text-2xl font-semibold text-smoke">{now.getDate()}</span>
          <span className="text-[10px] uppercase text-dimgray mt-0.5">
            {now.toLocaleDateString("es-MX", { month: "short" })}
          </span>
        </div>
        <div className="relative z-10">
          <p className="text-xs text-dimgray capitalize mb-1">{dateLabel}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            <span className="text-smoke">{greeting}</span>
            {firstName ? <span className="text-gradient">{`, ${firstName}`}</span> : ""} 👋
          </h1>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tareas */}
        <section className="md:col-span-2 bg-surface border border-onyx rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-silver flex items-center gap-2">
              <ListChecks size={16} className="text-accent" /> Tareas de hoy
            </h2>
            <span className="text-xs text-dimgray">
              {tasksDone}/{tasks.length}
            </span>
          </div>
          {tasks.length === 0 && (
            <p className="text-sm text-onyx">Sin tareas para hoy. Añade una desde el módulo Tareas.</p>
          )}
          <ul className="flex flex-col gap-2">
            {tasks.map((t) => (
              <li
                key={t.id}
                onClick={() => toggleTask(t)}
                className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-surface2 cursor-pointer transition"
              >
                <Checkbox checked={t.status === "done"} />
                <span className={`text-sm flex-1 ${t.status === "done" ? "line-through text-dimgray" : "text-silver"}`}>
                  {t.title}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Hábitos */}
        <section className="bg-surface border border-onyx rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-silver flex items-center gap-2">
              <Repeat size={16} className="text-accent" /> Hábitos
            </h2>
            <span className="flex items-center gap-1 text-xs text-warning">
              <Flame size={13} /> {habitsDone}
            </span>
          </div>
          {habits.length === 0 && <p className="text-sm text-onyx">Crea tu primer hábito.</p>}
          <ul className="flex flex-col gap-2">
            {habits.map((h) => (
              <li key={h.id} onClick={() => toggleHabit(h)} className="flex items-center gap-3 py-1.5 cursor-pointer">
                <Checkbox checked={!!habitLogs[h.id]?.completed} />
                <span className="text-sm">{h.icon}</span>
                <span className={`text-sm ${habitLogs[h.id]?.completed ? "text-dimgray line-through" : "text-silver"}`}>
                  {h.title}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Finanzas */}
        <section className="md:col-span-2 bg-surface border border-onyx rounded-3xl p-6">
          <h2 className="text-sm font-medium text-silver flex items-center gap-2 mb-4">
            <Wallet size={16} className="text-accent" /> Finanzas del mes
          </h2>
          <div className="flex items-end justify-between mb-1">
            <div>
              <p className="text-dimgray text-xs">Balance · últimos 14 días</p>
              <p className="text-3xl font-semibold text-smoke">${balance.toLocaleString("es-MX")}</p>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-success">
                <TrendingUp size={14} /> ${totals.income.toLocaleString("es-MX")}
              </span>
              <span className="flex items-center gap-1 text-danger">
                <TrendingDown size={14} /> ${totals.expenses.toLocaleString("es-MX")}
              </span>
            </div>
          </div>
          <LineChart data={chartData} height={100} />
          <div className="flex justify-between text-[10px] text-onyx mt-1">
            <span>{chartData[0]?.label}</span>
            <span>{chartData[chartData.length - 1]?.label}</span>
          </div>
        </section>

        {/* Notas */}
        <section className="bg-surface border border-onyx rounded-3xl p-6 flex flex-col">
          <h2 className="text-sm font-medium text-silver flex items-center gap-2 mb-3">
            <StickyNote size={16} className="text-accent" /> Nota rápida
          </h2>
          <textarea
            value={noteText}
            onChange={(e) => saveNote(e.target.value)}
            placeholder="Escribe algo que quieras recordar hoy…"
            className="flex-1 min-h-[110px] bg-transparent text-sm text-silver placeholder-neutral-600 resize-none outline-none border border-onyx rounded-xl p-3 focus:border-accent/50 transition"
          />
        </section>
      </div>
    </div>
  );
}

function Checkbox({ checked }) {
  return (
    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-accent border-accent" : "border-dimgray"}`}>
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M1 5l2.5 2.5L9 2" stroke="#fff" strokeWidth="1.6" fill="none" />
        </svg>
      )}
    </span>
  );
}
