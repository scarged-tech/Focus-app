"use client";

import { useEffect, useState } from "react";
import { Plus, GripVertical, X, Trash2 } from "lucide-react";
import { createClient } from "../../../lib/supabaseClient";

const quadrants = [
  { key: "urgent-important", title: "Urgente · Importante", accent: "border-danger/40" },
  { key: "not-urgent-important", title: "Importante", accent: "border-info/40" },
  { key: "urgent-not-important", title: "Urgente", accent: "border-warning/40" },
  { key: "not-urgent-not-important", title: "Después", accent: "border-dimgray/40" },
];

const columns = [
  { key: "todo", title: "Por hacer" },
  { key: "doing", title: "Haciendo" },
  { key: "done", title: "Hecho" },
];

export default function TasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("eisenhower");
  const [draggedId, setDraggedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newQuadrant, setNewQuadrant] = useState("urgent-important");
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at");
    setTasks(data || []);
  }

  async function addTask(e) {
    e.preventDefault();
    if (!newTitle.trim() || !userId) return;
    const { data, error: err } = await supabase
      .from("tasks")
      .insert({ user_id: userId, title: newTitle, priority: newQuadrant, status: "todo" })
      .select()
      .single();
    if (err || !data) return setError(err?.message || "No se pudo crear la tarea.");
    setTasks((t) => [...t, data]);
    setNewTitle("");
    setShowForm(false);
  }

  async function moveTask(id, status) {
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));
    await supabase.from("tasks").update({ status }).eq("id", id);
  }

  async function toggleDone(task) {
    const status = task.status === "done" ? "todo" : "done";
    setTasks((t) => t.map((x) => (x.id === task.id ? { ...x, status } : x)));
    await supabase.from("tasks").update({ status }).eq("id", task.id);
  }

  async function deleteTask(id) {
    setTasks((t) => t.filter((x) => x.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  }

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto w-full">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-smoke">Tareas</h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface2 rounded-lg p-1 gap-1">
            {["eisenhower", "kanban"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm rounded-md capitalize transition ${
                  view === v ? "bg-accent text-base font-medium" : "text-dimgray hover:text-silver"
                }`}
              >
                {v === "eisenhower" ? "Matriz" : "Kanban"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm btn-primary px-3 py-1.5"
          >
            <Plus size={15} /> Añadir
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
        <form
          onSubmit={addTask}
          className="mb-6 bg-surface border border-onyx rounded-xl p-4 flex flex-col sm:flex-row gap-3"
        >
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="¿Qué necesitas hacer?"
            className="flex-1 bg-surface2 border border-onyx rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50"
          />
          <select
            value={newQuadrant}
            onChange={(e) => setNewQuadrant(e.target.value)}
            className="bg-surface2 border border-onyx rounded-lg px-3 py-2 text-sm outline-none"
          >
            {quadrants.map((q) => (
              <option key={q.key} value={q.key} className="bg-base">
                {q.title}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary text-sm px-4">
            Guardar
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="text-dimgray">
            <X size={18} />
          </button>
        </form>
      )}

      {view === "eisenhower" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quadrants.map((q) => (
            <div key={q.key} className={`bg-surface border ${q.accent} rounded-3xl p-4 min-h-[160px]`}>
              <h3 className="text-xs uppercase tracking-wide text-dimgray mb-3">{q.title}</h3>
              <ul className="flex flex-col gap-2">
                {tasks
                  .filter((t) => t.priority === q.key)
                  .map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-2 bg-surface px-3 py-2 rounded-lg text-sm group"
                    >
                      <span
                        onClick={() => toggleDone(t)}
                        className={`w-3.5 h-3.5 border rounded shrink-0 cursor-pointer ${
                          t.status === "done" ? "bg-accent border-accent" : "border-dimgray"
                        }`}
                      />
                      <span
                        onClick={() => toggleDone(t)}
                        className={`flex-1 cursor-pointer ${t.status === "done" ? "line-through text-dimgray" : "text-silver"}`}
                      >
                        {t.title}
                      </span>
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-onyx hover:text-danger transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {columns.map((col) => (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => draggedId && moveTask(draggedId, col.key)}
              className="bg-surface border border-onyx rounded-3xl p-4 min-h-[240px]"
            >
              <h3 className="text-xs uppercase tracking-wide text-dimgray mb-3">{col.title}</h3>
              <ul className="flex flex-col gap-2">
                {tasks
                  .filter((t) => t.status === col.key)
                  .map((t) => (
                    <li
                      key={t.id}
                      draggable
                      onDragStart={() => setDraggedId(t.id)}
                      className={`flex items-center gap-2 bg-surface2 px-3 py-2.5 rounded-lg text-sm cursor-grab active:cursor-grabbing group ${
                        col.key === "done" ? "text-dimgray line-through" : "text-silver"
                      }`}
                    >
                      <GripVertical size={14} className="text-onyx shrink-0" />
                      <span className="flex-1">{t.title}</span>
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-onyx hover:text-danger transition shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
