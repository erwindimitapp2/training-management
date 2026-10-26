'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  resetTraineePasswordAction,
  setTraineeActiveAction,
  changeTermStatusAction,
  TermStatusAction,
  recordObservationAction,
  changeTraineeBranchAction,
} from '@/app/trainer/actions'
import { ProgramLevel, TermStatus, ObservationResult } from '@/types/database'
import { STATUS_LABELS, STATUS_STYLES, GOLD_BADGE_STYLE } from '@/lib/constants'
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  UserX,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Calendar,
  FileText,
  KeyRound,
  ShieldAlert,
  PlayCircle,
  RotateCcw,
  Sparkles,
  MessageSquare,
  AlertCircle,
  GraduationCap,
  Star,
  Building2,
  MapPin,
} from 'lucide-react'

export interface TermDetail {
  termId: number
  name: string
  sortOrder: number
  level: ProgramLevel
  traineeTerm: {
    id: number
    status: TermStatus
    clearedToTeach: boolean
    completedAt: string | null
    updatedAt: string
  } | null
  lessons: Array<{
    id: number
    lessonNumber: number
    title: string | null
    studied: boolean
    studiedAt: string | null
  }>
  history: Array<{
    id: number
    fromStatus: string | null
    toStatus: string
    note: string | null
    changedAt: string
    changedByName: string
  }>
  observations: Array<{
    id: number
    sessionDate: string
    scorePreparation: number
    scoreDelivery: number
    scoreMastery: number
    scoreVisual: number
    scoreEngagement: number
    result: ObservationResult
    notes: string | null
    trainerName: string
  }>
}

interface TraineeDetailClientProps {
  trainee: {
    id: string
    name: string
    username: string
    level: ProgramLevel | null
    branchId: number | null
    branchName: string
    isActive: boolean
    createdAt: string
  }
  branches: Array<{ id: number; name: string }>
  terms: TermDetail[]
}

export function TraineeDetailClient({ trainee, branches, terms }: TraineeDetailClientProps) {
  const [isActive, setIsActive] = useState(trainee.isActive)
  const [branchName, setBranchName] = useState(trainee.branchName)
  const [branchId, setBranchId] = useState<number | null>(trainee.branchId)

  // Branch change modal state
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false)
  const [targetBranchId, setTargetBranchId] = useState<number>(
    branches.find((b) => b.id !== trainee.branchId)?.id || branches[0]?.id || 1
  )
  const [branchError, setBranchError] = useState<string | null>(null)
  const [branchSuccess, setBranchSuccess] = useState<string | null>(null)
  const [isChangingBranch, startBranchTransition] = useTransition()

  // Reset password state
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [isResetting, startResetTransition] = useTransition()

  // Toggle active transition
  const [isToggling, startToggleTransition] = useTransition()

  // Status verification action modal state
  const [activeStatusModal, setActiveStatusModal] = useState<{
    action: TermStatusAction
    traineeTermId: number
    termName: string
    sortOrder: number
  } | null>(null)
  const [statusNote, setStatusNote] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [isSubmittingAction, startActionTransition] = useTransition()

  // Expandable terms - prioritized to term that needs trainer attention
  const [expandedTermId, setExpandedTermId] = useState<number | null>(
    terms.find(
      (t) =>
        t.traineeTerm?.status === 'ready_for_check' ||
        t.traineeTerm?.status === 'understanding_check'
    )?.termId ||
      terms.find((t) => t.traineeTerm && t.traineeTerm.status !== 'ready_for_trial')?.termId ||
      terms[0]?.termId ||
      null
  )

  const handleStatusAction = () => {
    if (!activeStatusModal) return

    if (activeStatusModal.action === 'need_review' && !statusNote.trim()) {
      setActionError('Catatan evaluasi wajib diisi untuk tindakan Need Review.')
      return
    }

    setActionError(null)
    setActionSuccess(null)

    startActionTransition(async () => {
      const res = await changeTermStatusAction(
        activeStatusModal.traineeTermId,
        activeStatusModal.action,
        trainee.id,
        statusNote.trim()
      )

      if (res.error) {
        setActionError(res.error)
      } else {
        setActionSuccess(res.message || 'Status term berhasil diperbarui.')
        setActiveStatusModal(null)
        setStatusNote('')
        setTimeout(() => setActionSuccess(null), 3500)
      }
    })
  }

  // Observation scoring modal state
  const [observationModal, setObservationModal] = useState<{
    termId: number
    termName: string
    sortOrder: number
  } | null>(null)
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0])
  const [scorePreparation, setScorePreparation] = useState(5)
  const [scoreDelivery, setScoreDelivery] = useState(5)
  const [scoreMastery, setScoreMastery] = useState(5)
  const [scoreVisual, setScoreVisual] = useState(5)
  const [scoreEngagement, setScoreEngagement] = useState(5)
  const [obsResult, setObsResult] = useState<'pass' | 'retry'>('pass')
  const [obsNotes, setObsNotes] = useState('')
  const [isSubmittingObs, startObsTransition] = useTransition()

  const handleOpenObservationModal = (termId: number, termName: string, sortOrder: number) => {
    setObservationModal({ termId, termName, sortOrder })
    setSessionDate(new Date().toISOString().split('T')[0])
    setScorePreparation(5)
    setScoreDelivery(5)
    setScoreMastery(5)
    setScoreVisual(5)
    setScoreEngagement(5)
    setObsResult('pass')
    setObsNotes('')
    setActionError(null)
  }

  const handleSubmitObservation = () => {
    if (!observationModal) return

    setActionError(null)
    setActionSuccess(null)

    startObsTransition(async () => {
      const res = await recordObservationAction({
        traineeId: trainee.id,
        termId: observationModal.termId,
        sessionDate,
        scorePreparation,
        scoreDelivery,
        scoreMastery,
        scoreVisual,
        scoreEngagement,
        result: obsResult,
        notes: obsNotes,
      })

      if (res.error) {
        setActionError(res.error)
      } else {
        setActionSuccess(res.message || 'Hasil observasi berhasil disimpan.')
        setObservationModal(null)
        setTimeout(() => setActionSuccess(null), 4000)
      }
    })
  }

  const handleResetPassword = () => {
    if (newPassword.length < 8) {
      setResetError('Kata sandi minimal 8 karakter.')
      return
    }

    setResetError(null)
    setResetSuccess(null)

    startResetTransition(async () => {
      const res = await resetTraineePasswordAction(trainee.id, newPassword)
      if (res.error) {
        setResetError(res.error)
      } else {
        setResetSuccess(res.message || 'Kata sandi berhasil diperbarui.')
        setTimeout(() => {
          setIsResetOpen(false)
          setNewPassword('')
          setResetSuccess(null)
        }, 1500)
      }
    })
  }

  const handleChangeBranch = () => {
    if (!targetBranchId) return
    const targetBranch = branches.find((b) => b.id === targetBranchId)
    if (!targetBranch) return

    setBranchError(null)
    setBranchSuccess(null)

    startBranchTransition(async () => {
      const res = await changeTraineeBranchAction(trainee.id, targetBranchId)
      if (res.error) {
        setBranchError(res.error)
      } else {
        setBranchName(targetBranch.name)
        setBranchId(targetBranchId)
        setBranchSuccess(res.message || 'Cabang berhasil dipindahkan.')
        setTimeout(() => {
          setIsBranchModalOpen(false)
          setBranchSuccess(null)
        }, 1200)
      }
    })
  }

  const handleToggleActive = () => {
    const actionName = isActive ? 'menonaktifkan' : 'mengaktifkan kembali'
    if (
      !confirm(
        `Apakah Anda yakin ingin ${actionName} akun trainee @${trainee.username} (${trainee.name})?`
      )
    ) {
      return
    }

    startToggleTransition(async () => {
      const res = await setTraineeActiveAction(trainee.id, !isActive)
      if (res.success) {
        setIsActive(!isActive)
      } else if (res.error) {
        alert(res.error)
      }
    })
  }

  // Calculate overall stats
  const totalLessonsStudied = terms.reduce(
    (acc, t) => acc + t.lessons.filter((l) => l.studied).length,
    0
  )
  const totalTermsCompleted = terms.filter(
    (t) => t.traineeTerm?.status === 'ready_for_trial'
  ).length

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/trainer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Trainee</span>
        </Link>
      </div>

      {/* Global Action Alerts */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Terjadi Kesalahan:</span>
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-rose-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Berhasil:</span>
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-400 hover:text-emerald-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Trainee Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {trainee.name}
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                @{trainee.username}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                {trainee.level} Level
              </span>
              {isActive ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  Aktif
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
                  Nonaktif
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                <span>Cabang:</span>
                {branchName === 'Tanpa cabang' || !branchId ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    Tanpa cabang
                  </span>
                ) : (
                  <strong className="text-slate-700 dark:text-slate-200">{branchName}</strong>
                )}
              </div>
              <span>•</span>
              <span>
                Terdaftar:{' '}
                {new Date(trainee.createdAt).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            {/* Pindah Cabang Button */}
            <button
              id="btn-open-change-branch"
              type="button"
              onClick={() => {
                setIsBranchModalOpen(true)
                setBranchError(null)
                setBranchSuccess(null)
                setTargetBranchId(
                  branches.find((b) => b.id !== branchId)?.id || branches[0]?.id || 1
                )
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Pindah Cabang</span>
            </button>

            {/* Reset Password Button */}
            <button
              id="btn-open-reset-password"
              type="button"
              onClick={() => {
                setIsResetOpen(true)
                setNewPassword('')
                setResetError(null)
                setResetSuccess(null)
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>Reset Password</span>
            </button>

            {/* Toggle Active Button */}
            <button
              id="btn-toggle-active-status"
              type="button"
              disabled={isToggling}
              onClick={handleToggleActive}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'border-rose-200 dark:border-rose-800/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                  : 'border-emerald-200 dark:border-emerald-800/60 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
            >
              {isToggling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isActive ? (
                <UserX className="w-3.5 h-3.5" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
              <span>{isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
            </button>
          </div>
        </div>

        {/* Tanpa Cabang Warning Box */}
        {(!branchId || branchName === 'Tanpa cabang') && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Trainee ini belum memiliki cabang penempatan. Silakan tetapkan cabang sekarang.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsBranchModalOpen(true)
                setBranchError(null)
                setBranchSuccess(null)
              }}
              className="self-start sm:self-auto px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer"
            >
              Pindah / Tetapkan Cabang
            </button>
          </div>
        )}

        {/* Quick summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <span className="text-slate-400 block mb-0.5">Total Term Selesai</span>
            <span className="text-base font-bold text-slate-800 dark:text-slate-200">
              {totalTermsCompleted} / {terms.length} Term
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <span className="text-slate-400 block mb-0.5">Lesson Dipelajari</span>
            <span className="text-base font-bold text-slate-800 dark:text-slate-200">
              {totalLessonsStudied} / {terms.length * 10} Lesson
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <span className="text-slate-400 block mb-0.5">Status Observasi</span>
            <span className="text-base font-bold text-slate-800 dark:text-slate-200">
              {terms.filter((t) => t.traineeTerm?.clearedToTeach).length} Term Layak
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <span className="text-slate-400 block mb-0.5">Progres Keseluruhan</span>
            <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
              {Math.round((totalLessonsStudied / (terms.length * 10)) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* 6 Terms List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center justify-between">
          <span>Progres &amp; Ceklis Lesson per Term</span>
          <span className="text-xs font-normal text-slate-400">
            Klik kartu untuk melihat detail ceklis
          </span>
        </h2>

        {terms.map((term) => {
          const isUnlocked = term.traineeTerm !== null
          const isExpanded = expandedTermId === term.termId
          const status = term.traineeTerm?.status
          const statusStyle = status ? STATUS_STYLES[status] : null
          const studiedCount = term.lessons.filter((l) => l.studied).length
          const clearedToTeach = term.traineeTerm?.clearedToTeach

          return (
            <div
              key={term.termId}
              className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all ${
                isUnlocked
                  ? 'border-slate-200 dark:border-slate-800 shadow-xs'
                  : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/40 opacity-70'
              }`}
            >
              {/* Term Header Bar (Clickable) */}
              <div
                onClick={() => isUnlocked && setExpandedTermId(isExpanded ? null : term.termId)}
                className={`p-4 sm:p-5 flex items-center justify-between gap-3 ${
                  isUnlocked ? 'cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status Indicator Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      !isUnlocked
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        : status === 'ready_for_trial'
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                    }`}
                  >
                    {!isUnlocked ? (
                      <Lock className="w-4 h-4" />
                    ) : status === 'ready_for_trial' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span>{term.sortOrder}</span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        {term.name}
                      </h3>

                      {/* Status badge */}
                      {status && statusStyle ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          <span>{STATUS_LABELS[status]}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800">
                          <Lock className="w-3 h-3" />
                          <span>Terkunci</span>
                        </span>
                      )}

                      {/* Ready for Check attention tag */}
                      {status === 'ready_for_check' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs animate-pulse">
                          <Sparkles className="w-3 h-3" />
                          <span>Perlu Diverifikasi</span>
                        </span>
                      )}

                      {/* Understanding check in-progress tag */}
                      {status === 'understanding_check' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500 text-white shadow-xs">
                          <PlayCircle className="w-3 h-3" />
                          <span>Sedang Dicek</span>
                        </span>
                      )}

                      {/* Layak Mengajar Badge */}
                      {clearedToTeach && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${GOLD_BADGE_STYLE.bg}`}
                        >
                          <Award className="w-3 h-3 text-amber-500" />
                          <span>Layak Mengajar</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-0.5">
                      {isUnlocked
                        ? `${studiedCount} dari 10 lesson tercentang`
                        : 'Akan terbuka otomatis setelah term sebelumnya selesai'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isUnlocked && (
                    <div className="hidden sm:block text-right">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {studiedCount}/10
                      </span>
                    </div>
                  )}

                  {isUnlocked && (
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded content: Lessons & History */}
              {isUnlocked && isExpanded && (
                <div className="px-4 pb-5 sm:px-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-5 animate-in fade-in duration-150">
                  {/* TRAINER VERIFICATION PANEL */}
                  {status === 'ready_for_check' && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/70 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                              Trainee Mengajukan Ready for Check
                            </h4>
                            <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                              Seluruh 10 lesson telah diselesaikan secara mandiri. Silakan jadwalkan sesi evaluasi dan klik tombol di samping untuk memulai Understanding Check.
                            </p>
                          </div>
                        </div>

                        <button
                          id={`btn-start-check-term-${term.termId}`}
                          type="button"
                          onClick={() => {
                            setActiveStatusModal({
                              action: 'start_check',
                              traineeTermId: term.traineeTerm!.id,
                              termName: term.name,
                              sortOrder: term.sortOrder,
                            })
                            setStatusNote('')
                            setActionError(null)
                          }}
                          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold tracking-wide shadow-md hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                        >
                          <PlayCircle className="w-4 h-4" />
                          <span>Mulai Understanding Check</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {status === 'understanding_check' && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-sky-500/10 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-700/70 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <PlayCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-sky-900 dark:text-sky-200">
                              Sesi Understanding Check Sedang Berlangsung
                            </h4>
                            <p className="text-xs text-sky-800/90 dark:text-sky-300/80 mt-0.5">
                              Lakukan tanya jawab pemahaman materi {term.name}. Setelah sesi selesai, tentukan keputusan:
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                          {/* Need Review Button */}
                          <button
                            id={`btn-need-review-term-${term.termId}`}
                            type="button"
                            onClick={() => {
                              setActiveStatusModal({
                                action: 'need_review',
                                traineeTermId: term.traineeTerm!.id,
                                termName: term.name,
                                sortOrder: term.sortOrder,
                              })
                              setStatusNote('')
                              setActionError(null)
                            }}
                            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700/80 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Need Review</span>
                          </button>

                          {/* Ready for Trial Class Button */}
                          <button
                            id={`btn-ready-for-trial-term-${term.termId}`}
                            type="button"
                            onClick={() => {
                              setActiveStatusModal({
                                action: 'ready_for_trial',
                                traineeTermId: term.traineeTerm!.id,
                                termName: term.name,
                                sortOrder: term.sortOrder,
                              })
                              setStatusNote('')
                              setActionError(null)
                            }}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wide shadow-md hover:shadow-emerald-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Ready for Trial Class</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {status === 'ready_for_trial' && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-teal-500/10 border border-emerald-300 dark:border-emerald-700/60 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                              clearedToTeach ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {clearedToTeach ? (
                              <Award className="w-5 h-5" />
                            ) : (
                              <GraduationCap className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                {clearedToTeach
                                  ? 'Telah Layak Mengajar (Cleared to Teach)'
                                  : 'Term Selesai: Siap Observasi Mengajar (Trial Class)'}
                              </h4>
                              {clearedToTeach && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${GOLD_BADGE_STYLE.bg}`}
                                >
                                  <Award className="w-3 h-3 text-amber-500" />
                                  <span>Layak Mengajar</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                              {clearedToTeach
                                ? 'Trainee telah lulus sesi observasi sebagai Main Teacher dan memegang predikat Layak Mengajar untuk term ini.'
                                : 'Trainee telah menyelesaikan materi mandiri & understanding check. Lakukan sesi observasi saat trainee menjadi Main Teacher di kelas.'}
                            </p>
                          </div>
                        </div>

                        <button
                          id={`btn-open-observation-term-${term.termId}`}
                          type="button"
                          onClick={() =>
                            handleOpenObservationModal(term.termId, term.name, term.sortOrder)
                          }
                          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold tracking-wide shadow-md hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                        >
                          <Award className="w-4 h-4" />
                          <span>{clearedToTeach ? 'Input Observasi Baru' : 'Input Sesi Observasi'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {status === 'in_self_training' && term.history.length > 0 && term.history[0].toStatus === 'need_review' && (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-200">
                        <RotateCcw className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Catatan Need Review Terakhir untuk Trainee:</span>
                      </div>
                      <p className="italic pl-6">&ldquo;{term.history[0].note}&rdquo;</p>
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 pl-6">
                        Trainee sedang mempelajari ulang materi berdasarkan evaluasi di atas ({studiedCount}/10 lesson selesai).
                      </p>
                    </div>
                  )}

                  {/* Read-only Lesson Checklist */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                      Ceklis Lesson (Read-Only)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {term.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border ${
                            lesson.studied
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-slate-800 dark:text-slate-200'
                              : 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800/60 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              readOnly
                              checked={lesson.studied}
                              className="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                            />
                            <span className="font-medium">
                              Lesson {lesson.lessonNumber}: {lesson.title || `Lesson ${lesson.lessonNumber}`}
                            </span>
                          </div>

                          {lesson.studied && lesson.studiedAt ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                              {new Date(lesson.studiedAt).toLocaleDateString('id-ID', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Belum</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status History (if any) */}
                  {term.history.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Riwayat Perubahan Status
                      </h4>
                      <div className="space-y-2">
                        {term.history.map((h) => (
                          <div
                            key={h.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {STATUS_LABELS[h.toStatus as TermStatus] || h.toStatus}
                              </span>
                              {h.note && (
                                <span className="text-slate-500 italic">
                                  &ldquo;{h.note}&rdquo;
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Oleh {h.changedByName} •{' '}
                              {new Date(h.changedAt).toLocaleString('id-ID', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observation Sessions for this term */}
                  {(term.observations.length > 0 || status === 'ready_for_trial') && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Hasil Sesi Observasi Mengajar
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Evaluasi 5 kriteria saat trainee menjadi Main Teacher di kelas.
                          </p>
                        </div>

                        {status === 'ready_for_trial' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenObservationModal(term.termId, term.name, term.sortOrder)
                            }
                            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            <span>+ Input Observasi</span>
                          </button>
                        )}
                      </div>

                      {term.observations.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Belum ada sesi observasi yang diinput untuk term ini.
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenObservationModal(term.termId, term.name, term.sortOrder)
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Mulai Penilaian Observasi</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {term.observations.map((obs) => {
                            const avgScore = (
                              (obs.scorePreparation +
                                obs.scoreDelivery +
                                obs.scoreMastery +
                                obs.scoreVisual +
                                obs.scoreEngagement) /
                              5
                            ).toFixed(1)

                            return (
                              <div
                                key={obs.id}
                                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs border border-slate-200/80 dark:border-slate-700/80 space-y-2.5"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wide border ${
                                        obs.result === 'pass'
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                                          : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700'
                                      }`}
                                    >
                                      {obs.result === 'pass'
                                        ? 'Lulus (Pass) — Layak Mengajar'
                                        : 'Ulang (Retry)'}
                                    </span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      Tanggal: {obs.sessionDate}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      oleh {obs.trainerName}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-xs bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60 self-start sm:self-auto">
                                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                    <span>Rata-rata: {avgScore} / 5.0</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">
                                      Persiapan:
                                    </span>
                                    <span className="font-bold text-xs">
                                      {obs.scorePreparation} / 5
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">
                                      Penyampaian:
                                    </span>
                                    <span className="font-bold text-xs">
                                      {obs.scoreDelivery} / 5
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">
                                      Penguasaan:
                                    </span>
                                    <span className="font-bold text-xs">{obs.scoreMastery} / 5</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">
                                      Visual &amp; Media:
                                    </span>
                                    <span className="font-bold text-xs">{obs.scoreVisual} / 5</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">
                                      Interaksi:
                                    </span>
                                    <span className="font-bold text-xs">
                                      {obs.scoreEngagement} / 5
                                    </span>
                                  </div>
                                </div>

                                {obs.notes && (
                                  <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-slate-600 dark:text-slate-300 text-xs">
                                    <span className="font-semibold text-amber-900 dark:text-amber-200 block text-[10px] uppercase tracking-wider mb-0.5">
                                      Catatan Trainer:
                                    </span>
                                    <p className="italic">&ldquo;{obs.notes}&rdquo;</p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* RESET PASSWORD MODAL */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Reset Kata Sandi Trainee
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    @{trainee.username} ({trainee.name})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsResetOpen(false)}
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
                htmlFor="detailNewPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Kata Sandi Baru (Minimal 8 Karakter)
              </label>
              <div className="relative">
                <input
                  id="detailNewPassword"
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
                onClick={() => setIsResetOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>

              <button
                id="btn-confirm-reset-password"
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

      {/* STATUS VERIFICATION ACTION MODAL */}
      {activeStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    activeStatusModal.action === 'start_check'
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60'
                      : activeStatusModal.action === 'need_review'
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60'
                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60'
                  }`}
                >
                  {activeStatusModal.action === 'start_check' ? (
                    <PlayCircle className="w-5 h-5" />
                  ) : activeStatusModal.action === 'need_review' ? (
                    <RotateCcw className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {activeStatusModal.action === 'start_check'
                      ? 'Mulai Understanding Check'
                      : activeStatusModal.action === 'need_review'
                      ? 'Kembalikan ke Need Review'
                      : 'Setujui: Ready for Trial Class'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeStatusModal.termName} • Trainee: @{trainee.username} ({trainee.name})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveStatusModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error in modal */}
            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Description & inputs per action */}
            {activeStatusModal.action === 'start_check' && (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  Anda akan memulai sesi <strong>Understanding Check</strong> untuk{' '}
                  <strong>{activeStatusModal.termName}</strong>.
                </p>
                <p className="text-slate-400">
                  Status term akan berubah menjadi <strong>Understanding Check</strong>. Anda dapat melakukan sesi tanya jawab konsep materi dengan trainee secara luring atau daring.
                </p>
              </div>
            )}

            {activeStatusModal.action === 'need_review' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <p>
                    Status term akan dikembalikan ke <strong>In Self-Training</strong>. Ceklis lesson trainee akan dibuka kembali dan catatan evaluasi Anda akan ditampilkan di dashboard trainee.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="needReviewNote"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Catatan Evaluasi / Materi yang Perlu Dipelajari Ulang <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="needReviewNote"
                    rows={4}
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Tuliskan catatan detail mengenai lesson atau topik apa saja yang perlu dipelajari kembali oleh trainee..."
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Catatan ini wajib diisi dan akan tersimpan di riwayat status serta dapat dilihat oleh trainee.
                  </p>
                </div>
              </div>
            )}

            {activeStatusModal.action === 'ready_for_trial' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                  <p>
                    Trainee dinyatakan telah menguasai materi <strong>{activeStatusModal.termName}</strong> dengan baik dan siap mengikuti tahap <strong>Trial Class</strong>.
                  </p>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs">
                    Term berikutnya (Term {activeStatusModal.sortOrder + 1}) akan <strong>otomatis terbuka</strong> untuk trainee ini.
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="readyForTrialNote"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Catatan Tambahan (Opsional)
                  </label>
                  <input
                    id="readyForTrialNote"
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Contoh: Pemahaman konsep sangat baik, siap mengajar trial..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={() => setActiveStatusModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
              >
                Batal
              </button>

              <button
                id="btn-confirm-status-action"
                type="button"
                disabled={
                  isSubmittingAction ||
                  (activeStatusModal.action === 'need_review' && !statusNote.trim())
                }
                onClick={handleStatusAction}
                className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
                  activeStatusModal.action === 'start_check'
                    ? 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
                    : activeStatusModal.action === 'need_review'
                    ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400'
                    : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
                }`}
              >
                {isSubmittingAction ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>
                    {activeStatusModal.action === 'start_check'
                      ? 'Mulai Understanding Check'
                      : activeStatusModal.action === 'need_review'
                      ? 'Kirim Need Review'
                      : 'Konfirmasi Ready for Trial'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OBSERVATION SCORING MODAL */}
      {observationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-hidden animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
            {/* Modal Header (Fixed / Shrink-0) */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    Form Observasi Mengajar (Main Teacher)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    {observationModal.termName} • Trainee: @{trainee.username} ({trainee.name})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setObservationModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
                aria-label="Tutup form observasi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable / Flex-1) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* Error in modal */}
              {actionError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Session Date */}
              <div>
                <label
                  htmlFor="obs-session-date"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Tanggal Observasi Kelas <span className="text-rose-500">*</span>
                </label>
                <input
                  id="obs-session-date"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* 5 Assessment Criteria */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Penilaian 5 Kriteria (Skala 1 - 5)
                  </h4>
                  <span className="text-[11px] text-slate-400">Pilih nilai untuk tiap aspek</span>
                </div>

                {[
                  {
                    id: 'prep',
                    num: 1,
                    title: 'Persiapan Mengajar (Preparation)',
                    desc: 'Rencana pelaksanaan ajar, kesiapan alat, media & modul materi.',
                    value: scorePreparation,
                    setValue: setScorePreparation,
                  },
                  {
                    id: 'delivery',
                    num: 2,
                    title: 'Cara Penyampaian (Delivery)',
                    desc: 'Intonasi vokal, kejelasan instruksi, manajemen waktu & pacing materi.',
                    value: scoreDelivery,
                    setValue: setScoreDelivery,
                  },
                  {
                    id: 'mastery',
                    num: 3,
                    title: 'Penguasaan Kelas & Materi (Mastery)',
                    desc: 'Pemahaman konsep materi mendalam, menjawab pertanyaan & handling kelas.',
                    value: scoreMastery,
                    setValue: setScoreMastery,
                  },
                  {
                    id: 'visual',
                    num: 4,
                    title: 'Penggunaan Visual & Media (Visual)',
                    desc: 'Pemanfaatan slide, alat peraga visual, papan tulis & kejelasan display.',
                    value: scoreVisual,
                    setValue: setScoreVisual,
                  },
                  {
                    id: 'engagement',
                    num: 5,
                    title: 'Interaksi & Keterlibatan Murid (Engagement)',
                    desc: 'Interaksi dua arah, memotivasi siswa, perhatian merata & energi positif.',
                    value: scoreEngagement,
                    setValue: setScoreEngagement,
                  },
                ].map((crit) => (
                  <div
                    key={crit.id}
                    className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {crit.num}. {crit.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                        {crit.desc}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => crit.setValue(val)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center ${
                            crit.value === val
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'
                          }`}
                          aria-label={`${crit.title} nilai ${val}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Decision: Result Selector (Pass vs Retry) */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Keputusan Hasil Observasi <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Pass */}
                  <div
                    onClick={() => setObsResult('pass')}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      obsResult === 'pass'
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        obsResult === 'pass'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {obsResult === 'pass' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 block">
                        Lulus (Pass) — Layak Mengajar
                      </span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-snug block mt-0.5">
                        Trainee resmi dinyatakan <strong>Layak Mengajar</strong> (Gold Badge) untuk
                        term ini.
                      </span>
                    </div>
                  </div>

                  {/* Option 2: Retry */}
                  <div
                    onClick={() => setObsResult('retry')}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      obsResult === 'retry'
                        ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        obsResult === 'retry'
                          ? 'border-rose-600 bg-rose-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {obsResult === 'retry' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-rose-900 dark:text-rose-200 block">
                        Ulang (Retry) — Observasi Ulang
                      </span>
                      <span className="text-[11px] text-rose-700 dark:text-rose-400 leading-snug block mt-0.5">
                        Trainee perlu pendampingan dan evaluasi ulang pada sesi mengajar berikutnya.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Textarea */}
              <div>
                <label
                  htmlFor="obs-notes-textarea"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Catatan Evaluasi &amp; Umpan Balik (Feedback)
                </label>
                <textarea
                  id="obs-notes-textarea"
                  rows={2}
                  value={obsNotes}
                  onChange={(e) => setObsNotes(e.target.value)}
                  placeholder="Tuliskan catatan kelebihan dan hal yang perlu ditingkatkan trainee saat mengajar..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                />
              </div>
            </div>

            {/* Modal Footer (Fixed / Shrink-0) */}
            <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs shrink-0 flex items-center justify-between gap-3">
              {/* Average score indicator */}
              <div className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                <span>
                  Rata-rata:{' '}
                  {(
                    (scorePreparation +
                      scoreDelivery +
                      scoreMastery +
                      scoreVisual +
                      scoreEngagement) /
                    5
                  ).toFixed(1)}{' '}
                  / 5.0
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmittingObs}
                  onClick={() => setObservationModal(null)}
                  className="px-3.5 sm:px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  Batal
                </button>

                <button
                  id="btn-submit-observation"
                  type="button"
                  disabled={isSubmittingObs || !sessionDate}
                  onClick={handleSubmitObservation}
                  className="px-4 sm:px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 dark:disabled:bg-amber-800/40 text-white text-xs font-bold shadow-sm hover:shadow-amber-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmittingObs ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Hasil Observasi</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pindah Cabang */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Pindah Cabang Trainee
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {branchError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{branchError}</span>
              </div>
            )}

            {branchSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{branchSuccess}</span>
              </div>
            )}

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex justify-between items-center">
                <span className="text-slate-500">Cabang Saat Ini:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {branchName || 'Tanpa cabang'}
                </span>
              </div>

              <div>
                <label
                  htmlFor="targetBranch"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Pilih Cabang Baru <span className="text-rose-500">*</span>
                </label>
                <select
                  id="targetBranch"
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} disabled={b.id === branchId}>
                      {b.name} {b.id === branchId ? '(Saat Ini)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300">
                Konfirmasi: Anda akan memindahkan data trainee <strong>@{trainee.username}</strong> ({trainee.name}) ke cabang yang dipilih.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                id="btn-confirm-change-branch"
                type="button"
                disabled={isChangingBranch || targetBranchId === branchId}
                onClick={handleChangeBranch}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isChangingBranch ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Konfirmasi Pindah</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
