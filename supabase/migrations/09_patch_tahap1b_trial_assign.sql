-- =====================================================================
-- 09_patch_tahap1b_trial_assign.sql   (jalankan SETELAH 08)
-- Aman dijalankan ulang.
--
-- Tahap 1b:
--   1. Trial class sekarang ditugaskan trainer, dilaporkan trainee,
--      lalu dinilai trainer.
--   2. Penilaian (bintang, placement menurut trainer, catatan trainer)
--      pindah ke tabel terpisah yang TIDAK bisa dibaca trainee.
--   3. Pesan error observasi memakai istilah baru "Self-Training Done".
--      (Nilai di database tetap 'ready_for_trial'; hanya label tampilan
--      yang diganti di aplikasi.)
--
-- !!! PERHATIAN: langkah 1 MENGHAPUS SEMUA baris trial_classes yang ada
-- (sudah dikonfirmasi semuanya data uji). Hanya berjalan sekali, yaitu
-- saat kolom lama (score_conduct) masih ada. Tabel lain tidak disentuh.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Restrukturisasi trial_classes
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'trial_classes'
               and column_name = 'score_conduct') then
    delete from trial_classes;                       -- data uji
    alter table trial_classes drop column score_conduct,
                              drop column score_placement,
                              drop column score_parent_update;
    alter table trial_classes rename column notes to trainee_notes;
  end if;
end $$;

alter table trial_classes add column if not exists status text not null default 'assigned';
alter table trial_classes add column if not exists submitted_at timestamptz;

alter table trial_classes drop constraint if exists trial_status_valid;
alter table trial_classes add constraint trial_status_valid
  check (status in ('assigned', 'awaiting_evaluation', 'evaluated'));
-- assigned            = Ditugaskan (menunggu laporan trainee)
-- awaiting_evaluation = Menunggu penilaian
-- evaluated           = Dinilai

create index if not exists trial_classes_status_idx on trial_classes (status);

-- Fungsi bantu: placement sah untuk level tertentu
create or replace function public.placement_valid(p_level text, p_placement text)
returns boolean language sql immutable as $$
  select case
    when p_placement is null then true
    when p_level in ('kinder','junior') then
      p_placement in ('Foundation 1','Foundation 2','Term 1','Term 2','Term 3','Term 4')
    when p_level = 'coder' then
      p_placement in ('Basic','Intermediate','Advance')
    else false
  end
$$;

-- ---------------------------------------------------------------------
-- 2. Penilaian trainer (TRAINER SAJA)
-- ---------------------------------------------------------------------
create table if not exists trial_class_evaluations (
  id serial primary key,
  trial_class_id int not null unique references trial_classes(id) on delete cascade,
  score_conduct       int not null check (score_conduct       between 1 and 5),
  score_placement     int not null check (score_placement     between 1 and 5),
  score_parent_update int not null check (score_parent_update between 1 and 5),
  trainer_placement text,                           -- "Placement menurut trainer" (opsional)
  trainer_notes text check (trainer_notes is null or char_length(trainer_notes) <= 2000),
  evaluated_by uuid not null references users(id),
  evaluated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.trial_eval_before_write()
returns trigger language plpgsql as $$
declare
  v_level text;
begin
  new.trainer_notes     := nullif(btrim(new.trainer_notes), '');
  new.trainer_placement := nullif(btrim(new.trainer_placement), '');
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.trial_class_id := old.trial_class_id;
    new.evaluated_by   := old.evaluated_by;
    new.evaluated_at   := old.evaluated_at;
  end if;
  if new.trainer_placement is not null then
    select level into v_level from trial_classes where id = new.trial_class_id;
    if not placement_valid(v_level, new.trainer_placement) then
      raise exception 'Placement tidak sesuai dengan level trial class';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_trial_eval_before_write on trial_class_evaluations;
create trigger trg_trial_eval_before_write
before insert or update on trial_class_evaluations
for each row execute function public.trial_eval_before_write();

-- Status trial_classes mengikuti ada/tidaknya penilaian
create or replace function public.trial_eval_sync_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update trial_classes set status = 'evaluated' where id = new.trial_class_id;
    return new;
  else
    update trial_classes
       set status = case when submitted_at is not null
                         then 'awaiting_evaluation' else 'assigned' end
     where id = old.trial_class_id and status = 'evaluated';
    return old;
  end if;
end $$;

drop trigger if exists trg_trial_eval_sync_status on trial_class_evaluations;
create trigger trg_trial_eval_sync_status
after insert or delete on trial_class_evaluations
for each row execute function public.trial_eval_sync_status();

-- Penjaga di trial_classes: status 'evaluated' hanya jika penilaian ada
create or replace function public.trial_classes_before_write()
returns trigger language plpgsql as $$
begin
  new.student_name  := nullif(btrim(new.student_name), '');
  new.trainee_notes := nullif(btrim(new.trainee_notes), '');
  new.updated_at    := now();
  if tg_op = 'INSERT' then
    if new.status = 'evaluated' then
      raise exception 'Status Dinilai hanya bisa berasal dari penilaian trainer';
    end if;
  else
    if new.status = 'evaluated'
       and not exists (select 1 from trial_class_evaluations
                       where trial_class_id = new.id) then
      raise exception 'Status Dinilai hanya bisa berasal dari penilaian trainer';
    end if;
    new.trainee_id := old.trainee_id;      -- tidak boleh dipindah
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists trg_trial_classes_before_write on trial_classes;
create trigger trg_trial_classes_before_write
before insert or update on trial_classes
for each row execute function public.trial_classes_before_write();

-- ---------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------
alter table trial_class_evaluations enable row level security;

-- trial_classes: trainer baca/ubah/hapus; trainee BACA miliknya saja.
-- Pembuatan oleh trainer dan pengisian oleh trainee lewat fungsi di bawah.
drop policy if exists "tc_insert_trainer" on trial_classes;
drop policy if exists "tc_read_own"       on trial_classes;
create policy "tc_read_own" on trial_classes for select to authenticated
  using (trainee_id = auth.uid());

-- Penilaian: trainer saja. Trainee tidak punya policy apa pun.
drop policy if exists "tce_read_trainer"   on trial_class_evaluations;
drop policy if exists "tce_insert_trainer" on trial_class_evaluations;
drop policy if exists "tce_update_trainer" on trial_class_evaluations;
drop policy if exists "tce_delete_trainer" on trial_class_evaluations;

create policy "tce_read_trainer" on trial_class_evaluations for select to authenticated
  using (exists (select 1 from trial_classes tc
                 where tc.id = trial_class_evaluations.trial_class_id
                   and is_my_trainee(tc.trainee_id)));
create policy "tce_insert_trainer" on trial_class_evaluations for insert to authenticated
  with check (evaluated_by = auth.uid()
              and exists (select 1 from trial_classes tc
                          where tc.id = trial_class_evaluations.trial_class_id
                            and is_my_trainee(tc.trainee_id)));
create policy "tce_update_trainer" on trial_class_evaluations for update to authenticated
  using (exists (select 1 from trial_classes tc
                 where tc.id = trial_class_evaluations.trial_class_id
                   and is_my_trainee(tc.trainee_id)))
  with check (exists (select 1 from trial_classes tc
                      where tc.id = trial_class_evaluations.trial_class_id
                        and is_my_trainee(tc.trainee_id)));
create policy "tce_delete_trainer" on trial_class_evaluations for delete to authenticated
  using (exists (select 1 from trial_classes tc
                 where tc.id = trial_class_evaluations.trial_class_id
                   and is_my_trainee(tc.trainee_id)));

-- ---------------------------------------------------------------------
-- 4. Fungsi
-- ---------------------------------------------------------------------

-- 4a. Trainer menugaskan trial class (boleh langsung mengisi laporan sendiri)
create or replace function public.assign_trial_class(
  p_trainee_id uuid,
  p_trial_date date,
  p_level text,
  p_student_name text default null,
  p_placement text default null,
  p_trainee_notes text default null
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_id     int;
  v_name   text := nullif(btrim(p_student_name), '');
  v_place  text := nullif(btrim(p_placement), '');
  v_notes  text := nullif(btrim(p_trainee_notes), '');
  v_filled boolean;
begin
  if not is_my_trainee(p_trainee_id) then
    raise exception 'Tidak diizinkan';
  end if;
  if not exists (select 1 from users where id = p_trainee_id and is_active) then
    raise exception 'Akun trainee nonaktif';
  end if;
  if p_trial_date is null then
    raise exception 'Tanggal trial class wajib diisi';
  end if;
  if p_level not in ('kinder','junior','coder') then
    raise exception 'Level tidak valid';
  end if;
  if not placement_valid(p_level, v_place) then
    raise exception 'Placement tidak sesuai dengan level';
  end if;

  v_filled := (v_name is not null or v_place is not null or v_notes is not null);

  insert into trial_classes
    (trainee_id, trial_date, level, student_name, placement, trainee_notes,
     status, submitted_at, created_by)
  values
    (p_trainee_id, p_trial_date, p_level, v_name, v_place, v_notes,
     case when v_filled then 'awaiting_evaluation' else 'assigned' end,
     case when v_filled then now() end,
     auth.uid())
  returning id into v_id;

  return v_id;
end $$;

-- 4b. Trainee mengirim / mengedit laporan (sampai trainer menilai)
create or replace function public.submit_trial_report(
  p_trial_class_id int,
  p_student_name text,
  p_placement text,
  p_notes text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tc    trial_classes%rowtype;
  v_name  text := nullif(btrim(p_student_name), '');
  v_place text := nullif(btrim(p_placement), '');
begin
  select * into v_tc from trial_classes where id = p_trial_class_id for update;
  if not found then
    raise exception 'Trial class tidak ditemukan';
  end if;
  if auth_role() <> 'trainee' or v_tc.trainee_id <> auth.uid() then
    raise exception 'Tidak diizinkan';
  end if;
  if v_tc.status = 'evaluated' then
    raise exception 'Trial class sudah dinilai dan tidak bisa diubah lagi';
  end if;
  if v_name is null then
    raise exception 'Nama calon murid wajib diisi';
  end if;
  if v_place is null then
    raise exception 'Placement wajib dipilih';
  end if;
  if not placement_valid(v_tc.level, v_place) then
    raise exception 'Placement tidak sesuai dengan level';
  end if;

  update trial_classes
     set student_name  = v_name,
         placement     = v_place,
         trainee_notes = nullif(btrim(p_notes), ''),
         status        = 'awaiting_evaluation',
         submitted_at  = coalesce(submitted_at, now())
   where id = v_tc.id;
end $$;

-- 4c. Trainer menilai (simpan baru atau perbarui penilaian)
create or replace function public.evaluate_trial_class(
  p_trial_class_id int,
  p_conduct int,
  p_placement_score int,
  p_parent_update int,
  p_trainer_placement text default null,
  p_trainer_notes text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tc trial_classes%rowtype;
begin
  select * into v_tc from trial_classes where id = p_trial_class_id for update;
  if not found then
    raise exception 'Trial class tidak ditemukan';
  end if;
  if not is_my_trainee(v_tc.trainee_id) then
    raise exception 'Tidak diizinkan';
  end if;
  if p_conduct not between 1 and 5
     or p_placement_score not between 1 and 5
     or p_parent_update not between 1 and 5 then
    raise exception 'Bintang harus bernilai 1 sampai 5';
  end if;

  insert into trial_class_evaluations
    (trial_class_id, score_conduct, score_placement, score_parent_update,
     trainer_placement, trainer_notes, evaluated_by)
  values
    (v_tc.id, p_conduct, p_placement_score, p_parent_update,
     p_trainer_placement, p_trainer_notes, auth.uid())
  on conflict (trial_class_id) do update
    set score_conduct       = excluded.score_conduct,
        score_placement     = excluded.score_placement,
        score_parent_update = excluded.score_parent_update,
        trainer_placement   = excluded.trainer_placement,
        trainer_notes       = excluded.trainer_notes;
end $$;

revoke all on function public.assign_trial_class(uuid, date, text, text, text, text) from public;
revoke all on function public.submit_trial_report(int, text, text, text) from public;
revoke all on function public.evaluate_trial_class(int, int, int, int, text, text) from public;
grant execute on function public.assign_trial_class(uuid, date, text, text, text, text) to authenticated;
grant execute on function public.submit_trial_report(int, text, text, text) to authenticated;
grant execute on function public.evaluate_trial_class(int, int, int, int, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Istilah baru di pesan error observasi (isi fungsi sama seperti sebelumnya)
-- ---------------------------------------------------------------------
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
    raise exception 'Term belum berstatus Self-Training Done';
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

revoke all on function public.record_observation(uuid, int, date, int, int, int, int, int, text, text) from public;
grant execute on function public.record_observation(uuid, int, date, int, int, int, int, int, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Cek keamanan (trainee TIDAK boleh punya policy di trial_class_evaluations;
-- di trial_classes hanya tc_read_own yang menyangkut trainee):
-- select tablename, policyname, cmd from pg_policies
-- where tablename in ('trial_classes','trial_class_evaluations')
-- order by tablename, policyname;
-- ---------------------------------------------------------------------
