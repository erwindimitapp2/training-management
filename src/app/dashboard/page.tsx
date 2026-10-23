import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import { CheckCircle2, Clock, Sparkles } from 'lucide-react'

export default async function TraineeDashboardPage() {
  try {
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

    if (profile.role === 'trainer') {
      redirect('/trainer')
    }

    const branchName =
      (profile.branches as unknown as { name: string } | null)?.name || 'Cabang Belum Ditentukan'

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
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-600/10 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-medium mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Portal Pembelajaran Trainee</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Halo, {profile.name}! 👋
                </h1>
                <p className="text-indigo-100 text-sm mt-1 max-w-xl">
                  Selamat datang di platform monitoring training. Anda terdaftar pada program{' '}
                  <strong className="capitalize">{profile.level || 'Kinder'}</strong> di cabang{' '}
                  <strong>{branchName}</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Placeholder / Phase 1 Status */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Fase 1 Berhasil: Fondasi &amp; Autentikasi Siap
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sesi login aktif sebagai Trainee
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Username</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  @{profile.username}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Program &amp; Level</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                  {profile.level || '-'} (6 Term x 10 Lesson)
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Cabang Penempatan</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {branchName}
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-300 flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-500 shrink-0" />
              <span>
                Ceklis 6 term dan 10 lesson per term akan aktif sepenuhnya pada{' '}
                <strong>Fase 3 (Sisi Trainee)</strong>.
              </span>
            </div>
          </div>
        </main>
      </div>
    )
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      typeof (error as { digest: unknown }).digest === 'string' &&
      (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error
    }
    console.error('Error on Trainee Dashboard:', error)
    redirect('/login')
  }
}
