-- =====================================================================
-- 07_patch_evidence_link.sql
-- Jalankan di Supabase SQL Editor (aman dijalankan ulang).
-- Perubahan:
--   1. Kolom evidence_url (satu link bukti per lesson) di trainee_lessons
--   2. Validasi: kosong = hapus link, hanya http/https, maks 500 karakter
--   3. unassign_term(): link dihitung sebagai progres
-- Tidak berubah: syarat Ready for Check (tetap 10 lesson tercentang),
-- alur status, observasi, dan policy RLS.
-- Catatan: policy trainee_lessons yang ada sudah mengunci insert/update
-- saat term bukan in_self_training, jadi link otomatis terkunci setelah
-- Ready for Check dan terbuka lagi setelah Need Review.
-- =====================================================================

-- 1. Kolom link bukti (opsional, independen dari kolom studied)
alter table trainee_lessons add column if not exists evidence_url text;

-- 2. Rapikan input: spasi di pinggir dibuang, string kosong menjadi NULL
create or replace function public.normalize_evidence_url()
returns trigger language plpgsql as $$
begin
  new.evidence_url := nullif(btrim(new.evidence_url), '');
  return new;
end $$;

drop trigger if exists trg_normalize_evidence_url on trainee_lessons;
create trigger trg_normalize_evidence_url
before insert or update on trainee_lessons
for each row execute function public.normalize_evidence_url();

-- 3. Validasi bentuk link
alter table trainee_lessons drop constraint if exists evidence_url_valid;
alter table trainee_lessons add constraint evidence_url_valid
  check (
    evidence_url is null
    or (char_length(evidence_url) <= 500
        and evidence_url ~* '^https?://[^[:space:]]+$')
  );

-- 4. Cabut assign: link ikut dihitung sebagai progres
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

-- Cek (harus 0 baris): link yang tidak valid
-- select id, evidence_url from trainee_lessons
-- where evidence_url is not null and evidence_url !~* '^https?://[^[:space:]]+$';
