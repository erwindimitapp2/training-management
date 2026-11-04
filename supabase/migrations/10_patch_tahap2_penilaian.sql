-- =====================================================================
-- 10_patch_tahap2_penilaian.sql   (jalankan SETELAH 09)
-- Aman dijalankan ulang. Tidak menghapus data apa pun.
--
-- Tahap 2 (TRAINER SAJA, trainee tidak punya policy sama sekali):
--   A. progress_update_evaluations : penilaian update progress ke orang tua
--                                    (pertemuan 8-9 tiap term), 4 kriteria bintang
--   B. final_project_evaluations   : penilaian video final project,
--                                    Sesuai standar / Belum sesuai + catatan
--
-- Keduanya terikat ke trainee_terms (term yang di-assign), jadi hanya term
-- yang di-assign ke trainee yang bisa dinilai. Boleh banyak penilaian per
-- term (riwayat / penilaian ulang). Tidak mengubah status apa pun.
--
-- Catatan: karena ada FK ke trainee_terms, membersihkan data trainee
-- (seperti 06_cleanup) harus menghapus tabel ini lebih dulu.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Fungsi trigger bersama (kedua tabel memakai nama kolom yang sama)
-- ---------------------------------------------------------------------
create or replace function public.eval_before_write()
returns trigger language plpgsql as $$
begin
  new.notes      := nullif(btrim(new.notes), '');
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.trainee_term_id := old.trainee_term_id;   -- tidak boleh dipindah
    new.evaluated_by    := old.evaluated_by;
    new.created_at      := old.created_at;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- A. PENILAIAN UPDATE PROGRESS KE ORANG TUA (per term)
-- ---------------------------------------------------------------------
create table if not exists progress_update_evaluations (
  id serial primary key,
  trainee_term_id int not null references trainee_terms(id),
  evaluation_date date not null default current_date,
  meeting_number int check (meeting_number in (8, 9)),        -- pertemuan 8 atau 9 (opsional)
  score_accuracy   int not null check (score_accuracy   between 1 and 5),  -- Akurasi isi perkembangan anak
  score_clarity    int not null check (score_clarity    between 1 and 5),  -- Kejelasan bahasa untuk orang tua
  score_timeliness int not null check (score_timeliness between 1 and 5),  -- Ketepatan waktu
  score_followup   int not null check (score_followup   between 1 and 5),  -- Saran tindak lanjut
  notes text check (notes is null or char_length(notes) <= 2000),
  evaluated_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pue_term_idx on progress_update_evaluations (trainee_term_id, evaluation_date desc);

drop trigger if exists trg_pue_before_write on progress_update_evaluations;
create trigger trg_pue_before_write
before insert or update on progress_update_evaluations
for each row execute function public.eval_before_write();

-- ---------------------------------------------------------------------
-- B. PENILAIAN FINAL PROJECT VIDEO (per term, tanpa link)
-- ---------------------------------------------------------------------
create table if not exists final_project_evaluations (
  id serial primary key,
  trainee_term_id int not null references trainee_terms(id),
  evaluation_date date not null default current_date,
  result text not null check (result in ('meets_standard', 'not_yet')),  -- Sesuai standar / Belum sesuai
  notes text check (notes is null or char_length(notes) <= 2000),
  evaluated_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fpe_notes_when_not_yet check (result = 'meets_standard' or notes is not null)
);
create index if not exists fpe_term_idx on final_project_evaluations (trainee_term_id, evaluation_date desc);

drop trigger if exists trg_fpe_before_write on final_project_evaluations;
create trigger trg_fpe_before_write
before insert or update on final_project_evaluations
for each row execute function public.eval_before_write();

-- ---------------------------------------------------------------------
-- RLS: trainer saja. Trainee tidak punya policy, jadi tertutup penuh.
-- ---------------------------------------------------------------------
alter table progress_update_evaluations enable row level security;
alter table final_project_evaluations   enable row level security;

drop policy if exists "pue_read"   on progress_update_evaluations;
drop policy if exists "pue_insert" on progress_update_evaluations;
drop policy if exists "pue_update" on progress_update_evaluations;
drop policy if exists "pue_delete" on progress_update_evaluations;

create policy "pue_read" on progress_update_evaluations for select to authenticated
  using (exists (select 1 from trainee_terms tt
                 where tt.id = progress_update_evaluations.trainee_term_id
                   and is_my_trainee(tt.trainee_id)));
create policy "pue_insert" on progress_update_evaluations for insert to authenticated
  with check (evaluated_by = auth.uid()
              and exists (select 1 from trainee_terms tt
                          where tt.id = progress_update_evaluations.trainee_term_id
                            and is_my_trainee(tt.trainee_id)));
create policy "pue_update" on progress_update_evaluations for update to authenticated
  using (exists (select 1 from trainee_terms tt
                 where tt.id = progress_update_evaluations.trainee_term_id
                   and is_my_trainee(tt.trainee_id)))
  with check (exists (select 1 from trainee_terms tt
                      where tt.id = progress_update_evaluations.trainee_term_id
                        and is_my_trainee(tt.trainee_id)));
create policy "pue_delete" on progress_update_evaluations for delete to authenticated
  using (exists (select 1 from trainee_terms tt
                 where tt.id = progress_update_evaluations.trainee_term_id
                   and is_my_trainee(tt.trainee_id)));

drop policy if exists "fpe_read"   on final_project_evaluations;
drop policy if exists "fpe_insert" on final_project_evaluations;
drop policy if exists "fpe_update" on final_project_evaluations;
drop policy if exists "fpe_delete" on final_project_evaluations;

create policy "fpe_read" on final_project_evaluations for select to authenticated
  using (exists (select 1 from trainee_terms tt
                 where tt.id = final_project_evaluations.trainee_term_id
                   and is_my_trainee(tt.trainee_id)));
create policy "fpe_insert" on final_project_evaluations for insert to authenticated
  with check (evaluated_by = auth.uid()
              and exists (select 1 from trainee_terms tt
                          where tt.id = final_project_evaluations.trainee_term_id
                            and is_my_trainee(tt.trainee_id)));
create policy "fpe_update" on final_project_evaluations for update to authenticated
  using (exists (select 1 from trainee_terms tt
                 where tt.id = final_project_evaluations.trainee_term_id
                   and is_my_trainee(tt.trainee_id)))
  with check (exists (select 1 from trainee_terms tt
                      where tt.id = final_project_evaluations.trainee_term_id
                        and is_my_trainee(tt.trainee_id)));
create policy "fpe_delete" on final_project_evaluations for delete to authenticated
  using (exists (select 1 from trainee_terms tt
                 where tt.id = final_project_evaluations.trainee_term_id
                   and is_my_trainee(tt.trainee_id)));

-- ---------------------------------------------------------------------
-- Cabut assign: penilaian ini dihitung sebagai progres
-- (isi fungsi sama seperti 07, ditambah dua pengecekan)
-- ---------------------------------------------------------------------
create or replace function public.unassign_term(p_trainee_term_id int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tt trainee_terms%rowtype;
begin
  select * into v_tt from trainee_terms where id = p_trainee_term_id for update;
  if not found then
    raise exception 'Data term tidak ditemukan';
  end if;
  if not is_my_trainee(v_tt.trainee_id) then
    raise exception 'Tidak diizinkan';
  end if;

  if v_tt.cleared_to_teach
     or v_tt.status <> 'in_self_training'
     or exists (select 1 from status_history
                where trainee_term_id = v_tt.id and from_status is not null)
     or exists (select 1 from trainee_lessons tl
                join lessons l on l.id = tl.lesson_id
                where tl.trainee_id = v_tt.trainee_id
                  and l.term_id = v_tt.term_id
                  and (tl.studied or tl.evidence_url is not null))
     or exists (select 1 from progress_update_evaluations where trainee_term_id = v_tt.id)
     or exists (select 1 from final_project_evaluations   where trainee_term_id = v_tt.id)
  then
    raise exception 'Term ini sudah punya progres dan tetap terbuka untuk trainee';
  end if;

  delete from trainee_lessons tl
  using lessons l
  where l.id = tl.lesson_id
    and tl.trainee_id = v_tt.trainee_id
    and l.term_id = v_tt.term_id;
  delete from status_history where trainee_term_id = v_tt.id;
  delete from trainee_terms where id = v_tt.id;
end $$;

revoke all on function public.unassign_term(int) from public;
grant execute on function public.unassign_term(int) to authenticated;

-- ---------------------------------------------------------------------
-- Cek keamanan: trainee TIDAK boleh punya policy di dua tabel ini.
-- select tablename, policyname, cmd from pg_policies
-- where tablename in ('progress_update_evaluations','final_project_evaluations')
-- order by tablename, policyname;
-- ---------------------------------------------------------------------
