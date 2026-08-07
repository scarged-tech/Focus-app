import { supabaseAdmin } from "./supabaseAdmin";
import {
  listUpcomingEvents,
  createCalendarEvent,
  updateCalendarEvent,
} from "./googleCalendar";

// Sincroniza el calendario de UN usuario. La usan tanto el botón
// manual (/api/google/sync) como el cron automático (/api/google/cron-sync),
// para no duplicar la lógica.
export async function syncUserCalendar(userId, tokenRow) {
  const tokens = {
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expiry_date,
  };

  // 1) Tareas locales con fecha/hora → Google
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .not("due_date", "is", null)
    .not("due_time", "is", null);

  // Trae de una sola vez los calendar_events ya creados para estas tareas,
  // en vez de una consulta por tarea dentro del loop (antes eran 2N+
  // round trips a Supabase para N tareas).
  const taskIds = (tasks || []).map((t) => t.id);
  const { data: existingRows } = taskIds.length
    ? await supabaseAdmin.from("calendar_events").select("*").in("task_id", taskIds)
    : { data: [] };
  const existingByTaskId = new Map((existingRows || []).map((e) => [e.task_id, e]));

  const toInsert = [];
  const toUpdate = [];

  for (const task of tasks || []) {
    const existing = existingByTaskId.get(task.id);
    const start = `${task.due_date}T${task.due_time}`;
    const end = new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();

    if (!existing) {
      const gEvent = await createCalendarEvent(tokens, tokenRow.calendar_id, { title: task.title, start, end });
      toInsert.push({
        user_id: userId,
        google_event_id: gEvent.id,
        task_id: task.id,
        title: task.title,
        start_time: start,
        end_time: end,
        source: "local",
      });
    } else if (existing.title !== task.title) {
      await updateCalendarEvent(tokens, tokenRow.calendar_id, existing.google_event_id, { title: task.title, start, end });
      toUpdate.push({ id: existing.id, title: task.title });
    }
  }

  if (toInsert.length) await supabaseAdmin.from("calendar_events").insert(toInsert);
  await Promise.all(
    toUpdate.map(({ id, title }) => supabaseAdmin.from("calendar_events").update({ title }).eq("id", id))
  );

  // 2) Eventos de Google → cache local (upsert en lote en vez de uno por evento)
  const googleEvents = await listUpcomingEvents(tokens, tokenRow.calendar_id);
  const eventRows = googleEvents
    .filter((ev) => ev.start?.dateTime)
    .map((ev) => ({
      user_id: userId,
      google_event_id: ev.id,
      title: ev.summary || "(Sin título)",
      start_time: ev.start.dateTime,
      end_time: ev.end.dateTime,
      source: "google",
      updated_at: new Date().toISOString(),
    }));

  if (eventRows.length) {
    await supabaseAdmin.from("calendar_events").upsert(eventRows, { onConflict: "user_id,google_event_id" });
  }

  return (tasks || []).length + googleEvents.length;
}

export { supabaseAdmin };
