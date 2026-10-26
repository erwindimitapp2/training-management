'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { resetTraineePasswordAction, setTraineeActiveAction } from './actions'
import { ProgramLevel, TermStatus } from '@/types/database'
import { STATUS_LABELS, STATUS_STYLES, GOLD_BADGE_STYLE } from '@/lib/constants'
import {
  Search,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Loader2,
  X,
  ShieldAlert,
  MapPin,
  Building2,
  Award,
  Sparkles,
  Layers,
} from 'lucide-react'

export type TraineeSummary = {
  id: string
  name: string
  username: string
  branchId: number | null
  branchName: string
  is_active: boolean
  created_at: string
  kinderLessonsStudied: number
  juniorLessonsStudied: number
  readyForTrialCount: number
  clearedTermsCount: number
}

export type ReadyForCheckQueueItem = {
  traineeTermId: number
  traineeId: string
  traineeName: string
  username: string
  branchId: number | null
  branchName: string
  termId: number
  termName: string
  level: ProgramLevel
  sortOrder: number
}

export type BranchSummary = {
  branchId: number
  branchName: string
  activeTraineesCount: number
  readyForCheckCount: number
  readyForTrialCount: number
  clearedTermsCount: number
}

interface TraineeListClientProps {
  trainees: TraineeSummary[]
  readyForCheckQueue: ReadyForCheckQueueItem[]
  branches: Array<{ id: number; name: string }>
  branchSummaries: BranchSummary[]
  initialCabang?: string
}

export function TraineeListClient({
  trainees,
  readyForCheckQueue,
  branches,
  branchSummaries,
  initialCabang,
}: TraineeListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const currentCabangParam = searchParams.get('cabang') ?? initialCabang

  // Derived selected branch: 'all' | number
  const selectedBranch: 'all' | number = (() => {
    if (!currentCabangParam || currentCabangParam === 'all') return 'all'
    const parsed = parseInt(currentCabangParam, 10)
    if (!isNaN(parsed) && branches.some((b) => b.id === parsed)) {
      return parsed
    }
    return 'all'
  })()

  const handleBranchSelect = (branch: 'all' | number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (branch === 'all') {
      params.delete('cabang')
    } else {
      params.set('cabang', String(branch))
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // Trainee search filter
  const [search, setSearch] = useState('')

  // Queue Level Filter (Semua / Kinder / Junior)
  const [queueLevelFilter, setQueueLevelFilter] = useState<'all' | 'kinder' | 'junior'>('all')

  // Password reset modal state
  const [resetModalUser, setResetModalUser] = useState<TraineeSummary | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [isResetting, startResetTransition] = useTransition()

  // Toggle active state
  const [activeToggleId, setActiveToggleId] = useState<string | null>(null)
  const [isToggling, startToggleTransition] = useTransition()

  // Filter queue for Ready for Check (respects selected branch & queue level filter)
  const filteredQueue = readyForCheckQueue.filter((item) => {
    const matchesBranch = selectedBranch === 'all' || item.branchId === selectedBranch
    const matchesLevel = queueLevelFilter === 'all' || item.level === queueLevelFilter
    return matchesBranch && matchesLevel
  })

  // Filtered trainees list (combines search and branch, NO level filter per prompt)
  const filteredTrainees = trainees.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.username.toLowerCase().includes(search.toLowerCase())

    const matchesBranch = selectedBranch === 'all' || t.branchId === selectedBranch

    return matchesSearch && matchesBranch
  })

  const handleResetPassword = () => {
    if (!resetModalUser) return
    if (newPassword.length < 8) {
      setResetError('Kata sandi minimal 8 karakter.')
      return
    }

    setResetError(null)
    setResetSuccess(null)

    startResetTransition(async () => {
      const res = await resetTraineePasswordAction(resetModalUser.id, newPassword)
      if (res.error) {
        setResetError(res.error)
      } else {
        setResetSuccess(
          `Kata sandi untuk @${resetModalUser.username} (${resetModalUser.name}) berhasil diperbarui!`
        )
        setNewPassword('')
      }
    })
  }

  const handleToggleActive = (trainee: TraineeSummary) => {
    setActiveToggleId(trainee.id)
    startToggleTransition(async () => {
      await setTraineeActiveAction(trainee.id, !trainee.is_active)
      setActiveToggleId(null)
    })
  }

  const selectedBranchName =
    selectedBranch === 'all'
      ? 'Semua Cabang'
      : branches.find((b) => b.id === selectedBranch)?.name || 'Cabang'

  return (
    <div className="space-y-8">
      {/* Header & New Trainee Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Dashboard Trainer
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              Trainer Mode
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola verifikasi ceklis dan sesi observasi mengajar di semua level dan cabang.
          </p>
        </div>

        <Link
          href="/trainer/trainees/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Daftarkan Trainee Baru</span>
        </Link>
      </div>

      {/* Branch Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branchSummaries.map((summary) => {
          const isSelected = selectedBranch === summary.branchId

          return (
            <div
              key={summary.branchId}
              onClick={() =>
                handleBranchSelect(isSelected ? 'all' : summary.branchId)
              }
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                isSelected
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {summary.branchName}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {summary.activeTraineesCount} Trainee Aktif
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
                    Dipilih
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div
                  className={`p-2 rounded-xl border ${
                    summary.readyForCheckCount > 0
                      ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 text-slate-900 dark:text-white'
                  }`}
                >
                  <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                    Ready for Check
                  </span>
                  <span
                    className={`text-base font-bold ${
                      summary.readyForCheckCount > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {summary.readyForCheckCount}{' '}
                    <span className="text-[10px] font-normal text-slate-400">Term</span>
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                    Ready for Trial
                  </span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {summary.readyForTrialCount}{' '}
                    <span className="text-[10px] font-normal text-slate-400">Term</span>
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                    Layak Mengajar
                  </span>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                    {summary.clearedTermsCount}{' '}
                    <span className="text-[10px] font-normal text-slate-400">Term</span>
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* HIGHLIGHT: Antrean Ready for Check (Per Term) */}
      <section
        id="ready-for-check-queue-section"
        className="rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 p-5 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>
              Antrean Ready for Check ({filteredQueue.length} Term)
              {selectedBranch !== 'all' && ` • Cabang ${selectedBranchName}`}
            </span>
          </div>

          {/* Level Filter Khusus Antrean Ready for Check */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
            <span className="text-amber-900 dark:text-amber-200 font-medium">Filter Level:</span>
            <div className="inline-flex rounded-xl bg-white/80 dark:bg-slate-900/80 p-0.5 border border-amber-300 dark:border-amber-700">
              <button
                type="button"
                onClick={() => setQueueLevelFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  queueLevelFilter === 'all'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setQueueLevelFilter('kinder')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  queueLevelFilter === 'kinder'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                }`}
              >
                Kinder
              </button>
              <button
                type="button"
                onClick={() => setQueueLevelFilter('junior')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  queueLevelFilter === 'junior'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                }`}
              >
                Junior
              </button>
            </div>
          </div>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-white/60 dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-800/40">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Tidak ada antrean Ready for Check saat ini
              {queueLevelFilter !== 'all' ? ` untuk level ${queueLevelFilter}` : ''}
              {selectedBranch !== 'all' ? ` di cabang ${selectedBranchName}` : ''}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredQueue.map((item) => (
              <div
                key={item.traineeTermId}
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-800/80 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                        {item.traineeName}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono">@{item.username}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          item.level === 'kinder'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        }`}
                      >
                        {item.level}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                        <MapPin className="w-2.5 h-2.5 text-indigo-500" />
                        <span>{item.branchName}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                    <span className="font-semibold">
                      <span className="capitalize">{item.level}</span> · {item.termName}
                    </span>
                    <span className="font-bold">10/10 Lesson</span>
                  </div>
                </div>

                <Link
                  href={`/trainer/trainees/${item.traineeId}`}
                  className="mt-3.5 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>Mulai Verifikasi</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Filters & Search Controls (Level filter on trainees is REMOVED per prompt) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* Cabang Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium mr-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>Cabang:</span>
          </div>
          <button
            onClick={() => handleBranchSelect('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              selectedBranch === 'all'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Semua Cabang ({trainees.length})
          </button>
          {branches.map((b) => {
            const count = trainees.filter((t) => t.branchId === b.id).length
            return (
              <button
                key={b.id}
                onClick={() => handleBranchSelect(b.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                  selectedBranch === b.id
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {b.name} ({count})
              </button>
            )
          })}
          {trainees.some((t) => !t.branchId) && (
            <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-medium">
              Tanpa cabang: {trainees.filter((t) => !t.branchId).length}
            </span>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau username trainee..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Trainees Table */}
      {filteredTrainees.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {trainees.length === 0
              ? 'Belum ada trainee yang terdaftar.'
              : selectedBranch !== 'all'
              ? `Tidak ada trainee di cabang ${selectedBranchName} yang cocok dengan pencarian.`
              : 'Tidak ada trainee yang cocok dengan kriteria pencarian.'}
          </p>
          {trainees.length === 0 && (
            <Link
              href="/trainer/trainees/new"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700"
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftarkan Trainee Pertama</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Nama Trainee</th>
                  <th className="py-3.5 px-4">Cabang</th>
                  <th className="py-3.5 px-4">Progress Kinder</th>
                  <th className="py-3.5 px-4">Progress Junior</th>
                  <th className="py-3.5 px-4">Ready for Trial</th>
                  <th className="py-3.5 px-4">Layak Mengajar</th>
                  <th className="py-3.5 px-4">Akun</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTrainees.map((trainee) => {
                  const kinderPercent = Math.round((trainee.kinderLessonsStudied / 60) * 100)
                  const juniorPercent = Math.round((trainee.juniorLessonsStudied / 60) * 100)

                  return (
                    <tr
                      key={trainee.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        !trainee.is_active ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/40' : ''
                      }`}
                    >
                      {/* Trainee Name & Username */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <Link
                            href={`/trainer/trainees/${trainee.id}`}
                            className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm"
                          >
                            {trainee.name}
                          </Link>
                          <span className="font-mono text-slate-400 text-[11px]">
                            @{trainee.username}
                          </span>
                        </div>
                      </td>

                      {/* Cabang */}
                      <td className="py-3.5 px-4">
                        {trainee.branchId ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>{trainee.branchName}</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Tanpa cabang
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Progress Kinder (x/60) */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {trainee.kinderLessonsStudied} / 60
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({kinderPercent}%)
                            </span>
                          </div>
                          <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all"
                              style={{ width: `${kinderPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Progress Junior (x/60) */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {trainee.juniorLessonsStudied} / 60
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({juniorPercent}%)
                            </span>
                          </div>
                          <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full transition-all"
                              style={{ width: `${juniorPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Ready for Trial count */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            trainee.readyForTrialCount > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              : 'text-slate-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{trainee.readyForTrialCount} Term</span>
                        </span>
                      </td>

                      {/* Layak Mengajar count */}
                      <td className="py-3.5 px-4">
                        {trainee.clearedTermsCount > 0 ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${GOLD_BADGE_STYLE.bg}`}
                          >
                            <Award className="w-3 h-3 text-amber-500" />
                            <span>{trainee.clearedTermsCount} Term</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 pl-2">0 Term</span>
                        )}
                      </td>

                      {/* Active / Inactive Status */}
                      <td className="py-3.5 px-4">
                        {trainee.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/trainer/trainees/${trainee.id}`}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                            title="Buka detail evaluasi trainee"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setResetModalUser(trainee)
                              setNewPassword('')
                              setResetError(null)
                              setResetSuccess(null)
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                            title="Reset Kata Sandi"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={isToggling && activeToggleId === trainee.id}
                            onClick={() => handleToggleActive(trainee)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              trainee.is_active
                                ? 'border-rose-200 dark:border-rose-800/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                : 'border-emerald-200 dark:border-emerald-800/60 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                            title={trainee.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                          >
                            {isToggling && activeToggleId === trainee.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : trainee.is_active ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Reset Kata Sandi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ubah kata sandi login untuk <strong>{resetModalUser.name}</strong> (@
              {resetModalUser.username}). Trainee dapat menggunakan kata sandi baru ini segera.
            </p>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {!resetSuccess && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Kata sandi baru (min. 8 karakter)..."
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {resetSuccess ? 'Tutup' : 'Batal'}
              </button>

              {!resetSuccess && (
                <button
                  type="button"
                  disabled={isResetting || newPassword.length < 8}
                  onClick={handleResetPassword}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isResetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Kata Sandi</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
