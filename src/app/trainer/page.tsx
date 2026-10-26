import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import { TraineeListClient, TraineeSummary, BranchSummary } from './TraineeListClient'
import { TermStatus } from '@/types/database'

export const dynamic = 'force-dynamic'

interface TrainerDashboardPageProps {
  searchParams?: Promise<{ cabang?: string }>
}

export default async function TrainerDashboardPage({ searchParams }: TrainerDashboardPageProps) {
  try {
    const resolvedSearchParams = searchParams ? await searchParams : undefined
    const initialCabangParam = resolvedSearchParams?.cabang

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, name, username, role, level, is_active, branch_id, branches(name)')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.is_active) {
      redirect('/login?error=inactive')
    }

    if (profile.role !== 'trainer') {
      redirect('/dashboard')
    }

    const trainerBranchName =
      (profile.branches as unknown as { name: string } | null)?.name || 'Semua Cabang'

    // 1. Fetch all branches
    const { data: branchesData } = await supabase
      .from('branches')
      .select('id, name')
      .order('name', { ascending: true })

    const branches = branchesData || []

    // 2. Fetch all trainees across all branches (Trainer is administrator for all branches)
    const { data: traineesData, error: traineesError } = await supabase
      .from('users')
      .select('id, name, username, level, is_active, created_at, branch_id, branches(id, name)')
      .eq('role', 'trainee')
      .order('created_at', { ascending: false })

    if (traineesError) {
      console.error('Error fetching trainees:', traineesError)
    }

    const traineeList = traineesData || []
    const traineeIds = traineeList.map((t) => t.id)

    // 3. Fetch trainee_terms for all trainees
    let termsData: Array<{
      id: number
      trainee_id: string
      term_id: number
      status: TermStatus
      cleared_to_teach: boolean
      terms: {
        id: number
        name: string
        level: string
        sort_order: number
      } | null
    }> = []

    if (traineeIds.length > 0) {
      const { data: ttData } = await supabase
        .from('trainee_terms')
        .select('id, trainee_id, term_id, status, cleared_to_teach, terms(id, name, level, sort_order)')
        .in('trainee_id', traineeIds)

      if (ttData) {
        termsData = ttData as unknown as typeof termsData
      }
    }

    // 4. Fetch trainee_lessons for all trainees
    let studiedLessonsData: Array<{
      trainee_id: string
      lesson_id: number
      studied: boolean
      lessons: {
        term_id: number
      } | null
    }> = []

    if (traineeIds.length > 0) {
      const { data: tlData } = await supabase
        .from('trainee_lessons')
        .select('trainee_id, lesson_id, studied, lessons(term_id)')
        .in('trainee_id', traineeIds)
        .eq('studied', true)

      if (tlData) {
        studiedLessonsData = tlData as unknown as typeof studiedLessonsData
      }
    }

    // 5. Transform into TraineeSummary structure
    const trainees: TraineeSummary[] = traineeList.map((trainee) => {
      const userTerms = termsData.filter((t) => t.trainee_id === trainee.id)

      // Completed terms count (status === 'ready_for_trial')
      const completedTermsCount = userTerms.filter(
        (t) => t.status === 'ready_for_trial'
      ).length

      // Cleared to teach terms count (passed observation)
      const clearedTermsCount = userTerms.filter(
        (t) => t.cleared_to_teach === true
      ).length

      // Active term is the one currently in progress (not ready_for_trial), or the highest sort_order term
      let activeTermObj = userTerms.find(
        (t) => t.status !== 'ready_for_trial'
      )

      if (!activeTermObj && userTerms.length > 0) {
        activeTermObj = [...userTerms].sort(
          (a, b) => (b.terms?.sort_order || 0) - (a.terms?.sort_order || 0)
        )[0]
      }

      let activeTerm = null
      if (activeTermObj && activeTermObj.terms) {
        const studiedCount = studiedLessonsData.filter(
          (l) =>
            l.trainee_id === trainee.id &&
            l.lessons?.term_id === activeTermObj.terms?.id
        ).length

        activeTerm = {
          traineeTermId: activeTermObj.id,
          termId: activeTermObj.terms.id,
          termName: activeTermObj.terms.name,
          sortOrder: activeTermObj.terms.sort_order,
          status: activeTermObj.status,
          clearedToTeach: activeTermObj.cleared_to_teach,
          studiedLessonsCount: studiedCount,
          totalLessonsCount: 10,
        }
      }

      const branchObj = trainee.branches as unknown as { id: number; name: string } | null
      const traineeBranchName = branchObj?.name || 'Tanpa cabang'
      const traineeBranchId = trainee.branch_id

      return {
        id: trainee.id,
        name: trainee.name,
        username: trainee.username,
        level: trainee.level,
        branchId: traineeBranchId,
        branchName: traineeBranchName,
        is_active: trainee.is_active,
        created_at: trainee.created_at || '',
        activeTerm,
        completedTermsCount,
        clearedTermsCount,
      }
    })

    // 6. Compute summary per branch (one card per branch)
    const branchSummaries: BranchSummary[] = branches.map((b) => {
      const branchTrainees = trainees.filter((t) => t.branchId === b.id)
      const activeTrainees = branchTrainees.filter((t) => t.is_active)
      const readyForCheck = activeTrainees.filter(
        (t) => t.activeTerm?.status === 'ready_for_check'
      )
      const clearedTerms = branchTrainees.reduce(
        (acc, t) => acc + (t.clearedTermsCount || 0),
        0
      )

      return {
        branchId: b.id,
        branchName: b.name,
        activeTraineesCount: activeTrainees.length,
        readyForCheckCount: readyForCheck.length,
        clearedTermsCount: clearedTerms,
      }
    })

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Navbar
          user={{
            name: profile.name,
            username: profile.username,
            role: profile.role,
            branch_name: `${trainerBranchName} (Semua Cabang)`,
            level: profile.level,
          }}
        />

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat data...</div>}>
            <TraineeListClient
              trainees={trainees}
              branches={branches}
              branchSummaries={branchSummaries}
              initialCabang={initialCabangParam}
            />
          </Suspense>
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
    console.error('Error on Trainer Dashboard:', error)
    redirect('/login')
  }
}
