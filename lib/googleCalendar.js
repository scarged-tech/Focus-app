import { google } from "googleapis";

// Cliente OAuth2 reutilizable. El redirect URI debe coincidir EXACTO
// con el que registres en Google Cloud Console (ver README, paso Google).
export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(state) {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline", // necesario para recibir refresh_token
    prompt: "consent",      // fuerza a que siempre regrese refresh_token
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state,
  });
}

export async function exchangeCodeForTokens(code) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens; // { access_token, refresh_token, expiry_date, ... }
}

function getCalendarClient(tokens) {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function listUpcomingEvents(tokens, calendarId = "primary") {
  const calendar = getCalendarClient(tokens);
  const res = await calendar.events.list({
    calendarId,
    timeMin: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(),
    timeMax: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });
  return res.data.items || [];
}

export async function createCalendarEvent(tokens, calendarId, { title, start, end }) {
  const calendar = getCalendarClient(tokens);
  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: title,
      start: { dateTime: start },
      end: { dateTime: end },
    },
  });
  return res.data;
}

export async function updateCalendarEvent(tokens, calendarId, googleEventId, { title, start, end }) {
  const calendar = getCalendarClient(tokens);
  const res = await calendar.events.patch({
    calendarId,
    eventId: googleEventId,
    requestBody: {
      summary: title,
      start: { dateTime: start },
      end: { dateTime: end },
    },
  });
  return res.data;
}
