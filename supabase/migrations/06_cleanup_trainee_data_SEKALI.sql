-- =====================================================================
-- 06_cleanup_trainee_data_SEKALI.sql
-- !!! DESTRUKTIF. JALANKAN SEKALI SAJA, SETELAH 05_patch_assign_terms.sql !!!
--
-- Menghapus SEMUA trainee beserta akun login, ceklis lesson, status term,
-- riwayat, dan penilaian observasi mereka. Mulai dari awal.
--
-- TIDAK disentuh: akun trainer, branches, terms, lessons.
-- Tidak bisa dibatalkan. Pastikan memang ingin membersihkan semuanya.
-- =====================================================================

begin;

-- Urutan penting: tabel anak dulu
delete from observation_sessions
where trainee_id in (select id from users where role = 'trainee');

delete from status_history
where trainee_term_id in (
  select tt.id from trainee_terms tt
  join users u on u.id = tt.trainee_id
  where u.role = 'trainee'
);

delete from trainee_lessons
where trainee_id in (select id from users where role = 'trainee');

delete from trainee_terms
where trainee_id in (select id from users where role = 'trainee');

-- Hapus akun login trainee; baris public.users ikut terhapus (on delete cascade)
delete from auth.users
where id in (select id from users where role = 'trainee');

commit;

-- Cek hasil (semua harus 0, kecuali trainer):
-- select
--   (select count(*) from users where role = 'trainee')  as trainee,
--   (select count(*) from trainee_terms)                 as trainee_terms,
--   (select count(*) from trainee_lessons)               as trainee_lessons,
--   (select count(*) from observation_sessions)          as observasi,
--   (select count(*) from users where role = 'trainer')  as trainer_masih_ada;
