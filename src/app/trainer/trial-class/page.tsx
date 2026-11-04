import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import { TrialClassListClient, TrialClassListItem } from './TrialClassListClient'
import { TraineeOption } from '@/components/AssignTrialClassModal'
import { TrialClassStatus } from '@/lib/status-labels'

export const dynamic = 'force-dynamic'

export default async function TrainerTrialClassPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, name, username, role, is_active, branch_id, branches(name)')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.is_active) {
    redirect('/login?error=inactive')
  }

  if (profile.role !== 'trainer') {
    redirect('/dashboard')
  }

  // 1. Fetch branches
  const { data: branchesData } = await supabase
    .from('branches')
    .select('id, name')
    .order('name', { ascending: true })

  const branches = branchesData || []

  // 2. Fetch all trainees for this trainer
  const { data: traineesData } = await supabase
    .from('users')
    .select('id, name, username, branch_id, branches(name)')
    .eq('role', 'trainee')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const trainees: TraineeOption[] = (traineesData || []).map((t) => ({
    id: t.id,
    name: t.name,
    username: t.username,
    branchId: t.branch_id,
    branchName: (t.branches as unknown as { name: string } | null)?.name,
  }))

  // 3. Fetch trial_classes with evaluation and trainee details
  const { data: trialClassesData, error: tcError } = await supabase
    .from('trial_classes')
    .select(
      `
      id,
      trainee_id,
      trial_date,
      student_name,
      level,
      placement,
      trainee_notes,
      status,
      submitted_at,
      created_at,
      users:trainee_id(id, name, username, branch_id, branches(id, name)),
      trial_class_evaluations(
        id,
        score_conduct,
        score_placement,
        score_parent_update,
        trainer_placement,
        trainer_notes,
        evaluated_at,
        evaluator:users!trial_class_evaluations_evaluated_by_fkey(name)
      )
    `
    )
    .order('trial_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (tcError) {
    console.error('Error fetching trial_classes:', tcError)
  }

  const items: TrialClassListItem[] = (trialClassesData || []).map((tc) => {
    const traineeObj = tc.users as unknown as {
      id: string
      name: string
      username: string
      branch_id: number | null
      branches: { id: number; name: string } | null
    } | null

    const evalRaw = tc.trial_class_evaluations as unknown
    const evalObj = Array.isArray(evalRaw) ? evalRaw[0] : evalRaw
    const typedEval = evalObj as {
      id: number
      score_conduct: number
      score_placement: number
      score_parent_update: number
      trainer_placement?: string | null
      trainer_notes?: string | null
      evaluated_at: string
      evaluator?: { name: string } | null
    } | null

    return {
      id: tc.id,
      traineeId: tc.trainee_id,
      traineeName: traineeObj?.name || 'Trainee',
      username: traineeObj?.username || '',
      branchId: traineeObj?.branch_id || null,
      branchName: traineeObj?.branches?.name || 'Tanpa Cabang',
      trialDate: tc.trial_date,
      studentName: tc.student_name,
      level: tc.level,
      placement: tc.placement,
      traineeNotes: tc.trainee_notes,
      status: tc.status as TrialClassStatus,
      submittedAt: tc.submitted_at,
      createdAt: tc.created_at,
      evaluation: typedEval
        ? {
            id: typedEval.id,
            scoreConduct: typedEval.score_conduct,
            scorePlacement: typedEval.score_placement,
            scoreParentUpdate: typedEval.score_parent_update,
            trainerPlacement: typedEval.trainer_placement,
            trainerNotes: typedEval.trainer_notes,
            evaluatedAt: typedEval.evaluated_at,
            evaluatorName: typedEval.evaluator?.name,
          }
        : null,
    }
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar
        user={{
          name: profile.name,
          username: profile.username,
          role: profile.role,
          branch_name: (profile.branches as unknown as { name: string } | null)?.name || undefined,
          level: null,
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <TrialClassListClient
          initialItems={items}
          trainees={trainees}
          branches={branches}
        />
      </main>
    </div>
  )
}
