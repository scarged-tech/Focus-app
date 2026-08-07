-- =====================================================
-- Esquema completo para app de productividad All-in-One
-- Motor: PostgreSQL (Supabase)
-- Incluye: usuarios, tareas, hábitos, finanzas, metas,
-- entrenamiento, estudios y notas. Con Row Level Security.
-- =====================================================

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ---------- Usuarios (Supabase Auth ya crea auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text unique, -- número de WhatsApp en formato +52...
  timezone text default 'America/Mexico_City',
  currency text default 'MXN',
  created_at timestamptz default now()
);

-- Crea el perfil automáticamente cuando alguien se registra (Auth -> profiles)
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- Tareas (Eisenhower + Kanban + recurrencia) ----------
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  notes text,
  due_date date,
  due_time time,
  priority text check (priority in ('urgent-important','not-urgent-important','urgent-not-important','not-urgent-not-important')),
  status text check (status in ('todo','doing','done')) default 'todo',
  recurrence_rule text, -- ej. 'FREQ=DAILY'
  project_id uuid,
  created_at timestamptz default now()
);

-- ---------- Hábitos ----------
create table public.habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  icon text,
  schedule text default 'daily', -- daily / weekly / custom
  created_at timestamptz default now()
);

create table public.habit_logs (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid references public.habits(id) on delete cascade,
  log_date date not null,
  completed boolean default false,
  unique(habit_id, log_date)
);

-- ---------- Finanzas ----------
create table public.accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  currency text default 'MXN',
  balance numeric(14,2) default 0
);

create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid references public.accounts(id) on delete cascade,
  amount numeric(14,2) not null, -- negativo = gasto, positivo = ingreso
  category text,
  description text,
  tx_date date default current_date,
  recurring_rule text
);

create table public.bills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null,
  paid_amount numeric(14,2) default 0,
  due_date date,
  closes_on date
);

create table public.installments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  item_name text,
  total_installments int,
  paid_installments int default 0,
  amount_per_installment numeric(14,2)
);

create table public.budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  category text not null,
  monthly_limit numeric(14,2) not null,
  month date default date_trunc('month', current_date)
);

-- ---------- Metas ----------
create table public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  type text check (type in ('numeric','checklist')) default 'numeric',
  target_value numeric(14,2),
  current_value numeric(14,2) default 0,
  deadline date
);

-- ---------- Entrenamiento ----------
create table public.workouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  workout_type text check (workout_type in ('strength','cardio','other'))
);

create table public.exercise_logs (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid references public.workouts(id) on delete cascade,
  exercise_name text not null,
  sets jsonb, -- [{reps:10, weight_kg:70}, ...]
  log_date date default current_date
);

-- ---------- Estudios ----------
create table public.subjects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  topics_count int default 0
);

create table public.study_sessions (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid references public.subjects(id) on delete cascade,
  duration_minutes int not null,
  session_date date default current_date
);

-- ---------- Notas (con enlaces tipo wiki) ----------
create table public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text,
  content text,
  linked_entities jsonb default '[]', -- [{type:'goal', id:'...'}]
  created_at timestamptz default now()
);

-- ---------- Integración Google Calendar ----------
create table public.google_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expiry_date bigint,
  calendar_id text default 'primary',
  updated_at timestamptz default now()
);

-- Eventos espejo: cache local de lo que existe en Google Calendar,
-- para pintarlos en el Planner sin llamar a la API en cada render.
create table public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  google_event_id text,          -- null si el evento nació como tarea local
  task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  source text check (source in ('google','local')) default 'local',
  updated_at timestamptz default now(),
  unique(user_id, google_event_id)
);

-- =====================================================
-- Row Level Security: cada usuario solo ve sus datos
-- =====================================================
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.bills enable row level security;
alter table public.goals enable row level security;
alter table public.workouts enable row level security;
alter table public.subjects enable row level security;
alter table public.notes enable row level security;

-- Patrón repetido por tabla con user_id directo:
create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own habits" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own accounts" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own workouts" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own subjects" on public.subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Para tablas hijas (sin user_id directo), se valida vía join:
create policy "own habit_logs" on public.habit_logs
  for all using (
    exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid())
  );

create policy "own transactions" on public.transactions
  for all using (
    exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
  );

create policy "own bills" on public.bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.google_tokens enable row level security;
create policy "own google_tokens" on public.google_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.calendar_events enable row level security;
create policy "own calendar_events" on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
