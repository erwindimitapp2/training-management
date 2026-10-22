-- =====================================================================
-- 02_seed_and_rls.sql
-- Jalankan SETELAH tabel dibuat (branches, users, terms, lessons,
-- trainee_lessons, trainee_terms, status_history, observation_sessions).
-- Aman dijalankan ulang (idempotent) untuk bagian seed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- BAGIAN A: SEED DATA MASTER
-- ---------------------------------------------------------------------

-- A1. Cabang
insert into branches (name) values ('Kelapa Gading'), ('Bekasi')
on conflict (name) do nothing;

-- A2. Term: 6 per level x 2 level = 12 baris
insert into terms (level, name, sort_order)
select lv.level, t.name, t.sort_order
from (values ('kinder'), ('junior')) as lv(level)
cross join (values
  ('Foundation 1', 1),
  ('Foundation 2', 2),
  ('Term 1',       3),
  ('Term 2',       4),
  ('Term 3',       5),
  ('Term 4',       6)
) as t(name, sort_order)
on conflict (level, sort_order) do nothing;

-- A3. Lesson: 12 term x 10 lesson = 120 baris
insert into lessons (term_id, lesson_number, title)
select t.id, n, 'Lesson ' || n
from terms t
cross join generate_series(1, 10) as n
on conflict (term_id, lesson_number) do nothing;

-- Cek hasil (harus 2, 12, 120):
-- select (select count(*) from branches), (select count(*) from terms), (select count(*) from lessons);


-- ---------------------------------------------------------------------
-- BAGIAN B: FUNGSI BANTU (dipakai oleh RLS)
-- security definer agar tidak terjadi rekursi saat membaca tabel users
-- ---------------------------------------------------------------------

create or replace function public.auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid()
$$;

create or replace function public.auth_branch()
returns int language sql stable security definer set search_path = public as $$
  select branch_id from users where id = auth.uid()
$$;

-- true jika trainer yang login satu cabang dengan trainee tertentu
create or replace function public.is_my_trainee(p_trainee_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth_role() = 'trainer'
     and exists (
       select 1 from users u
       where u.id = p_trainee_id
         and u.role = 'trainee'
         and u.branch_id is not distinct from auth_branch()
     )
$$;


-- ---------------------------------------------------------------------
-- BAGIAN C: ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table branches             enable row level security;
alter table users                enable row level security;
alter table terms                enable row level security;
alter table lessons              enable row level security;
alter table trainee_lessons      enable row level security;
alter table trainee_terms        enable row level security;
alter table status_history       enable row level security;
alter table observation_sessions enable row level security;

-- Data master: semua pengguna yang login boleh membaca
create policy "master_read_branches" on branches for select to authenticated using (true);
create policy "master_read_terms"    on terms    for select to authenticated using (true);
create policy "master_read_lessons"  on lessons  for select to authenticated using (true);

-- users: baca diri sendiri; trainer membaca trainee di cabangnya.
-- Tidak ada policy insert/update: akun dibuat/diubah lewat dashboard Supabase
-- atau service role, sehingga tidak ada yang bisa menaikkan role sendiri.
create policy "users_read_self" on users for select to authenticated
  using (id = auth.uid());
create policy "users_read_my_trainees" on users for select to authenticated
  using (is_my_trainee(id));

-- trainee_lessons: trainee mengelola ceklis miliknya,
-- hanya saat term-nya sedang in_self_training.
create policy "tl_read_own" on trainee_lessons for select to authenticated
  using (trainee_id = auth.uid());
create policy "tl_read_trainer" on trainee_lessons for select to authenticated
  using (is_my_trainee(trainee_id));

create policy "tl_insert_own" on trainee_lessons for insert to authenticated
  with check (
    trainee_id = auth.uid()
    and exists (
      select 1 from trainee_terms tt
      join lessons l on l.term_id = tt.term_id
      where l.id = trainee_lessons.lesson_id
        and tt.trainee_id = auth.uid()
        and tt.status = 'in_self_training'
    )
  );

create policy "tl_update_own" on trainee_lessons for update to authenticated
  using (trainee_id = auth.uid())
  with check (
    trainee_id = auth.uid()
    and exists (
      select 1 from trainee_terms tt
      join lessons l on l.term_id = tt.term_id
      where l.id = trainee_lessons.lesson_id
        and tt.trainee_id = auth.uid()
        and tt.status = 'in_self_training'
    )
  );

-- trainee_terms, status_history, observation_sessions: hanya BACA lewat RLS.
-- Semua perubahan lewat fungsi di Bagian D (tombol), jadi aturan alur
-- tidak bisa dilanggar dari browser.
create policy "tt_read_own" on trainee_terms for select to authenticated
  using (trainee_id = auth.uid());
create policy "tt_read_trainer" on trainee_terms for select to authenticated
  using (is_my_trainee(trainee_id));

create policy "sh_read_own" on status_history for select to authenticated
  using (exists (select 1 from trainee_terms tt
                 where tt.id = status_history.trainee_term_id
                   and tt.trainee_id = auth.uid()));
create policy "sh_read_trainer" on status_history for select to authenticated
  using (exists (select 1 from trainee_terms tt
                 where tt.id = status_history.trainee_term_id
                   and is_my_trainee(tt.trainee_id)));

create policy "obs_read_own" on observation_sessions for select to authenticated
  using (trainee_id = auth.uid());
create policy "obs_read_trainer" on observation_sessions for select to authenticated
  using (is_my_trainee(trainee_id));


-- ---------------------------------------------------------------------
-- BAGIAN D: FUNGSI UNTUK TIAP TOMBOL
-- ---------------------------------------------------------------------

-- D1. Perubahan status term.
-- p_action: 'ready_for_check' (trainee) | 'start_check' | 'need_review'
--           | 'ready_for_trial' (trainer)
create or replace function public.change_term_status(
  p_trainee_term_id int,
  p_action text,
  p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tt    trainee_terms%rowtype;
  v_role  text := auth_role();
  v_count int;
  v_new   text;
begin
  select * into v_tt from trainee_terms where id = p_trainee_term_id for update;
  if not found then
    raise exception 'Data term tidak ditemukan';
  end if;

  if p_action = 'ready_for_check' then
    if v_role <> 'trainee' or v_tt.trainee_id <> auth.uid() then
      raise exception 'Tidak diizinkan';
    end if;
    if v_tt.status <> 'in_self_training' then
      raise exception 'Status saat ini bukan In Self-Training';
    end if;
    select count(*) into v_count
    from trainee_lessons tl
    join lessons l on l.id = tl.lesson_id
    where tl.trainee_id = v_tt.trainee_id
      and l.term_id = v_tt.term_id
      and tl.studied;
    if v_count < 10 then
      raise exception 'Baru % dari 10 lesson tercentang', v_count;
    end if;
    v_new := 'ready_for_check';

  else
    if not is_my_trainee(v_tt.trainee_id) then
      raise exception 'Tidak diizinkan';
    end if;

    if p_action = 'start_check' then
      if v_tt.status <> 'ready_for_check' then
        raise exception 'Status harus Ready for Check';
      end if;
      v_new := 'understanding_check';

    elsif p_action = 'need_review' then
      if v_tt.status <> 'understanding_check' then
        raise exception 'Status harus Understanding Check';
      end if;
      -- Langsung kembali ke In Self-Training; alasannya tersimpan di status_history
      v_new := 'in_self_training';

    elsif p_action = 'ready_for_trial' then
      if v_tt.status <> 'understanding_check' then
        raise exception 'Status harus Understanding Check';
      end if;
      v_new := 'ready_for_trial';

    else
      raise exception 'Aksi tidak dikenal: %', p_action;
    end if;
  end if;

  update trainee_terms
     set status       = v_new,
         completed_at = case when v_new = 'ready_for_trial' then now() else completed_at end,
         updated_at   = now()
   where id = v_tt.id;

  insert into status_history (trainee_term_id, from_status, to_status, changed_by, note)
  values (v_tt.id,
          v_tt.status,
          case when p_action = 'need_review' then 'need_review' else v_new end,
          auth.uid(),
          p_note);
end $$;

-- D2. Input observasi (trainee menjadi main teacher), hanya trainer
create or replace function public.record_observation(
  p_trainee_id uuid,
  p_term_id int,
  p_session_date date,
  p_preparation int,
  p_delivery int,
  p_mastery int,
  p_visual int,
  p_engagement int,
  p_result text,
  p_notes text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_my_trainee(p_trainee_id) then
    raise exception 'Tidak diizinkan';
  end if;
  if p_result not in ('pass', 'retry') then
    raise exception 'Result harus pass atau retry';
  end if;
  if not exists (select 1 from trainee_terms
                 where trainee_id = p_trainee_id and term_id = p_term_id
                   and status = 'ready_for_trial') then
    raise exception 'Term belum berstatus Ready for Trial Class';
  end if;

  insert into observation_sessions
    (trainee_id, trainer_id, term_id, session_date,
     score_preparation, score_delivery, score_mastery, score_visual, score_engagement,
     result, notes)
  values
    (p_trainee_id, auth.uid(), p_term_id, p_session_date,
     p_preparation, p_delivery, p_mastery, p_visual, p_engagement,
     p_result, p_notes);

  if p_result = 'pass' then
    update trainee_terms
       set cleared_to_teach = true, updated_at = now()
     where trainee_id = p_trainee_id and term_id = p_term_id;
  end if;
end $$;

-- Hanya pengguna login yang boleh memanggil fungsi tombol
revoke all on function public.change_term_status(int, text, text) from public;
revoke all on function public.record_observation(uuid, int, date, int, int, int, int, int, text, text) from public;
grant execute on function public.change_term_status(int, text, text) to authenticated;
grant execute on function public.record_observation(uuid, int, date, int, int, int, int, int, text, text) to authenticated;


-- ---------------------------------------------------------------------
-- BAGIAN E: TRIGGER OTOMATIS (pembukaan term)
-- ---------------------------------------------------------------------

-- E1. Saat akun trainee dibuat, otomatis buka Term pertama sesuai level-nya
create or replace function public.open_first_term()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'trainee' and new.level is not null then
    insert into trainee_terms (trainee_id, term_id)
    select new.id, t.id
    from terms t
    where t.level = new.level and t.sort_order = 1
    on conflict (trainee_id, term_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists trg_open_first_term on users;
create trigger trg_open_first_term
after insert on users
for each row execute function public.open_first_term();

-- E2. Saat term menjadi ready_for_trial, otomatis buka term berikutnya
create or replace function public.open_next_term()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'ready_for_trial' and old.status is distinct from 'ready_for_trial' then
    insert into trainee_terms (trainee_id, term_id)
    select new.trainee_id, nxt.id
    from terms cur
    join terms nxt on nxt.level = cur.level and nxt.sort_order = cur.sort_order + 1
    where cur.id = new.term_id
    on conflict (trainee_id, term_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists trg_open_next_term on trainee_terms;
create trigger trg_open_next_term
after update on trainee_terms
for each row execute function public.open_next_term();
