import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import {
  TrialClassListClient,
  TrialClassListItem,
} from './TrialClassListClient'
import { TraineeOption } from '@/components/TrialClassModal'

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

  // 2. Fetch all trainees for this trainer (RLS is_my_trainee)
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

  // 3. Fetch trial_classes
  const { data: trialClassesData, error: tcError } = await supabase
    .from('trial_classes')
    .select(
      'id, trainee_id, trial_date, student_name, level, placement, score_conduct, score_placement, score_parent_update, notes, created_at, users:trainee_id(name, username, branch_id, branches(name))'
    )
    .order('trial_date', { ascending: false })

  if (tcError) {
    console.error('Error fetching trial_classes:', tcError)
  }

  const items: TrialClassListItem[] = (trialClassesData || []).map((tc) => {
    const traineeObj = tc.users as unknown as {
      name: string
      username: string
      branch_id: number | null
      branches: { name: string } | null
    } | null

    return {
      id: tc.id,
      traineeId: tc.trainee_id,
      traineeName: traineeObj?.name || 'Trainee',
      traineeUsername: traineeObj?.username || '',
      branchId: traineeObj?.branch_id || null,
      branchName: traineeObj?.branches?.name || 'Semua Cabang',
      trialDate: tc.trial_date,
      studentName: tc.student_name,
      level: tc.level,
      placement: tc.placement,
      scoreConduct: tc.score_conduct,
      scorePlacement: tc.score_placement,
      scoreParentUpdate: tc.score_parent_update,
      notes: tc.notes,
      createdAt: tc.created_at,
    }
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar
        user={{
          name: profile.name,
          role: profile.role,
          username: profile.username,
          branch_name: (profile.branches as unknown as { name: string } | null)?.name,
        }}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <TrialClassListClient
          initialItems={items}
          trainees={trainees}
          branches={branches}
        />
      </main>
    </div>
  )
}

