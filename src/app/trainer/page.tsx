import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import {
  TraineeListClient,
  TraineeSummary,
  BranchSummary,
  ReadyForCheckQueueItem,
} from './TraineeListClient'
import { ProgramLevel, TermStatus } from '@/types/database'

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

    // 2. Fetch master terms to know level for every term
    const { data: masterTermsData } = await supabase
      .from('terms')
      .select('id, level, name, sort_order')
      .order('sort_order', { ascending: true })

    const masterTerms = masterTermsData || []
    const kinderTermIds = new Set(
      masterTerms.filter((t) => t.level === 'kinder').map((t) => t.id)
    )
    const juniorTermIds = new Set(
      masterTerms.filter((t) => t.level === 'junior').map((t) => t.id)
    )

    // 3. Fetch all trainees across all branches
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

    // 4. Fetch trainee_terms for all trainees
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

    // 5. Fetch studied lessons for all trainees
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

    // 6. Build TraineeSummary list
    const trainees: TraineeSummary[] = traineeList.map((trainee) => {
      const userTerms = termsData.filter((t) => t.trainee_id === trainee.id)
      const assignedTermsCount = userTerms.length
      const assignedTermIdSet = new Set(userTerms.map((t) => t.term_id))

      // Studied lessons only in assigned terms
      const userStudied = studiedLessonsData.filter(
        (l) => l.trainee_id === trainee.id && assignedTermIdSet.has(l.lessons?.term_id || 0)
      )
      const totalLessonsStudied = userStudied.length

      // Completed terms count (status === 'ready_for_trial')
      const readyForTrialCount = userTerms.filter(
        (t) => t.status === 'ready_for_trial'
      ).length

      // Cleared to teach terms count (passed observation)
      const clearedTermsCount = userTerms.filter(
        (t) => t.cleared_to_teach === true
      ).length

      const branchObj = trainee.branches as unknown as { id: number; name: string } | null
      const traineeBranchName = branchObj?.name || 'Tanpa cabang'

      return {
        id: trainee.id,
        name: trainee.name,
        username: trainee.username,
        branchId: trainee.branch_id,
        branchName: traineeBranchName,
        is_active: trainee.is_active,
        created_at: trainee.created_at || '',
        assignedTermsCount,
        totalLessonsStudied,
        readyForTrialCount,
        clearedTermsCount,
      }
    })

    // 7. Build Ready for Check Queue (one item per TERM in ready_for_check)
    const readyForCheckQueue: ReadyForCheckQueueItem[] = []
    for (const tt of termsData) {
      if (tt.status === 'ready_for_check') {
        const trainee = traineeList.find((t) => t.id === tt.trainee_id)
        if (trainee && trainee.is_active && tt.terms) {
          const branchObj = trainee.branches as unknown as { id: number; name: string } | null
          readyForCheckQueue.push({
            traineeTermId: tt.id,
            traineeId: trainee.id,
            traineeName: trainee.name,
            username: trainee.username,
            branchId: trainee.branch_id,
            branchName: branchObj?.name || 'Tanpa cabang',
            termId: tt.terms.id,
            termName: tt.terms.name,
            level: tt.terms.level as ProgramLevel,
            sortOrder: tt.terms.sort_order,
          })
        }
      }
    }

    // Sort queue by term level and sort_order
    readyForCheckQueue.sort((a, b) => {
      if (a.level !== b.level) {
        return a.level.localeCompare(b.level)
      }
      return a.sortOrder - b.sortOrder
    })

    // 8. Compute summary per branch (one card per branch) based on term status counts
    const branchSummaries: BranchSummary[] = branches.map((b) => {
      const branchTrainees = traineeList.filter((t) => t.branch_id === b.id)
      const activeBranchTrainees = branchTrainees.filter((t) => t.is_active)
      const activeTraineeIdSet = new Set(activeBranchTrainees.map((t) => t.id))

      // All terms of active trainees in this branch
      const branchTerms = termsData.filter((t) => activeTraineeIdSet.has(t.trainee_id))

      const readyForCheckCount = branchTerms.filter(
        (t) => t.status === 'ready_for_check'
      ).length

      const readyForTrialCount = branchTerms.filter(
        (t) => t.status === 'ready_for_trial'
      ).length

      const clearedTermsCount = branchTerms.filter(
        (t) => t.cleared_to_teach === true
      ).length

      return {
        branchId: b.id,
        branchName: b.name,
        activeTraineesCount: activeBranchTrainees.length,
        readyForCheckCount,
        readyForTrialCount,
        clearedTermsCount,
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
            level: null,
          }}
        />

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat data...</div>}>
            <TraineeListClient
              trainees={trainees}
              readyForCheckQueue={readyForCheckQueue}
              branches={branches}
              branchSummaries={branchSummaries}
              initialCabang={initialCabangParam}
              masterTerms={masterTerms.map((t) => ({
                id: t.id,
                name: t.name,
                level: t.level as ProgramLevel,
                sortOrder: t.sort_order,
              }))}
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
      (error as { digest: string }).digest.startsWith('NEXT_')
    ) {
      throw error
    }
    console.error('Error on Trainer Dashboard:', error)
    redirect('/login')
  }
}
