-- =====================================================================
-- 05_patch_assign_terms.sql
-- Jalankan di Supabase SQL Editor (aman dijalankan ulang).
-- Perubahan: term TIDAK lagi dibuat otomatis. Trainer yang meng-assign.
--   - assign_terms(): satu aksi = satu level, boleh banyak term sekaligus
--   - unassign_term(): hanya untuk term yang belum punya progres
-- Tidak berubah: alur status per term, observasi, Layak Mengajar, RLS.
-- Catatan: RLS yang ada sudah menolak trainee mencentang lesson di term
-- yang tidak punya baris trainee_terms, jadi term yang tidak di-assign
-- otomatis tertutup di level database.
-- =====================================================================

-- 1. Hapus pembuatan 12 term otomatis
drop trigger if exists trg_open_all_terms on users;
drop function if exists public.open_all_terms();

-- 2. Assign term (hanya trainer aktif)
create or replace function public.assign_terms(
  p_trainee_id uuid,
  p_term_ids int[]
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_expected int;
  v_found    int;
  v_levels   int;
  v_added    int;
begin
  if not is_my_trainee(p_trainee_id) then
    raise exception 'Tidak diizinkan';
  end if;
  if not exists (select 1 from users where id = p_trainee_id and is_active) then
    raise exception 'Akun trainee nonaktif';
  end if;
  if p_term_ids is null or cardinality(p_term_ids) = 0 then
    raise exception 'Pilih minimal satu term';
  end if;

  select count(distinct x) into v_expected from unnest(p_term_ids) as x;
  select count(*), count(distinct level) into v_found, v_levels
  from terms where id = any(p_term_ids);

  if v_found <> v_expected then
    raise exception 'Term tidak valid';
  end if;
  if v_levels <> 1 then
    raise exception 'Satu kali assign hanya untuk satu level';
  end if;

  with ins as (
    insert into trainee_terms (trainee_id, term_id)
    select distinct p_trainee_id, x from unnest(p_term_ids) as x
    on conflict (trainee_id, term_id) do nothing
    returning id
  ), hist as (
    insert into status_history (trainee_term_id, from_status, to_status, changed_by, note)
    select id, null, 'in_self_training', auth.uid(), 'Term di-assign trainer' from ins
    returning 1
  )
  select count(*) into v_added from ins;

  return v_added;   -- jumlah term yang benar-benar baru ditambahkan
end $$;

-- 3. Cabut assign: hanya jika belum ada progres sama sekali
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
                  and l.term_id = v_tt.term_id and tl.studied)
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

revoke all on function public.assign_terms(uuid, int[]) from public;
revoke all on function public.unassign_term(int) from public;
grant execute on function public.assign_terms(uuid, int[]) to authenticated;
grant execute on function public.unassign_term(int) to authenticated;
