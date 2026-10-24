import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import { TermChecklistClient } from './TermChecklistClient'
import { TermStatus } from '@/types/database'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ termId: string }>
}

export default async function TraineeTermPage({ params }: PageProps) {
  const { termId } = await params
  const termIdNum = parseInt(termId, 10)

  if (isNaN(termIdNum)) {
    redirect('/dashboard')
  }

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

    // 2. Fetch master term
    const { data: termData, error: termError } = await supabase
      .from('terms')
      .select('id, name, sort_order, level')
      .eq('id', termIdNum)
      .single()

    if (termError || !termData) {
      redirect('/dashboard')
    }

    // Verify term matches trainee's level
    if (termData.level !== profile.level) {
      redirect('/dashboard')
    }

    // 3. Verify trainee has unlocked this term
    const { data: traineeTermData, error: ttError } = await supabase
      .from('trainee_terms')
      .select('id, status, cleared_to_teach, completed_at, updated_at')
      .eq('trainee_id', user.id)
      .eq('term_id', termIdNum)
      .maybeSingle()

    // If term has no row in trainee_terms, it is locked!
    if (ttError || !traineeTermData) {
      redirect('/dashboard')
    }

    // 4. Fetch 10 lessons for this term
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, lesson_number, title')
      .eq('term_id', termIdNum)
      .order('lesson_number', { ascending: true })

    if (lessonsError || !lessonsData) {
      console.error('Error fetching lessons:', lessonsError)
      redirect('/dashboard')
    }

    // 5. Fetch trainee_lessons for this trainee
    const lessonIds = lessonsData.map((l) => l.id)
    const { data: studiedData } = await supabase
      .from('trainee_lessons')
      .select('lesson_id, studied, studied_at')
      .eq('trainee_id', user.id)
      .in('lesson_id', lessonIds)

    const studiedMap = new Map<number, { studied: boolean; studiedAt: string | null }>()
    if (studiedData) {
      studiedData.forEach((s) => {
        studiedMap.set(s.lesson_id, {
          studied: s.studied,
          studiedAt: s.studied_at,
        })
      })
    }

    const initialLessons = lessonsData.map((l) => {
      const studiedInfo = studiedMap.get(l.id)
      return {
        id: l.id,
        lessonNumber: l.lesson_number,
        title: l.title,
        studied: studiedInfo?.studied || false,
        studiedAt: studiedInfo?.studiedAt || null,
      }
    })

    // 6. Fetch status_history for this trainee_terms row
    const { data: historyData } = await supabase
      .from('status_history')
      .select('id, from_status, to_status, note, changed_at, users(name)')
      .eq('trainee_term_id', traineeTermData.id)
      .order('changed_at', { ascending: false })

    const history = (historyData || []).map((h) => ({
      id: h.id,
      fromStatus: h.from_status,
      toStatus: h.to_status,
      note: h.note,
      changedAt: h.changed_at || '',
      changedByName: (h.users as unknown as { name: string } | null)?.name || 'Trainer',
    }))

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

        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <TermChecklistClient
            term={{
              id: termData.id,
              name: termData.name,
              sortOrder: termData.sort_order,
              level: termData.level,
            }}
            traineeTerm={{
              id: traineeTermData.id,
              status: traineeTermData.status as TermStatus,
              clearedToTeach: traineeTermData.cleared_to_teach,
              completedAt: traineeTermData.completed_at,
              updatedAt: traineeTermData.updated_at || '',
            }}
            initialLessons={initialLessons}
            history={history}
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
      (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error
    }
    console.error('Error on TraineeTermPage:', error)
    redirect('/dashboard')
  }
}
