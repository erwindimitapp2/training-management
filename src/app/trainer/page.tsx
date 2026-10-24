import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import { TraineeListClient, TraineeSummary } from './TraineeListClient'
import { TermStatus } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function TrainerDashboardPage() {
  try {
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

    const branchId = profile.branch_id
    const branchName =
      (profile.branches as unknown as { name: string } | null)?.name || 'Cabang Belum Ditentukan'

    // 1. Fetch all trainees in the trainer's branch
    const { data: traineesData, error: traineesError } = await supabase
      .from('users')
      .select('id, name, username, level, is_active, created_at')
      .eq('role', 'trainee')
      .eq('branch_id', branchId ?? 0)
      .order('created_at', { ascending: false })

    if (traineesError) {
      console.error('Error fetching trainees:', traineesError)
    }

    const traineeList = traineesData || []
    const traineeIds = traineeList.map((t) => t.id)

    // 2. Fetch trainee_terms for all these trainees
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

    // 3. Fetch trainee_lessons for all these trainees
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

    // 4. Transform into TraineeSummary structure
    const trainees: TraineeSummary[] = traineeList.map((trainee) => {
      // Find all terms for this trainee
      const userTerms = termsData.filter((t) => t.trainee_id === trainee.id)

      // Completed terms count (status === 'ready_for_trial')
      const completedTermsCount = userTerms.filter(
        (t) => t.status === 'ready_for_trial'
      ).length

      // Active term is the one currently in progress (not ready_for_trial), or the highest sort_order term
      let activeTermObj = userTerms.find(
        (t) => t.status !== 'ready_for_trial'
      )

      if (!activeTermObj && userTerms.length > 0) {
        // If all are ready_for_trial, pick the highest sort order
        activeTermObj = [...userTerms].sort(
          (a, b) => (b.terms?.sort_order || 0) - (a.terms?.sort_order || 0)
        )[0]
      }

      let activeTerm = null
      if (activeTermObj && activeTermObj.terms) {
        // Count studied lessons for this term
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

      return {
        id: trainee.id,
        name: trainee.name,
        username: trainee.username,
        level: trainee.level,
        is_active: trainee.is_active,
        created_at: trainee.created_at || '',
        activeTerm,
        completedTermsCount,
      }
    })

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
          <TraineeListClient trainees={trainees} branchName={branchName} />
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
