import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import OpenAI from "openai";
import twilio from "twilio";

/**
 * POST /api/whatsapp/webhook
 * -------------------------------------------------------
 * Recibe mensajes de WhatsApp (vía Twilio) y los convierte
 * en tareas o gastos usando un LLM como parser de intención.
 * Requiere las variables de entorno descritas en README.md.
 */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(request) {
  const formData = await request.formData();
  const From = formData.get("From");
  const Body = formData.get("Body") || "";
  const NumMedia = formData.get("NumMedia") || "0";
  const MediaUrl0 = formData.get("MediaUrl0");

  const phoneNumber = From?.replace("whatsapp:", "");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("phone", phoneNumber)
    .single();

  if (!profile) {
    await sendReply(From, "No encontramos tu cuenta. Vincula tu número desde tu perfil en la app primero.");
    return NextResponse.json({ ok: true });
  }

  let text = Body;
  if (Number(NumMedia) > 0 && MediaUrl0) {
    text = await transcribeAudio(MediaUrl0);
  }

  if (/^agenda$/i.test(text.trim())) {
    const summary = await buildDailyAgenda(profile.id);
    await sendReply(From, summary);
    return NextResponse.json({ ok: true });
  }

  const intent = await parseIntent(text);

  if (intent.type === "task") {
    await supabaseAdmin.from("tasks").insert({
      user_id: profile.id,
      title: intent.title,
      due_date: intent.due_date,
      status: "todo",
    });
    await sendReply(From, `✅ Creada\n"${intent.title}" · ${formatDate(intent.due_date)}`);
  } else if (intent.type === "expense") {
    const { data: account } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .eq("user_id", profile.id)
      .limit(1)
      .single();

    if (account) {
      await supabaseAdmin.from("transactions").insert({
        account_id: account.id,
        amount: -Math.abs(intent.amount),
        category: intent.category || "Sin categoría",
        description: intent.title,
      });
      await sendReply(From, `✅ Gasto registrado\n📝 ${intent.title}\n🏷️ ${intent.category}\n💵 $${intent.amount}`);
    } else {
      await sendReply(From, "Primero crea una cuenta en el módulo Finanzas de la app.");
    }
  } else {
    await sendReply(From, "No entendí bien 🤔. Prueba: 'Comprar leche mañana 9am' o 'Uber 150 pesos'.");
  }

  return NextResponse.json({ ok: true });
}

async function parseIntent(message) {
  // Si el LLM falla o devuelve algo no parseable, caemos a "unknown" en vez
  // de lanzar un error sin manejar: eso volvería un 500 al webhook y Twilio
  // reintentaría la entrega, arriesgando tareas/gastos duplicados.
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un parser de intenciones para una app de productividad.
Devuelve SOLO un JSON con esta forma exacta, sin texto adicional:
{"type":"task"|"expense"|"agenda_query"|"unknown","title":string|null,"due_date":string|null,"amount":number|null,"category":string|null}
Fecha de referencia: ${new Date().toISOString()}`,
        },
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
    });
    return JSON.parse(completion.choices[0].message.content);
  } catch (err) {
    console.error("parseIntent failed:", err);
    return { type: "unknown", title: null, due_date: null, amount: null, category: null };
  }
}

async function transcribeAudio(mediaUrl) {
  const res = await fetch(mediaUrl, {
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
    },
  });
  const audioBuffer = Buffer.from(await res.arrayBuffer());
  const transcription = await openai.audio.transcriptions.create({
    file: new File([audioBuffer], "audio.ogg", { type: "audio/ogg" }),
    model: "whisper-1",
    language: "es",
  });
  return transcription.text;
}

async function buildDailyAgenda(userId) {
  const today = new Date().toISOString().split("T")[0];
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("title, status")
    .eq("user_id", userId)
    .eq("due_date", today);
  const taskLines = (tasks || []).map((t) => `${t.status === "done" ? "✅" : "◻️"} ${t.title}`).join("\n");
  return `📅 Hoy\n\n${taskLines || "Sin tareas para hoy"}`;
}

function formatDate(iso) {
  if (!iso) return "sin fecha";
  return new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

async function sendReply(to, body) {
  await twilioClient.messages.create({ from: process.env.TWILIO_WHATSAPP_FROM, to, body });
}
