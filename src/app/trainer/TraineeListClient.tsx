'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { resetTraineePasswordAction, setTraineeActiveAction } from './actions'
import { ProgramLevel, TermStatus } from '@/types/database'
import { STATUS_LABELS, STATUS_STYLES } from '@/lib/constants'
import {
  Search,
  Filter,
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
} from 'lucide-react'

export type TraineeSummary = {
  id: string
  name: string
  username: string
  level: ProgramLevel | null
  branchId: number | null
  branchName: string
  is_active: boolean
  created_at: string
  activeTerm: {
    traineeTermId: number
    termId: number
    termName: string
    sortOrder: number
    status: TermStatus
    clearedToTeach: boolean
    studiedLessonsCount: number
    totalLessonsCount: number
  } | null
  completedTermsCount: number
  clearedTermsCount?: number
}

export type BranchSummary = {
  branchId: number
  branchName: string
  activeTraineesCount: number
  readyForCheckCount: number
  clearedTermsCount: number
}

interface TraineeListClientProps {
  trainees: TraineeSummary[]
  branches: Array<{ id: number; name: string }>
  branchSummaries: BranchSummary[]
  initialCabang?: string
}

export function TraineeListClient({
  trainees,
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

  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | 'kinder' | 'junior'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | TermStatus>('all')

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

  // Filter queue for Ready for Check (respects selected branch filter)
  const readyForCheckQueue = trainees.filter(
    (t) =>
      t.is_active &&
      t.activeTerm?.status === 'ready_for_check' &&
      (selectedBranch === 'all' || t.branchId === selectedBranch)
  )

  // Filtered trainees list (combines search, level, status, branch)
  const filteredTrainees = trainees.filter((t) => {
    // Search by name or username
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.username.toLowerCase().includes(search.toLowerCase())

    // Filter by level
    const matchesLevel = levelFilter === 'all' || t.level === levelFilter

    // Filter by status
    const matchesStatus =
      statusFilter === 'all' || t.activeTerm?.status === statusFilter

    // Filter by branch
    const matchesBranch =
      selectedBranch === 'all' || t.branchId === selectedBranch

    return matchesSearch && matchesLevel && matchesStatus && matchesBranch
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
        setResetSuccess(res.message || 'Kata sandi berhasil diperbarui.')
        setTimeout(() => {
          setResetModalUser(null)
          setNewPassword('')
          setResetSuccess(null)
        }, 1500)
      }
    })
  }

  const handleToggleActive = (trainee: TraineeSummary) => {
    const actionName = trainee.is_active ? 'menonaktifkan' : 'mengaktifkan kembali'
    if (
      !confirm(
        `Apakah Anda yakin ingin ${actionName} akun @${trainee.username} (${trainee.name})?`
      )
    ) {
      return
    }

    setActiveToggleId(trainee.id)
    startToggleTransition(async () => {
      await setTraineeActiveAction(trainee.id, !trainee.is_active)
      setActiveToggleId(null)
    })
  }

  const selectedBranchName =
    selectedBranch === 'all'
      ? 'Semua Cabang'
      : branches.find((b) => b.id === selectedBranch)?.name || 'Cabang Terpilih'

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Monitoring &amp; Manajemen Trainee
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Filter Cabang: <strong className="text-slate-700 dark:text-slate-300">{selectedBranchName}</strong>{' '}
            • Menampilkan: {filteredTrainees.length} dari {trainees.length} Trainee
          </p>
        </div>

        <Link
          id="btn-register-new-trainee"
          href="/trainer/trainees/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md hover:shadow-indigo-500/25 transition-all shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Daftarkan Trainee Baru</span>
        </Link>
      </div>

      {/* Ringkasan per Cabang (Satu kartu per cabang, klik kartu = filter cabang) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {branchSummaries.map((summary) => {
          const isSelected = selectedBranch === summary.branchId
          return (
            <div
              key={summary.branchId}
              onClick={() => handleBranchSelect(summary.branchId)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer select-none group shadow-sm ${
                isSelected
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-100 group-hover:text-indigo-600 dark:group-hover:bg-indigo-950/60 dark:group-hover:text-indigo-400'
                    }`}
                  >
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{summary.branchName}</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {isSelected ? 'Filter Aktif Terpilih' : 'Klik kartu untuk filter cabang ini'}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
                    Dipilih
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                    Trainee Aktif
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {summary.activeTraineesCount}
                  </span>
                </div>

                <div
                  className={`p-2.5 rounded-xl border ${
                    summary.readyForCheckCount > 0
                      ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                      : 'bg-white/80 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 text-slate-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    {summary.readyForCheckCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Ready for Check
                    </span>
                  </div>
                  <span
                    className={`text-lg font-bold ${
                      summary.readyForCheckCount > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {summary.readyForCheckCount}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                    Layak Mengajar
                  </span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {summary.clearedTermsCount}{' '}
                    <span className="text-xs font-normal text-slate-400">Term</span>
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* HIGHLIGHT: Antrean Ready for Check */}
      {readyForCheckQueue.length > 0 && (
        <section
          id="ready-for-check-queue-section"
          className="rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span>
                Antrean Ready for Check ({readyForCheckQueue.length})
                {selectedBranch !== 'all' && ` - Cabang ${selectedBranchName}`}
              </span>
            </div>
            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 hidden sm:inline">
              Membutuhkan verifikasi Understanding Check oleh Trainer
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {readyForCheckQueue.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-800/80 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                        {item.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono">@{item.username}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {item.level}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                        <MapPin className="w-2.5 h-2.5 text-indigo-500" />
                        <span>{item.branchName}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                    <span className="font-medium">{item.activeTerm?.termName}</span>
                    <span className="font-bold">10/10 Lesson</span>
                  </div>
                </div>

                <Link
                  href={`/trainer/trainees/${item.id}`}
                  className="mt-3.5 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>Mulai Verifikasi</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters & Search Controls */}
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

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
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

          {/* Level Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-400 font-medium pl-1">Level:</span>
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setLevelFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  levelFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setLevelFilter('kinder')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  levelFilter === 'kinder'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Kinder
              </button>
              <button
                onClick={() => setLevelFilter('junior')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  levelFilter === 'junior'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Junior
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 font-medium mr-1">Status Term:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-semibold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Semua
          </button>
          {(
            [
              'in_self_training',
              'ready_for_check',
              'understanding_check',
              'need_review',
              'ready_for_trial',
            ] as TermStatus[]
          ).map((status) => {
            const style = STATUS_STYLES[status]
            const active = statusFilter === status
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-lg transition-colors border ${
                  active
                    ? `${style.bg} ${style.text} ${style.border} font-bold ring-1 ring-current`
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-200'
                }`}
              >
                {STATUS_LABELS[status]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Trainees Table / Cards */}
      {filteredTrainees.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {trainees.length === 0
              ? 'Belum ada trainee yang terdaftar.'
              : selectedBranch !== 'all'
              ? `Tidak ada trainee di cabang ${selectedBranchName} yang cocok dengan filter.`
              : 'Tidak ada trainee yang cocok dengan kriteria filter.'}
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
                  <th className="py-3.5 px-4">Trainee</th>
                  <th className="py-3.5 px-4">Cabang</th>
                  <th className="py-3.5 px-4">Level</th>
                  <th className="py-3.5 px-4">Term Aktif &amp; Status</th>
                  <th className="py-3.5 px-4">Progres Lesson</th>
                  <th className="py-3.5 px-4">Akun</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTrainees.map((trainee) => {
                  const activeTerm = trainee.activeTerm
                  const statusStyle = activeTerm ? STATUS_STYLES[activeTerm.status] : null

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
                            <Link
                              href={`/trainer/trainees/${trainee.id}`}
                              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                              title="Tetapkan cabang di halaman detail"
                            >
                              Pindah
                            </Link>
                          </div>
                        )}
                      </td>

                      {/* Level */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {trainee.level || '-'}
                        </span>
                      </td>

                      {/* Active Term & Status */}
                      <td className="py-3.5 px-4">
                        {activeTerm ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {activeTerm.termName}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                statusStyle ? `${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}` : ''
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${statusStyle?.dot || 'bg-slate-400'}`}
                              />
                              <span>{STATUS_LABELS[activeTerm.status]}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Belum ada</span>
                        )}
                      </td>

                      {/* Progress */}
                      <td className="py-3.5 px-4">
                        {activeTerm ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {activeTerm.studiedLessonsCount} / {activeTerm.totalLessonsCount}
                              </span>
                              <span className="text-[10px] text-slate-400">Lesson</span>
                            </div>
                            <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full transition-all"
                                style={{
                                  width: `${(activeTerm.studiedLessonsCount / activeTerm.totalLessonsCount) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
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
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                            title="Buka Detail"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          {/* Reset Password Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setResetModalUser(trainee)
                              setNewPassword('')
                              setResetError(null)
                              setResetSuccess(null)
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 transition-colors cursor-pointer"
                            title="Reset Kata Sandi"
                          >
                            <Lock className="w-4 h-4" />
                          </button>

                          {/* Toggle Active Button */}
                          <button
                            type="button"
                            disabled={isToggling && activeToggleId === trainee.id}
                            onClick={() => handleToggleActive(trainee)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              trainee.is_active
                                ? 'border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600'
                                : 'border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600'
                            }`}
                            title={trainee.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                          >
                            {isToggling && activeToggleId === trainee.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : trainee.is_active ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
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

      {/* MODAL: Reset Password */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Reset Kata Sandi
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    @{resetModalUser.username} ({resetModalUser.name})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="modalNewPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Kata Sandi Baru (Minimal 8 karakter)
              </label>
              <div className="relative">
                <input
                  id="modalNewPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru..."
                  className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isResetting || !newPassword}
                onClick={handleResetPassword}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Kata Sandi</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
