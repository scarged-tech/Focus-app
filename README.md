# Focus — App de productividad personal

App completa (Next.js 14 + Supabase) con: Tareas (Eisenhower/Kanban), Hábitos,
Finanzas, Metas, Entrenamiento, Estudios (Pomodoro) y Notas rápidas.
Incluye autenticación real y, opcionalmente, un bot de WhatsApp.

Todo el código ya está escrito y listo. Lo único que **no puedo hacer por ti**
es crear cuentas externas (Supabase, Vercel, Twilio) porque requieren tu
identidad/tarjeta/verificación — eso lo defino paso a paso abajo.

---

## ✅ Lo que ya está automatizado (no tienes que tocar código)

- Todas las páginas y componentes (Dashboard, Tareas, Planner, Hábitos, Finanzas, Metas, Entreno, Estudios, Ajustes)
- Crear, editar y **borrar** en todos los módulos con datos (tareas, metas, hábitos)
- El esquema completo de base de datos con seguridad por usuario (RLS)
- Autenticación completa: registro, login, **recuperar contraseña**, sesión persistente
- Vinculación de tu número de WhatsApp desde **Ajustes** (sin tocar SQL)
- El webhook de WhatsApp (backend) listo para recibir mensajes
- Sincronización bidireccional con Google Calendar — manual (botón) y **automática (cron diario)**
- Configuración PWA para instalar la app en la pantalla de inicio de iOS/Android (íconos, manifest, service worker)
- Estilos, iconos y toda la lógica de negocio (checkboxes, drag & drop, temporizador Pomodoro real, heatmap de hábitos, cálculos de balance, etc.)

## 🔧 Lo que tienes que hacer tú, manualmente (paso a paso)

### Paso 1 — Crear el proyecto en Supabase (5 min)

1. Ve a **https://supabase.com** y crea una cuenta gratuita (con GitHub o correo).
2. Clic en **"New project"**.
3. Elige un nombre (ej. `focus-app`), una contraseña para la base de datos (guárdala) y la región más cercana a ti.
4. Espera ~2 minutos a que se aprovisione el proyecto.

### Paso 2 — Cargar el esquema de base de datos (2 min)

1. En el panel de Supabase, ve a **SQL Editor** (menú lateral izquierdo).
2. Clic en **"New query"**.
3. Abre el archivo `supabase/schema.sql` de este proyecto, copia **todo** el contenido y pégalo ahí.
4. Clic en **Run**. Deberías ver "Success. No rows returned".
   - Esto crea todas las tablas (`tasks`, `habits`, `accounts`, `goals`, etc.) y las reglas de seguridad para que cada usuario solo vea sus propios datos.

### Paso 3 — Obtener tus claves de API (2 min)

1. En Supabase, ve a **Project Settings → API**.
2. Copia:
   - **Project URL** → la usarás como `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (sección "Project API keys", clic en "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`
   ⚠️ La `service_role key` nunca debe ir al frontend ni subirse a un repositorio público. Solo se usa en el servidor.

### Paso 4 — Configurar el proyecto localmente (5 min)

1. Instala [Node.js 18+](https://nodejs.org) si no lo tienes.
2. Descomprime este proyecto y abre una terminal dentro de la carpeta.
3. Copia el archivo de ejemplo de variables de entorno:
   ```bash
   cp .env.example .env.local
   ```
4. Abre `.env.local` y pega las claves que obtuviste en el Paso 3.
5. Instala las dependencias:
   ```bash
   npm install
   ```
6. Levanta el servidor local:
   ```bash
   npm run dev
   ```
7. Abre **http://localhost:3000** en tu navegador. Deberías ver la pantalla de login.
8. Crea tu cuenta con tu correo (regístrate desde la propia pantalla de login) y confirma el correo que te llega de Supabase.
9. ¡Ya puedes usar la app! Prueba crear una tarea, un hábito y una cuenta en Finanzas.

### Paso 5 — Publicarla en internet con Vercel (10 min)

1. Sube este proyecto a un repositorio de GitHub (crea uno nuevo en github.com y sigue las instrucciones de "push an existing repository").
2. Ve a **https://vercel.com** y crea una cuenta (puedes entrar con tu cuenta de GitHub).
3. Clic en **"Add New… → Project"** y selecciona tu repositorio.
4. En la sección **Environment Variables**, agrega las mismas variables que pusiste en `.env.local` (Vercel te deja pegarlas todas de golpe con el botón "Add from .env").
5. Clic en **Deploy**. En ~2 minutos tendrás una URL pública tipo `focus-app.vercel.app`.

En este punto ya tienes una app real, funcional, con tu propia base de datos y accesible desde cualquier dispositivo.

---

## 📅 Opcional: Activar la sincronización con Google Calendar

### Paso 6 — Crear credenciales OAuth en Google Cloud Console (10 min)

1. Ve a **https://console.cloud.google.com** e inicia sesión con tu cuenta de Google.
2. Arriba a la izquierda, clic en el selector de proyectos → **"New Project"**. Nómbralo `focus-app` y créalo.
3. Con el proyecto seleccionado, ve a **APIs & Services → Library**, busca **"Google Calendar API"** y clic en **Enable**.
4. Ve a **APIs & Services → OAuth consent screen**:
   - Tipo de usuario: **External**.
   - Completa nombre de la app, tu correo de soporte y de contacto.
   - En "Scopes" no necesitas agregar nada manualmente.
   - En "Test users" (mientras la app no esté verificada por Google), agrega tu propio correo — así podrás usarla aunque diga "app no verificada".
5. Ve a **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Tipo de aplicación: **Web application**.
   - En **Authorized redirect URIs**, agrega:
     - `http://localhost:3000/api/google/callback` (para desarrollo local)
     - `https://TU-DOMINIO-DE-VERCEL.vercel.app/api/google/callback` (para producción, agrégalo cuando ya tengas el dominio del Paso 5)
6. Clic en **Create**. Copia el **Client ID** y el **Client Secret**.

### Paso 7 — Agregar las variables de entorno

Agrega esto a `.env.local` (y a Vercel, con la URL de producción correspondiente):

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=... (el Client ID del paso anterior)
GOOGLE_CLIENT_SECRET=... (el Client Secret)
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

### Paso 8 — Conectar tu calendario desde la app

1. Abre la app, ve a la sección **Planner**.
2. Clic en **"Conectar Google Calendar"** → acepta el consentimiento de Google.
3. Ya conectado, verás el botón cambiar a **"Sincronizar"**. Cada vez que lo presiones:
   - Las tareas con fecha y hora se crean como eventos en tu Google Calendar real.
   - Los eventos que ya tengas en Google Calendar aparecen en el Planner (bloques azules).
4. La sincronización también corre **sola, una vez al día**, gracias al cron configurado en `vercel.json` (no tienes que hacer nada para esto una vez desplegado en Vercel).
   - En el plan gratuito (Hobby) de Vercel, los cron jobs solo pueden correr 1 vez al día. Si quieres que sincronice más seguido (ej. cada 15 min), tienes dos opciones: pasar a Vercel Pro, o usar un servicio externo gratuito como **cron-job.org** apuntando a `https://TU-DOMINIO.vercel.app/api/google/cron-sync` con el header `Authorization: Bearer TU_CRON_SECRET` cada 15 minutos.
5. Genera tu `CRON_SECRET`: cualquier cadena aleatoria larga sirve. Puedes crearla corriendo `openssl rand -hex 32` en tu terminal, o simplemente inventar una contraseña larga. Agrégala a `.env.local` y a Vercel.

---

## 📲 Instalar la app en tu iPhone / Android (PWA)

Esta app ya está configurada como **PWA (Progressive Web App)**, la forma más rápida de tener un ícono real en la pantalla de inicio sin pasar por ninguna tienda de apps:

**En iPhone:**
1. Abre la URL de tu app (la de Vercel) en **Safari** — tiene que ser Safari, no Chrome.
2. Toca el botón de **Compartir** (el cuadrado con la flecha hacia arriba).
3. Baja y toca **"Agregar a pantalla de inicio"**.
4. Confirma. Aparecerá un ícono como cualquier app, y al abrirlo corre a pantalla completa, sin la barra de Safari.

**En Android:**
1. Abre la URL en **Chrome**.
2. Toca el menú (⋮) → **"Agregar a pantalla de inicio"** o **"Instalar app"** (Chrome suele sugerirlo solo con un banner).

Esto ya es 100% funcional para uso diario, con ícono propio, pantalla completa y funcionamiento offline básico (gracias al service worker incluido).

---

## 📱 Opcional: Activar el bot de WhatsApp

Esto requiere una cuenta de Twilio (de pago, aunque tiene sandbox gratis para pruebas) y una API key de OpenAI (de pago por uso).

### Paso 9 — Crear cuenta en Twilio y activar el sandbox de WhatsApp

1. Ve a **https://www.twilio.com/try-twilio** y crea una cuenta.
2. En el panel, ve a **Messaging → Try it out → Send a WhatsApp message**.
3. Sigue las instrucciones para unirte al sandbox (envías un código desde tu WhatsApp al número que te dan).
4. Copia tu **Account SID** y **Auth Token** desde el dashboard principal de Twilio.
5. Agrega esos valores a tus variables de entorno (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`) tanto en `.env.local` como en Vercel.
   - El número de sandbox suele ser `whatsapp:+14155238886` → ese va en `TWILIO_WHATSAPP_FROM`.

### Paso 10 — Conectar el webhook

1. En Twilio, ve a **Messaging → Settings → WhatsApp sandbox settings**.
2. En el campo **"When a message comes in"**, pega:
   ```
   https://TU-DOMINIO-DE-VERCEL.vercel.app/api/whatsapp/webhook
   ```
3. Método: `HTTP POST`. Guarda los cambios.

### Paso 11 — Obtener tu API key de OpenAI

1. Ve a **https://platform.openai.com/api-keys** y crea una key.
2. Agrégala como `OPENAI_API_KEY` en `.env.local` y en Vercel.
3. Añade saldo mínimo en **Billing** (unos $5 USD alcanzan para meses de uso normal).

### Paso 12 — Vincular tu número de WhatsApp a tu cuenta

Ya no necesitas tocar SQL para esto: entra a la app → **Ajustes** → escribe tu
número con código de país (ej. `+5215512345678`) → **Guardar cambios**.

Después de esto, puedes escribirle a tu bot de WhatsApp cosas como:
- `Comprar leche mañana 9am` → crea una tarea
- `Uber 150 pesos` → registra un gasto
- `Agenda` → te manda el resumen del día


---

## 🗂️ Estructura del proyecto

```
focus-app/
├── app/
│   ├── (app)/              ← páginas con sidebar + nav móvil (protegidas)
│   │   ├── page.js         ← Dashboard
│   │   ├── tasks/          ← Eisenhower + Kanban (con borrado)
│   │   ├── planner/        ← Vista semanal con Google Calendar
│   │   ├── habits/         ← Crear/borrar hábitos + heatmap de rachas
│   │   ├── finance/        ← Cuentas y movimientos
│   │   ├── goals/          ← Metas con progreso (con borrado)
│   │   ├── training/       ← Rutinas y series
│   │   ├── studies/        ← Materias + Pomodoro
│   │   └── settings/       ← Perfil, moneda, número de WhatsApp
│   ├── login/               ← Acceso + registro + recuperar contraseña
│   ├── reset-password/      ← Establecer nueva contraseña
│   ├── auth/callback/       ← Confirmación de correo
│   └── api/
│       ├── whatsapp/webhook/← Bot de WhatsApp (backend)
│       └── google/
│           ├── auth/        ← Inicia el OAuth de Google
│           ├── callback/    ← Recibe el token de Google
│           ├── sync/        ← Sincronización manual (botón)
│           └── cron-sync/   ← Sincronización automática (Vercel Cron)
├── components/
│   ├── Sidebar.jsx           ← Nav de escritorio + Nav inferior móvil
│   └── ServiceWorkerRegister.jsx
├── lib/                     ← Clientes de Supabase, Google Calendar y lógica de sync compartida
├── public/                  ← Íconos, manifest.json y service worker (PWA)
├── middleware.js            ← Protege rutas y refresca sesión
├── vercel.json               ← Configuración del cron de sincronización
└── supabase/schema.sql      ← Base de datos completa con RLS
```

## 🧩 Posibles siguientes pasos

- Exportar reportes financieros en PDF
- Notificaciones push (recordatorios) vía Web Push
- Vista de calendario mensual (además de la semanal actual)
- Módulo de notas enlazadas tipo wiki (grafo de conexiones)

Si quieres que continúe con alguno de estos, dímelo y seguimos.
