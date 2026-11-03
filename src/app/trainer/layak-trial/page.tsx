import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import {
  LayakTrialListClient,
  LayakTrialItem,
} from './LayakTrialListClient'

export const dynamic = 'force-dynamic'

export default async function TrainerLayakTrialPage() {
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

  // 2. Fetch trial_readiness with is_ready = true
  const { data: readinessData, error: readinessError } = await supabase
    .from('trial_readiness')
    .select(
      'id, trainee_id, level, is_ready, changed_at, users:trainee_id(id, name, username, branch_id, is_active, branches(name))'
    )
    .eq('is_ready', true)
    .order('changed_at', { ascending: false })

  if (readinessError) {
    console.error('Error fetching trial_readiness:', readinessError)
  }

  const items: LayakTrialItem[] = (readinessData || [])
    .filter((r) => {
      const u = r.users as unknown as { is_active: boolean } | null
      return u?.is_active !== false
    })
    .map((r) => {
      const u = r.users as unknown as {
        name: string
        username: string
        branch_id: number | null
        branches: { name: string } | null
      } | null

      return {
        id: r.id,
        traineeId: r.trainee_id,
        traineeName: u?.name || 'Trainee',
        traineeUsername: u?.username || '',
        branchId: u?.branch_id || null,
        branchName: u?.branches?.name || 'Semua Cabang',
        level: r.level,
        changedAt: r.changed_at,
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
        <LayakTrialListClient
          initialItems={items}
          branches={branches}
        />
      </main>
    </div>
  )
}

