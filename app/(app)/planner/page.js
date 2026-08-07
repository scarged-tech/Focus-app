"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Link2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "../../../lib/supabaseClient";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function PlannerPage() {
  const supabase = createClient();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  useEffect(() => {
    // Muestra un mensaje si venimos de regreso del flujo de Google (solo al montar)
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") setSyncMsg("Google Calendar conectado ✅");
  }, []);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [{ data: taskRows }, { data: eventRows }, { data: tokenRow }] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .not("due_date", "is", null)
        .gte("due_date", weekStart.toISOString().split("T")[0])
        .lt("due_date", weekEnd.toISOString().split("T")[0]),
      supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", weekEnd.toISOString()),
      supabase.from("google_tokens").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]);

    setTasks(taskRows || []);
    setEvents(eventRows || []);
    setConnected(!!tokenRow);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg("");
    const res = await fetch("/api/google/sync", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setSyncMsg(`Sincronizado ✅ (${data.synced} elementos)`);
      load();
    } else {
      setSyncMsg(data.error || "Error al sincronizar");
    }
    setSyncing(false);
  }

  function blockStyle(startISOTime, endISOTime) {
    const start = new Date(startISOTime);
    const end = new Date(endISOTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = (startHour - HOURS[0]) * 48; // 48px por hora
    const height = Math.max((endHour - startHour) * 48, 24);
    return { top, height };
  }

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto w-full">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-smoke flex items-center gap-2">
          <CalendarDays size={18} className="text-accent" /> Planner
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((d) => new Date(d.setDate(d.getDate() - 7)))}
            className="p-1.5 rounded-lg border border-onyx text-dimgray hover:text-silver"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-dimgray w-28 text-center">
            {weekDays[0].toLocaleDateString("es-MX", { day: "numeric", month: "short" })} –{" "}
            {weekDays[6].toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
          </span>
          <button
            onClick={() => setWeekStart((d) => new Date(d.setDate(d.getDate() + 7)))}
            className="p-1.5 rounded-lg border border-onyx text-dimgray hover:text-silver"
          >
            <ChevronRight size={16} />
          </button>

          {connected ? (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 text-sm bg-surface2 border border-onyx text-silver px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Sincronizando…" : "Sincronizar"}
            </button>
          ) : (
            <a
              href="/api/google/auth"
              className="flex items-center gap-1.5 text-sm btn-primary px-3 py-1.5"
            >
              <Link2 size={14} /> Conectar Google Calendar
            </a>
          )}
        </div>
      </header>

      {syncMsg && <p className="text-xs text-accent mb-4">{syncMsg}</p>}

      {/* Grid semanal */}
      <div className="bg-surface border border-onyx rounded-3xl overflow-hidden">
        <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-onyx">
          <div />
          {weekDays.map((d, i) => (
            <div key={i} className="text-center py-2 border-l border-onyx">
              <p className="text-[10px] uppercase text-dimgray">{DAY_LABELS[i]}</p>
              <p className="text-sm text-silver">{d.getDate()}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[48px_repeat(7,1fr)] relative" style={{ height: HOURS.length * 48 }}>
          {/* Columna de horas */}
          <div className="relative">
            {HOURS.map((h) => (
              <div key={h} className="h-12 text-[10px] text-onyx text-right pr-1.5 -translate-y-1.5">
                {h}:00
              </div>
            ))}
          </div>

          {/* Columnas de días */}
          {weekDays.map((d, i) => {
            const dayStr = d.toISOString().split("T")[0];
            const dayTasks = tasks.filter((t) => t.due_date === dayStr);
            const dayEvents = events.filter((e) => e.start_time.startsWith(dayStr));

            return (
              <div key={i} className="relative border-l border-onyx">
                {HOURS.map((h) => (
                  <div key={h} className="h-12 border-b border-white/[0.03]" />
                ))}

                {dayTasks.map((t) => {
                  if (!t.due_time) return null;
                  const start = `${t.due_date}T${t.due_time}`;
                  const end = new Date(new Date(start).getTime() + 3600000).toISOString();
                  const { top, height } = blockStyle(start, end);
                  return (
                    <div
                      key={`task-${t.id}`}
                      className="absolute left-0.5 right-0.5 bg-accent/20 border border-accent/40 rounded-md px-1.5 py-0.5 overflow-hidden"
                      style={{ top, height }}
                    >
                      <p className="text-[10px] text-smoke truncate">{t.title}</p>
                    </div>
                  );
                })}

                {dayEvents.map((e) => {
                  const { top, height } = blockStyle(e.start_time, e.end_time);
                  return (
                    <div
                      key={`event-${e.id}`}
                      className="absolute left-0.5 right-0.5 bg-info/15 border border-info/30 rounded-md px-1.5 py-0.5 overflow-hidden"
                      style={{ top, height }}
                    >
                      <p className="text-[10px] text-info truncate">{e.title}</p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-onyx mt-4">
        <span className="inline-block w-2 h-2 rounded-sm bg-accent/40 border border-accent/60 mr-1 align-middle" /> Tareas propias ·{" "}
        <span className="inline-block w-2 h-2 rounded-sm bg-info/20 border border-info/40 mr-1 align-middle" /> Google Calendar
      </p>
    </div>
  );
}
