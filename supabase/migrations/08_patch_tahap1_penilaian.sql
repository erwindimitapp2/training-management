-- =====================================================================
-- 08_patch_tahap1_penilaian.sql   (jalankan SETELAH 07)
-- Aman dijalankan ulang. Tidak menghapus data apa pun.
--
-- Tahap 1:
--   A. check_notes           : catatan rahasia Understanding Check (TRAINER SAJA)
--   B. trial_classes         : penilaian Trial Class (TRAINER SAJA)
--   C. trial_readiness       : kelayakan Trial Class per level
--                              (status dilihat trainer + trainee, riwayat trainer saja)
--
-- Prinsip akses: trainee TIDAK punya policy sama sekali di tabel A, B,
-- dan riwayat C, jadi data itu tertutup di level database, bukan hanya
-- disembunyikan di tampilan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Fungsi bantu umum
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- A. CATATAN RAHASIA UNDERSTANDING CHECK
-- ---------------------------------------------------------------------
create table if not exists check_notes (
  id serial primary key,
  trainee_term_id int not null references trainee_terms(id) on delete cascade,
  note text not null
    check (char_length(btrim(note)) between 1 and 2000),
  outcome text check (outcome in ('need_review','ready_for_trial')),  -- NULL = catatan tambahan manual
  written_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists check_notes_tt_idx on check_notes (trainee_term_id, created_at desc);

-- Kunci kolom yang tidak boleh berubah saat edit
create or replace function public.check_notes_freeze()
returns trigger language plpgsql as $$
begin
  new.trainee_term_id := old.trainee_term_id;
  new.written_by      := old.written_by;
  new.created_at      := old.created_at;
  new.updated_at      := now();
  return new;
end $$;

drop trigger if exists trg_check_notes_freeze on check_notes;
create trigger trg_check_notes_freeze
before update on check_notes
for each row execute function public.check_notes_freeze();

alter table check_notes enable row level security;

drop policy if exists "cn_read_trainer"   on check_notes;
drop policy if exists "cn_insert_trainer" on check_notes;
drop policy if exists "cn_update_trainer" on check_notes;
drop policy if exists "cn_delete_own"     on check_notes;

create policy "cn_read_trainer" on check_notes for select to authenticated
  using (exists (select 1 from trainee_terms tt
                 where tt.id = check_notes.trainee_term_id
                   and is_my_trainee(tt.trainee_id)));

create policy "cn_insert_trainer" on check_notes for insert to authenticated
  with check (written_by = auth.uid()
              and exists (select 1 from trainee_terms tt
                          where tt.id = check_notes.trainee_term_id
                            and is_my_trainee(tt.trainee_id)));

create policy "cn_update_trainer" on check_notes for update to authenticated
  using (exists (select 1 from trainee_terms tt
                 where tt.id = check_notes.trainee_term_id
                   and is_my_trainee(tt.trainee_id)))
  with check (exists (select 1 from trainee_terms tt
                      where tt.id = check_notes.trainee_term_id
                        and is_my_trainee(tt.trainee_id)));

create policy "cn_delete_own" on check_notes for delete to authenticated
  using (written_by = auth.uid()
         and exists (select 1 from trainee_terms tt
                     where tt.id = check_notes.trainee_term_id
                       and is_my_trainee(tt.trainee_id)));

-- change_term_status: tambah parameter catatan rahasia (opsional)
-- Pemanggilan lama dengan 3 argumen tetap berfungsi.
drop function if exists public.change_term_status(int, text, text);

create or replace function public.change_term_status(
  p_trainee_term_id int,
  p_action text,
  p_note text default null,            -- catatan untuk trainee (terlihat trainee)
  p_private_note text default null     -- catatan rahasia trainer
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tt      trainee_terms%rowtype;
  v_role    text := auth_role();
  v_count   int;
  v_new     text;
  v_private text := nullif(btrim(p_private_note), '');
begin
  select * into v_tt from trainee_terms where id = p_trainee_term_id for update;
  if not found then
    raise exception 'Data term tidak ditemukan';
  end if;

  if v_private is not null and p_action not in ('need_review', 'ready_for_trial') then
    raise exception 'Catatan rahasia hanya untuk hasil Understanding Check';
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

  if v_private is not null then
    insert into check_notes (trainee_term_id, note, outcome, written_by)
    values (v_tt.id, v_private, p_action, auth.uid());
  end if;
end $$;

revoke all on function public.change_term_status(int, text, text, text) from public;
grant execute on function public.change_term_status(int, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- B. TRIAL CLASS (calon murid sungguhan)  -- TRAINER SAJA
-- ---------------------------------------------------------------------
create table if not exists trial_classes (
  id serial primary key,
  trainee_id uuid not null references users(id),
  trial_date date not null,
  student_name text check (student_name is null or char_length(student_name) <= 100),
  level text not null check (level in ('kinder','junior','coder')),
  placement text,
  score_conduct   int not null check (score_conduct   between 1 and 5),
  score_placement int not null check (score_placement between 1 and 5),
  score_parent_update int not null check (score_parent_update between 1 and 5),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trial_placement_valid check (
    placement is null
    or (level in ('kinder','junior')
        and placement in ('Foundation 1','Foundation 2','Term 1','Term 2','Term 3','Term 4'))
    or (level = 'coder'
        and placement in ('Basic','Intermediate','Advance'))
  )
);
create index if not exists trial_classes_trainee_idx on trial_classes (trainee_id, trial_date desc);
create index if not exists trial_classes_date_idx    on trial_classes (trial_date desc);

create or replace function public.trial_classes_before_write()
returns trigger language plpgsql as $$
begin
  new.student_name := nullif(btrim(new.student_name), '');
  new.notes        := nullif(btrim(new.notes), '');
  new.updated_at   := now();
  if tg_op = 'UPDATE' then
    new.trainee_id := old.trainee_id;      -- tidak boleh dipindah ke trainee lain
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists trg_trial_classes_before_write on trial_classes;
create trigger trg_trial_classes_before_write
before insert or update on trial_classes
for each row execute function public.trial_classes_before_write();

alter table trial_classes enable row level security;

drop policy if exists "tc_read_trainer"   on trial_classes;
drop policy if exists "tc_insert_trainer" on trial_classes;
drop policy if exists "tc_update_trainer" on trial_classes;
drop policy if exists "tc_delete_trainer" on trial_classes;

create policy "tc_read_trainer" on trial_classes for select to authenticated
  using (is_my_trainee(trainee_id));
create policy "tc_insert_trainer" on trial_classes for insert to authenticated
  with check (is_my_trainee(trainee_id) and created_by = auth.uid());
create policy "tc_update_trainer" on trial_classes for update to authenticated
  using (is_my_trainee(trainee_id))
  with check (is_my_trainee(trainee_id));
create policy "tc_delete_trainer" on trial_classes for delete to authenticated
  using (is_my_trainee(trainee_id));

-- ---------------------------------------------------------------------
-- C. KELAYAKAN TRIAL CLASS per level (Kinder / Junior / Coder)
-- ---------------------------------------------------------------------
create table if not exists trial_readiness (
  id serial primary key,
  trainee_id uuid not null references users(id),
  level text not null check (level in ('kinder','junior','coder')),
  is_ready boolean not null default false,
  changed_by uuid references users(id),
  changed_at timestamptz not null default now(),
  unique (trainee_id, level)
);

create table if not exists trial_readiness_history (
  id serial primary key,
  trainee_id uuid not null references users(id),
  level text not null check (level in ('kinder','junior','coder')),
  is_ready boolean not null,
  changed_by uuid not null references users(id),
  changed_at timestamptz not null default now()
);
create index if not exists trial_readiness_hist_idx on trial_readiness_history (trainee_id, changed_at desc);
create index if not exists trial_readiness_ready_idx on trial_readiness (is_ready, level);

alter table trial_readiness enable row level security;
alter table trial_readiness_history enable row level security;

drop policy if exists "tr_read_own"     on trial_readiness;
drop policy if exists "tr_read_trainer" on trial_readiness;
drop policy if exists "trh_read_trainer" on trial_readiness_history;

-- Status: trainee melihat miliknya, trainer melihat semua
create policy "tr_read_own" on trial_readiness for select to authenticated
  using (trainee_id = auth.uid());
create policy "tr_read_trainer" on trial_readiness for select to authenticated
  using (is_my_trainee(trainee_id));
-- Riwayat: trainer saja. Tidak ada policy tulis: semua perubahan lewat fungsi di bawah.
create policy "trh_read_trainer" on trial_readiness_history for select to authenticated
  using (is_my_trainee(trainee_id));

-- Tombol Layak / Belum layak (hanya trainer aktif)
create or replace function public.set_trial_readiness(
  p_trainee_id uuid,
  p_level text,
  p_ready boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cur boolean;
  v_found boolean;
begin
  if not is_my_trainee(p_trainee_id) then
    raise exception 'Tidak diizinkan';
  end if;
  if p_level not in ('kinder','junior','coder') then
    raise exception 'Level tidak valid';
  end if;
  if p_ready is null then
    raise exception 'Status tidak valid';
  end if;

  select is_ready into v_cur
  from trial_readiness
  where trainee_id = p_trainee_id and level = p_level
  for update;
  v_found := found;

  if v_found and v_cur = p_ready then
    return;                          -- tidak ada perubahan
  end if;
  if not v_found and not p_ready then
    return;                          -- belum pernah ditandai, tetap "belum layak"
  end if;

  insert into trial_readiness (trainee_id, level, is_ready, changed_by, changed_at)
  values (p_trainee_id, p_level, p_ready, auth.uid(), now())
  on conflict (trainee_id, level) do update
    set is_ready   = excluded.is_ready,
        changed_by = excluded.changed_by,
        changed_at = excluded.changed_at;

  insert into trial_readiness_history (trainee_id, level, is_ready, changed_by)
  values (p_trainee_id, p_level, p_ready, auth.uid());
end $$;

revoke all on function public.set_trial_readiness(uuid, text, boolean) from public;
grant execute on function public.set_trial_readiness(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Cek keamanan (jalankan sebagai referensi, hasil harus ada policy HANYA
-- untuk peran yang dimaksud; trainee tidak boleh punya policy di
-- check_notes, trial_classes, trial_readiness_history):
-- select tablename, policyname, cmd from pg_policies
-- where tablename in ('check_notes','trial_classes','trial_readiness','trial_readiness_history')
-- order by tablename, policyname;
-- ---------------------------------------------------------------------
