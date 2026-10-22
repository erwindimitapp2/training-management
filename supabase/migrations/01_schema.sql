-- =====================================================================
-- 01_schema.sql  (jalankan PERTAMA, di Supabase SQL Editor)
-- Skema final: sudah termasuk username & is_active,
-- status di level term, dan observasi per sesi mengajar.
-- Jangan pakai tabel lama trainee_progress / observation_evaluations.
-- =====================================================================

create table branches (
  id serial primary key,
  name text not null unique                 -- 'Kelapa Gading', 'Bekasi'
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text not null unique,            -- huruf kecil
  email text not null unique,               -- email internal: username@trainee.internal
  role text not null check (role in ('trainer','trainee')),
  branch_id int references branches(id),
  level text check (level in ('kinder','junior')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  check (role <> 'trainee' or level is not null)   -- trainee wajib punya level
);

create table terms (
  id serial primary key,
  level text not null check (level in ('kinder','junior')),
  name text not null,                       -- 'Foundation 1','Foundation 2','Term 1'..'Term 4'
  sort_order int not null,                  -- 1..6, dipakai untuk urutan & penguncian
  unique (level, sort_order)
);

create table lessons (
  id serial primary key,
  term_id int not null references terms(id),
  lesson_number int not null check (lesson_number between 1 and 10),
  title text,
  unique (term_id, lesson_number)
);

-- Ceklis lesson (diisi trainee)
create table trainee_lessons (
  id serial primary key,
  trainee_id uuid not null references users(id),
  lesson_id int not null references lessons(id),
  studied boolean not null default false,
  studied_at timestamptz,
  unique (trainee_id, lesson_id)
);

-- Status per term (alur utama)
create table trainee_terms (
  id serial primary key,
  trainee_id uuid not null references users(id),
  term_id int not null references terms(id),
  status text not null default 'in_self_training'
    check (status in ('in_self_training','ready_for_check',
                      'understanding_check','need_review',
                      'ready_for_trial')),
  cleared_to_teach boolean not null default false,  -- observasi lulus
  completed_at timestamptz,                         -- saat ready_for_trial
  updated_at timestamptz default now(),
  unique (trainee_id, term_id)
);

create table status_history (
  id serial primary key,
  trainee_term_id int not null references trainee_terms(id),
  from_status text,
  to_status text not null,
  changed_by uuid not null references users(id),
  note text,
  changed_at timestamptz default now()
);

-- Sesi observasi: trainee menjadi main teacher, dinilai trainer
create table observation_sessions (
  id serial primary key,
  trainee_id uuid not null references users(id),
  trainer_id uuid not null references users(id),
  term_id int not null references terms(id),
  session_date date not null,
  score_preparation int check (score_preparation between 1 and 5),
  score_delivery int check (score_delivery between 1 and 5),
  score_mastery int check (score_mastery between 1 and 5),
  score_visual int check (score_visual between 1 and 5),
  score_engagement int check (score_engagement between 1 and 5),
  result text check (result in ('pass','retry')),
  notes text
);

create index on trainee_lessons (trainee_id);
create index on trainee_terms (trainee_id);
create index on observation_sessions (trainee_id, term_id);
