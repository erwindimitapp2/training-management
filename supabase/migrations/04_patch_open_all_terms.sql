-- =====================================================================
-- 04_patch_open_all_terms.sql
-- Jalankan di Supabase SQL Editor (aman dijalankan ulang).
-- Perubahan:
--   1. Semua trainee otomatis punya 12 term (Kinder + Junior) sejak dibuat.
--   2. Tidak ada lagi pembukaan term berurutan.
--   3. Level pada akun trainee tidak lagi wajib.
-- Tidak berubah: alur status per term, ready_for_trial, observasi,
-- cleared_to_teach, RLS, dan fungsi tombol.
-- =====================================================================

-- 1. Level di akun trainee tidak wajib lagi
do $$
declare c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.users'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%level IS NOT NULL%';
  if c is not null then
    execute format('alter table public.users drop constraint %I', c);
  end if;
end $$;

-- 2. Trigger lama (buka berurutan) dihapus
drop trigger if exists trg_open_next_term  on trainee_terms;
drop trigger if exists trg_open_first_term on users;
drop function if exists public.open_next_term();
drop function if exists public.open_first_term();

-- 3. Trigger baru: trainee baru langsung punya semua term
create or replace function public.open_all_terms()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'trainee' then
    insert into trainee_terms (trainee_id, term_id)
    select new.id, t.id from terms t
    on conflict (trainee_id, term_id) do nothing;
  end if;
  return new;
end $$;

create trigger trg_open_all_terms
after insert on users
for each row execute function public.open_all_terms();

-- 4. Isi ulang untuk trainee yang sudah ada (status lama tidak disentuh)
insert into trainee_terms (trainee_id, term_id)
select u.id, t.id
from users u
cross join terms t
where u.role = 'trainee'
on conflict (trainee_id, term_id) do nothing;

-- Cek: tiap trainee harus punya 12 baris (hasil harus kosong)
-- select u.username, count(tt.id) as jumlah_term
-- from users u left join trainee_terms tt on tt.trainee_id = u.id
-- where u.role = 'trainee'
-- group by u.username having count(tt.id) <> 12;
