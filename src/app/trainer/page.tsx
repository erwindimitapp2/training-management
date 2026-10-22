import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import { ShieldCheck, Sparkles, Clock } from 'lucide-react'

export default async function TrainerDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, username, role, level, is_active, branch_id, branches(name)')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) {
    redirect('/login?error=inactive')
  }

  if (profile.role !== 'trainer') {
    redirect('/dashboard')
  }

  const branchName = (profile.branches as unknown as { name: string } | null)?.name || 'Semua Cabang'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar
        user={{
          name: profile.name,
          username: profile.username,
          role: profile.role,
          branch_name: branchName,
          level: profile.level,
        }}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-purple-600/10 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-medium mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Panel Administrator &amp; Trainer</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Halo, Trainer {profile.name}! 👨‍🏫
              </h1>
              <p className="text-purple-100 text-sm mt-1 max-w-xl">
                Anda memiliki akses penuh untuk mengelola pendaftaran trainee, memverifikasi pemahaman, dan mencatat observasi di cabang <strong>{branchName}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Phase 1 Status Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Fase 1 Berhasil: Fondasi &amp; Akses Trainer Terverifikasi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sesi login aktif sebagai Trainer dengan otorisasi cabang
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Username Trainer</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                @{profile.username}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Cabang Otoritas</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {branchName}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Hak Akses</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                Trainer / Administrator
              </span>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 text-xs text-purple-900 dark:text-purple-300 flex items-center gap-3">
            <Clock className="w-5 h-5 text-purple-500 shrink-0" />
            <span>
              Fitur pendaftaran trainee baru, daftar trainee per cabang, reset password, dan nonaktifkan trainee akan aktif pada <strong>Fase 2 (Admin Trainer)</strong>.
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
