import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import Link from 'next/link'
import { TermStatus } from '@/types/database'
import { STATUS_LABELS, STATUS_STYLES, GOLD_BADGE_STYLE } from '@/lib/constants'
import {
  Sparkles,
  Lock,
  ArrowRight,
  CheckCircle2,
  Award,
  BookOpen,
  GraduationCap,
  Clock,
  Compass,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TraineeDashboardPage() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    // 1. Fetch trainee profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, name, username, role, level, is_active, branch_id, branches(name)')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.is_active) {
      redirect('/login?error=inactive')
    }

    if (profile.role !== 'trainee') {
      redirect('/trainer')
    }

    const branchName =
      (profile.branches as unknown as { name: string } | null)?.name || 'Cabang Belum Ditentukan'
    const traineeLevel = profile.level || 'kinder'

    // 2. Fetch all 6 master terms for trainee's level
    const { data: masterTerms, error: termsError } = await supabase
      .from('terms')
      .select('id, name, sort_order, level')
      .eq('level', traineeLevel)
      .order('sort_order', { ascending: true })

    const termsList = masterTerms || []

    // 3. Fetch trainee_terms for this trainee
    const { data: traineeTermsData } = await supabase
      .from('trainee_terms')
      .select('id, term_id, status, cleared_to_teach, completed_at, updated_at')
      .eq('trainee_id', user.id)

    const traineeTerms = traineeTermsData || []

    // 4. Fetch trainee_lessons for this trainee (studied = true)
    const { data: studiedLessonsData } = await supabase
      .from('trainee_lessons')
      .select('lesson_id, studied, lessons(term_id)')
      .eq('trainee_id', user.id)
      .eq('studied', true)

    const studiedLessons = (studiedLessonsData || []) as Array<{
      lesson_id: number
      studied: boolean
      lessons: { term_id: number } | null
    }>

    // 5. Build term cards data
    const termsWithProgress = termsList.map((term) => {
      const tt = traineeTerms.find((t) => t.term_id === term.id)
      const studiedInTerm = studiedLessons.filter(
        (l) => l.lessons?.term_id === term.id
      ).length

      return {
        id: term.id,
        name: term.name,
        sortOrder: term.sort_order,
        level: term.level,
        isUnlocked: tt !== undefined,
        traineeTermId: tt?.id,
        status: tt?.status as TermStatus | undefined,
        clearedToTeach: tt?.cleared_to_teach || false,
        completedAt: tt?.completed_at,
        studiedLessonsCount: studiedInTerm,
        totalLessonsCount: 10,
      }
    })

    // Overall stats
    const totalLessonsStudied = studiedLessons.length
    const totalTermsCompleted = traineeTerms.filter(
      (t) => t.status === 'ready_for_trial'
    ).length
    const totalClearedToTeach = traineeTerms.filter(
      (t) => t.cleared_to_teach
    ).length
    const overallProgressPercent = Math.min(
      100,
      Math.round((totalLessonsStudied / 60) * 100)
    )

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

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
          {/* Welcome Banner with Overall Progress */}
          <section className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-600/10 relative overflow-hidden">
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span className="capitalize">{traineeLevel} Training Program</span>
                  <span>•</span>
                  <span>Cabang {branchName}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Halo, {profile.name}! 👋
                </h1>
                <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed">
                  Pantau pembelajaran mandiri Anda di sini. Pelajari setiap lesson, centang ceklis, dan ajukan <strong>Ready for Check</strong> kepada Trainer untuk melanjutkan ke term berikutnya.
                </p>
              </div>

              {/* Progress Bar Card */}
              <div className="w-full lg:w-80 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 space-y-3 shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-indigo-100">Progres Keseluruhan</span>
                  <span className="font-bold text-lg text-white">{overallProgressPercent}%</span>
                </div>

                <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${overallProgressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-indigo-100 pt-1 border-t border-white/10">
                  <span>{totalLessonsStudied} / 60 Lesson</span>
                  <span>{totalTermsCompleted} / 6 Term Selesai</span>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Stats Grid */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-400 block mb-1">Term Selesai</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {totalTermsCompleted}
                </span>
                <span className="text-xs text-slate-400">/ 6 Term</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-400 block mb-1">Lesson Tercentang</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {totalLessonsStudied}
                </span>
                <span className="text-xs text-slate-400">/ 60 Lesson</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-400 block mb-1">Status Mengajar</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {totalClearedToTeach}
                </span>
                <span className="text-xs text-slate-400">Term Layak</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-400 block mb-1">Level Program</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 capitalize">
                  {traineeLevel}
                </span>
              </div>
            </div>
          </section>

          {/* 6 Terms Sequential Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Alur Pelatihan (6 Term)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Selesaikan setiap term secara bertahap. Term berikutnya akan terbuka setelah term aktif disetujui.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {termsWithProgress.map((term) => {
                const isUnlocked = term.isUnlocked
                const status = term.status
                const statusStyle = status ? STATUS_STYLES[status] : null
                const progressPercent = Math.round((term.studiedLessonsCount / 10) * 100)
                const isCompleted = status === 'ready_for_trial'

                return (
                  <div
                    key={term.id}
                    className={`rounded-2xl border transition-all flex flex-col justify-between p-5 relative overflow-hidden ${
                      isUnlocked
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700'
                        : 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          TERM 0{term.sortOrder}
                        </span>

                        {isUnlocked && status && statusStyle ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            <span>{STATUS_LABELS[status]}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <Lock className="w-3 h-3" />
                            <span>Terkunci</span>
                          </span>
                        )}
                      </div>

                      {/* Term Title */}
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {term.name}
                      </h3>

                      {/* Cleared to teach badge */}
                      {term.clearedToTeach && (
                        <div className="mt-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${GOLD_BADGE_STYLE.bg}`}
                          >
                            <Award className="w-3 h-3 text-amber-500" />
                            <span>Layak Mengajar</span>
                          </span>
                        </div>
                      )}

                      {/* Progress description */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            {isUnlocked
                              ? `${term.studiedLessonsCount} dari 10 Lesson`
                              : 'Belum Terbuka'}
                          </span>
                          {isUnlocked && (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {progressPercent}%
                            </span>
                          )}
                        </div>

                        {isUnlocked ? (
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        ) : (
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full" />
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                      {isUnlocked ? (
                        <Link
                          href={`/term/${term.id}`}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                            isCompleted
                              ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-indigo-500/20'
                          }`}
                        >
                          <span>{isCompleted ? 'Lihat Ceklis Lesson' : 'Buka Ceklis Lesson'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <div className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center gap-1.5 cursor-not-allowed">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Terkunci</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
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
    console.error('Error on TraineeDashboardPage:', error)
    redirect('/login')
  }
}
