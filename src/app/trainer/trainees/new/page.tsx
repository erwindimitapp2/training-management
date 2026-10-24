import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import { RegisterTraineeForm } from './RegisterTraineeForm'
import Link from 'next/link'
import { ArrowLeft, UserPlus, MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RegisterTraineePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, username, role, branch_id, is_active, branches(name)')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active || profile.role !== 'trainer') {
    redirect('/dashboard')
  }

  const branchName =
    (profile.branches as unknown as { name: string } | null)?.name || 'Cabang Belum Ditentukan'

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

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Back Link & Header */}
        <div className="mb-6">
          <Link
            href="/trainer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Trainee</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <span>Pendaftaran Trainee Baru</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Daftarkan calon pengajar baru. Akun akan langsung memiliki akses ke Term pertama.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0 self-start sm:self-center">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Cabang: <strong>{branchName}</strong></span>
            </div>
          </div>
        </div>

        {/* Client Form Component */}
        <RegisterTraineeForm branchName={branchName} />
      </main>
    </div>
  )
}
