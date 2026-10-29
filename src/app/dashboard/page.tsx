import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import { TermStatus } from '@/types/database'
import { Sparkles, Award, GraduationCap, BookOpen, Layers } from 'lucide-react'
import { DashboardTabsClient, TermCardItem } from './DashboardTabsClient'

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

    // 2. Fetch all 12 master terms (Kinder & Junior, 6 each)
    const { data: masterTerms, error: termsError } = await supabase
      .from('terms')
      .select('id, name, sort_order, level')
      .order('sort_order', { ascending: true })

    if (termsError) {
      console.error('Error fetching master terms:', termsError)
    }

    const termsList = masterTerms || []

    // 3. Fetch trainee_terms for this trainee
    const { data: traineeTermsData } = await supabase
      .from('trainee_terms')
      .select('id, term_id, status, cleared_to_teach, completed_at, updated_at')
      .eq('trainee_id', user.id)

    const traineeTerms = traineeTermsData || []
    const traineeTermIdSet = new Set(traineeTerms.map((t) => t.term_id))
    const totalAssignedTerms = traineeTerms.length

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

    // 5. Build term cards data - ONLY assigned terms
    const mapTermData = (term: (typeof termsList)[number]): TermCardItem => {
      const tt = traineeTerms.find((t) => t.term_id === term.id)
      const studiedInTerm = studiedLessons.filter(
        (l) => l.lessons?.term_id === term.id
      ).length

      return {
        id: term.id,
        name: term.name,
        sortOrder: term.sort_order,
        level: term.level,
        status: (tt?.status as TermStatus) || 'in_self_training',
        clearedToTeach: tt?.cleared_to_teach || false,
        completedAt: tt?.completed_at,
        studiedLessonsCount: studiedInTerm,
        totalLessonsCount: 10,
      }
    }

    const assignedMasterTerms = termsList.filter((t) => traineeTermIdSet.has(t.id))

    const kinderTermsWithProgress: TermCardItem[] = assignedMasterTerms
      .filter((t) => t.level === 'kinder')
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapTermData)

    const juniorTermsWithProgress: TermCardItem[] = assignedMasterTerms
      .filter((t) => t.level === 'junior')
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapTermData)

    // Overall stats (calculated ONLY from assigned terms)
    const totalAssignedLessons = totalAssignedTerms * 10
    const totalLessonsStudied = studiedLessons.filter((l) =>
      traineeTermIdSet.has(l.lessons?.term_id || 0)
    ).length

    const kinderLessonsStudied = kinderTermsWithProgress.reduce(
      (sum, t) => sum + t.studiedLessonsCount,
      0
    )
    const juniorLessonsStudied = juniorTermsWithProgress.reduce(
      (sum, t) => sum + t.studiedLessonsCount,
      0
    )

    const totalReadyForTrial = traineeTerms.filter(
      (t) => t.status === 'ready_for_trial'
    ).length
    const totalClearedToTeach = traineeTerms.filter(
      (t) => t.cleared_to_teach
    ).length

    const overallProgressPercent =
      totalAssignedLessons > 0
        ? Math.min(100, Math.round((totalLessonsStudied / totalAssignedLessons) * 100))
        : 0

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Navbar
          user={{
            name: profile.name,
            username: profile.username,
            role: profile.role,
            branch_name: branchName,
            level: null,
          }}
        />

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
          {totalAssignedTerms === 0 ? (
            <>
              {/* Welcome Banner */}
              <section className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-600/10 relative overflow-hidden">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Portal Pelatihan</span>
                    <span>•</span>
                    <span>Cabang {branchName}</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Halo, {profile.name}! 👋
                  </h1>
                  <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed">
                    Selamat datang di sistem pelatihan pengajar. Materi term Anda akan segera disiapkan oleh Trainer.
                  </p>
                </div>
              </section>

              {/* Empty State Banner */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center font-bold mb-2">
                  <Layers className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Belum ada term yang di-assign. Silakan hubungi trainer.
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Trainer Anda akan meng-assign term materi (Kinder atau Junior) sebelum Anda dapat memulai ceklis lesson.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Welcome Banner with Overall Progress */}
              <section className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-600/10 relative overflow-hidden">
                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Program Pelatihan</span>
                      <span>•</span>
                      <span>Cabang {branchName}</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      Halo, {profile.name}! 👋
                    </h1>
                    <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed">
                      Pelajari materi pada term yang telah di-assign oleh Trainer Anda. Setelah 10 lesson pada suatu term tercentang, ajukan <strong>Ready for Check</strong> kepada Trainer.
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
                      <span>{totalLessonsStudied} / {totalAssignedLessons} Lesson</span>
                      <span>{totalReadyForTrial} / {totalAssignedTerms} Ready for Trial</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Quick Stats Grid */}
              <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-xs text-slate-400 block mb-1">Total Progres</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                      {totalLessonsStudied}
                    </span>
                    <span className="text-xs text-slate-400">/ {totalAssignedLessons} Lesson</span>
                  </div>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1 block">
                    {overallProgressPercent}% selesai
                  </span>
                </div>

                {kinderTermsWithProgress.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="text-xs text-slate-400 block mb-1">Kinder Level</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                        {kinderLessonsStudied}
                      </span>
                      <span className="text-xs text-slate-400">
                        / {kinderTermsWithProgress.length * 10} Lesson
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                      {Math.round((kinderLessonsStudied / (kinderTermsWithProgress.length * 10)) * 100)}% selesai
                    </span>
                  </div>
                )}

                {juniorTermsWithProgress.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="text-xs text-slate-400 block mb-1">Junior Level</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                        {juniorLessonsStudied}
                      </span>
                      <span className="text-xs text-slate-400">
                        / {juniorTermsWithProgress.length * 10} Lesson
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                      {Math.round((juniorLessonsStudied / (juniorTermsWithProgress.length * 10)) * 100)}% selesai
                    </span>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-xs text-slate-400 block mb-1">Ready for Trial</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {totalReadyForTrial}
                    </span>
                    <span className="text-xs text-slate-400">/ {totalAssignedTerms} Term</span>
                  </div>
                  {totalClearedToTeach > 0 ? (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1 block">
                      {totalClearedToTeach} Layak Mengajar
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      0 Layak Mengajar
                    </span>
                  )}
                </div>
              </section>

              {/* Kinder and Junior Sections with Tabs */}
              <DashboardTabsClient
                kinderTerms={kinderTermsWithProgress}
                juniorTerms={juniorTermsWithProgress}
              />
            </>
          )}
        </main>
      </div>
    )
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      typeof (error as { digest: unknown }).digest === 'string' &&
      (error as { digest: string }).digest.startsWith('NEXT_')
    ) {
      throw error
    }
    console.error('Error on TraineeDashboardPage:', error)
    redirect('/login')
  }
}
