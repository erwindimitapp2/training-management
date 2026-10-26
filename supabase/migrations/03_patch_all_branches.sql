-- =====================================================================
-- 03_patch_all_branches.sql
-- Jalankan di Supabase SQL Editor (aman dijalankan ulang).
-- Perubahan: trainer aktif boleh melihat & mengelola trainee di SEMUA cabang.
-- Semua policy RLS dan fungsi change_term_status / record_observation
-- memakai is_my_trainee(), jadi cukup fungsi ini yang diganti.
-- =====================================================================

create or replace function public.is_my_trainee(p_trainee_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
           select 1 from users t
           where t.id = auth.uid() and t.role = 'trainer' and t.is_active
         )
     and exists (
           select 1 from users u
           where u.id = p_trainee_id and u.role = 'trainee'
         )
$$;

-- Cek: semua trainee harus punya cabang (hasil harus 0 baris)
-- select id, name from users where role = 'trainee' and branch_id is null;
