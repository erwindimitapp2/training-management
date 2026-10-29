import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import { TraineeDetailClient, TermDetail } from './TraineeDetailClient'
import { ProgramLevel, TermStatus, ObservationResult } from '@/types/database'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TraineeDetailPage({ params }: PageProps) {
  const { id: traineeId } = await params

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    // 1. Verify caller is active trainer
    const { data: trainerProfile, error: trainerError } = await supabase
      .from('users')
      .select('id, name, username, role, branch_id, is_active, branches(name)')
      .eq('id', user.id)
      .single()

    if (trainerError || !trainerProfile || !trainerProfile.is_active || trainerProfile.role !== 'trainer') {
      redirect('/dashboard')
    }

    const trainerBranchName =
      (trainerProfile.branches as unknown as { name: string } | null)?.name || 'Cabang Belum Ditentukan'

    // 2. Fetch trainee
    const { data: traineeData, error: traineeError } = await supabase
      .from('users')
      .select('id, name, username, role, level, is_active, created_at, branch_id, branches(name)')
      .eq('id', traineeId)
      .single()

    if (traineeError || !traineeData || traineeData.role !== 'trainee') {
      redirect('/trainer')
    }

    // Fetch branches for branch change feature
    const { data: branchesData } = await supabase
      .from('branches')
      .select('id, name')
      .order('name', { ascending: true })

    const branches = branchesData || []

    const traineeBranchName =
      (traineeData.branches as unknown as { name: string } | null)?.name || 'Tanpa cabang'
    const traineeLevel = (traineeData.level || 'kinder') as ProgramLevel

    // 3. Fetch master terms for all levels (Kinder & Junior, 12 terms)
    const { data: masterTerms, error: termsError } = await supabase
      .from('terms')
      .select('id, level, name, sort_order')
      .order('sort_order', { ascending: true })

    const termsList = masterTerms || []
    const termIds = termsList.map((t) => t.id)

    // 4. Fetch lessons for these terms
    let masterLessons: Array<{
      id: number
      term_id: number
      lesson_number: number
      title: string | null
    }> = []

    if (termIds.length > 0) {
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, term_id, lesson_number, title')
        .in('term_id', termIds)
        .order('lesson_number', { ascending: true })

      if (lessonsData) {
        masterLessons = lessonsData
      }
    }

    // 5. Fetch trainee_terms for this trainee
    let traineeTerms: Array<{
      id: number
      term_id: number
      status: TermStatus
      cleared_to_teach: boolean
      completed_at: string | null
      updated_at: string
    }> = []

    if (termIds.length > 0) {
      const { data: ttData } = await supabase
        .from('trainee_terms')
        .select('id, term_id, status, cleared_to_teach, completed_at, updated_at')
        .eq('trainee_id', traineeId)
        .in('term_id', termIds)

      if (ttData) {
        traineeTerms = ttData as typeof traineeTerms
      }
    }

    const traineeTermIds = traineeTerms.map((tt) => tt.id)

    // 6. Fetch trainee_lessons for this trainee
    let traineeLessons: Array<{
      lesson_id: number
      studied: boolean
      studied_at: string | null
    }> = []

    const { data: tlData } = await supabase
      .from('trainee_lessons')
      .select('lesson_id, studied, studied_at')
      .eq('trainee_id', traineeId)

    if (tlData) {
      traineeLessons = tlData
    }

    // 7. Fetch status_history for this trainee's terms
    let statusHistoryList: Array<{
      id: number
      trainee_term_id: number
      from_status: string | null
      to_status: string
      note: string | null
      changed_at: string
      users: { name: string } | null
    }> = []

    if (traineeTermIds.length > 0) {
      const { data: shData } = await supabase
        .from('status_history')
        .select('id, trainee_term_id, from_status, to_status, note, changed_at, users(name)')
        .in('trainee_term_id', traineeTermIds)
        .order('changed_at', { ascending: false })

      if (shData) {
        statusHistoryList = shData as unknown as typeof statusHistoryList
      }
    }

    // 8. Fetch observation_sessions for this trainee
    let observationList: Array<{
      id: number
      term_id: number
      session_date: string
      score_preparation: number
      score_delivery: number
      score_mastery: number
      score_visual: number
      score_engagement: number
      result: ObservationResult
      notes: string | null
      users: { name: string } | null
    }> = []

    const { data: obsData } = await supabase
      .from('observation_sessions')
      .select('id, term_id, session_date, score_preparation, score_delivery, score_mastery, score_visual, score_engagement, result, notes, users!trainer_id(name)')
      .eq('trainee_id', traineeId)
      .order('session_date', { ascending: false })

    if (obsData) {
      observationList = obsData as unknown as typeof observationList
    }

    // 9. Assemble into TermDetail[] - ONLY assigned terms
    const assignedTermsList = termsList.filter((term) =>
      traineeTerms.some((tt) => tt.term_id === term.id)
    )

    const terms: TermDetail[] = assignedTermsList.map((term) => {
      const tt = traineeTerms.find((t) => t.term_id === term.id)!
      const termLessons = masterLessons.filter((l) => l.term_id === term.id)

      const lessons = termLessons.map((l) => {
        const studiedEntry = traineeLessons.find((tl) => tl.lesson_id === l.id)
        return {
          id: l.id,
          lessonNumber: l.lesson_number,
          title: l.title,
          studied: studiedEntry?.studied || false,
          studiedAt: studiedEntry?.studied_at || null,
        }
      })

      const history = statusHistoryList
        .filter((h) => h.trainee_term_id === tt.id)
        .map((h) => ({
          id: h.id,
          fromStatus: h.from_status,
          toStatus: h.to_status,
          note: h.note,
          changedAt: h.changed_at,
          changedByName: h.users?.name || 'Trainer',
        }))

      const observations = observationList
        .filter((o) => o.term_id === term.id)
        .map((o) => ({
          id: o.id,
          sessionDate: o.session_date,
          scorePreparation: o.score_preparation,
          scoreDelivery: o.score_delivery,
          scoreMastery: o.score_mastery,
          scoreVisual: o.score_visual,
          scoreEngagement: o.score_engagement,
          result: o.result,
          notes: o.notes,
          trainerName: o.users?.name || 'Trainer',
        }))

      return {
        termId: term.id,
        name: term.name,
        sortOrder: term.sort_order,
        level: term.level,
        traineeTerm: {
          id: tt.id,
          status: tt.status,
          clearedToTeach: tt.cleared_to_teach,
          completedAt: tt.completed_at,
          updatedAt: tt.updated_at,
        },
        lessons,
        history,
        observations,
      }
    })

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Navbar
          user={{
            name: trainerProfile.name,
            username: trainerProfile.username,
            role: trainerProfile.role,
            branch_name: trainerBranchName,
            level: null,
          }}
        />

        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <TraineeDetailClient
            trainee={{
              id: traineeData.id,
              name: traineeData.name,
              username: traineeData.username,
              level: traineeLevel,
              branchId: traineeData.branch_id,
              branchName: traineeBranchName,
              isActive: traineeData.is_active,
              createdAt: traineeData.created_at || '',
            }}
            branches={branches}
            terms={terms}
            masterTerms={termsList.map((t) => ({
              id: t.id,
              name: t.name,
              level: t.level as ProgramLevel,
              sortOrder: t.sort_order,
            }))}
          />
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
    console.error('Error on TraineeDetailPage:', error)
    redirect('/trainer')
  }
}
