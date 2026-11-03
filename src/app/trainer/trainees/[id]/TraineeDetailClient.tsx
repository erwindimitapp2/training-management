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
  createCheckNoteAction,
  updateCheckNoteAction,
  deleteCheckNoteAction,
  setTrialReadinessAction,
  getTrialReadinessHistoryAction,
  deleteTrialClassAction,
} from '@/app/trainer/actions'
import { ProgramLevel, TermStatus, ObservationResult } from '@/types/database'
import { STATUS_LABELS, STATUS_STYLES, GOLD_BADGE_STYLE, isValidHttpUrl } from '@/lib/constants'
import { TRIAL_LEVELS, getTrialLevelConfig } from '@/lib/levels'
import { AssignTermModal, MasterTermItem } from '@/components/AssignTermModal'
import { TrialClassModal, ExistingTrialClass } from '@/components/TrialClassModal'
import { StarRating } from '@/components/StarRating'
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
  ExternalLink,
  Layers,
  Plus,
  Trash2,
  Edit2,
  History,
} from 'lucide-react'

export interface CheckNoteItem {
  id: number
  traineeTermId: number
  note: string
  outcome: 'need_review' | 'ready_for_trial' | null
  writtenBy: string
  writtenByName: string
  createdAt: string
  updatedAt: string
}

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
    evidenceUrl: string | null
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
  checkNotes?: CheckNoteItem[]
}

export interface TraineeDetailTrialClass {
  id: number
  traineeId: string
  trialDate: string
  studentName?: string | null
  level: string
  placement?: string | null
  scoreConduct: number
  scorePlacement: number
  scoreParentUpdate: number
  notes?: string | null
  createdAt: string
}

export interface TraineeDetailTrialReadiness {
  id: number
  level: string
  isReady: boolean
  changedBy: string | null
  changedByName: string
  changedAt: string
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
  currentTrainerId: string
  branches: Array<{ id: number; name: string }>
  terms: TermDetail[]
  masterTerms: MasterTermItem[]
  trialReadiness?: TraineeDetailTrialReadiness[]
  trialClasses?: TraineeDetailTrialClass[]
}

export function TraineeDetailClient({
  trainee,
  currentTrainerId,
  branches,
  terms,
  masterTerms,
  trialReadiness = [],
  trialClasses = [],
}: TraineeDetailClientProps) {
  const [isActive, setIsActive] = useState(trainee.isActive)
  const [branchName, setBranchName] = useState(trainee.branchName)
  const [branchId, setBranchId] = useState<number | null>(trainee.branchId)

  // Assign Term modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

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
  const [privateNote, setPrivateNote] = useState('')
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

  // Level tab state ('kinder' | 'junior' | 'trial_class')
  const [levelTab, setLevelTab] = useState<'kinder' | 'junior' | 'trial_class'>(() => {
    const hasKinder = terms.some((t) => t.level === 'kinder')
    const hasJunior = terms.some((t) => t.level === 'junior')
    if (!hasKinder && hasJunior) return 'junior'
    if (!hasKinder && !hasJunior && trialClasses.length > 0) return 'trial_class'

    const attentionTerm = terms.find(
      (t) =>
        t.traineeTerm?.status === 'ready_for_check' ||
        t.traineeTerm?.status === 'understanding_check'
    )
    if (attentionTerm && attentionTerm.level === 'junior') {
      const hasKinderAttention = terms.some(
        (t) =>
          t.level === 'kinder' &&
          (t.traineeTerm?.status === 'ready_for_check' ||
            t.traineeTerm?.status === 'understanding_check')
      )
      if (!hasKinderAttention) return 'junior'
    }
    return 'kinder'
  })

  // Check notes states (Trainer only)
  const [addingNoteTermId, setAddingNoteTermId] = useState<number | null>(null)
  const [newCheckNoteText, setNewCheckNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editNoteText, setEditNoteText] = useState('')
  const [isSavingNote, startNoteTransition] = useTransition()

  const handleAddCheckNote = (traineeTermId: number) => {
    if (!newCheckNoteText.trim()) return
    startNoteTransition(async () => {
      const res = await createCheckNoteAction(traineeTermId, trainee.id, newCheckNoteText)
      if (res.error) {
        setActionError(res.error)
      } else {
        setAddingNoteTermId(null)
        setNewCheckNoteText('')
        window.location.reload()
      }
    })
  }

  const handleUpdateCheckNote = (noteId: number) => {
    if (!editNoteText.trim()) return
    startNoteTransition(async () => {
      const res = await updateCheckNoteAction(noteId, trainee.id, editNoteText)
      if (res.error) {
        setActionError(res.error)
      } else {
        setEditingNoteId(null)
        setEditNoteText('')
        window.location.reload()
      }
    })
  }

  const handleDeleteCheckNote = (noteId: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan rahasia ini?')) return
    startNoteTransition(async () => {
      const res = await deleteCheckNoteAction(noteId, trainee.id)
      if (res.error) {
        setActionError(res.error)
      } else {
        window.location.reload()
      }
    })
  }

  // Trial readiness states
  const [expandedHistoryLevel, setExpandedHistoryLevel] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [readinessHistories, setReadinessHistories] = useState<
    Array<{ id: number; level: string; isReady: boolean; changedAt: string; changedByName: string }>
  >([])
  const [isReadinessPending, startReadinessTransition] = useTransition()

  const handleToggleReadiness = (lvlKey: string, currentReady: boolean, lvlLabel: string) => {
    const confirmMsg = currentReady
      ? `Apakah Anda yakin ingin membatalkan status Layak Trial Class (${lvlLabel}) untuk ${trainee.name}?`
      : `Tandai ${trainee.name} resmi Layak Trial Class (${lvlLabel})?`
    if (!window.confirm(confirmMsg)) return

    startReadinessTransition(async () => {
      const res = await setTrialReadinessAction(trainee.id, lvlKey, !currentReady)
      if (res.error) {
        setActionError(res.error)
      } else {
        window.location.reload()
      }
    })
  }

  const handleToggleHistory = async (lvlKey: string) => {
    if (expandedHistoryLevel === lvlKey) {
      setExpandedHistoryLevel(null)
      return
    }

    setExpandedHistoryLevel(lvlKey)
    setHistoryLoading(true)
    const res = await getTrialReadinessHistoryAction(trainee.id)
    setHistoryLoading(false)
    if (res.history) {
      setReadinessHistories(res.history)
    }
  }

  // Trial classes modal & actions
  const [isTrialClassModalOpen, setIsTrialClassModalOpen] = useState(false)
  const [editingTrialClass, setEditingTrialClass] = useState<ExistingTrialClass | null>(null)
  const [isDeletingTrialClass, startDeletingTrialClass] = useTransition()

  const handleDeleteTrialClass = (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data penilaian Trial Class ini?')) return
    startDeletingTrialClass(async () => {
      const res = await deleteTrialClassAction(id, trainee.id)
      if (res.error) {
        setActionError(res.error)
      } else {
        window.location.reload()
      }
    })
  }

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
        statusNote.trim(),
        privateNote.trim()
      )

      if (res.error) {
        setActionError(res.error)
      } else {
        setActionSuccess(res.message || 'Status term berhasil diperbarui.')
        setActiveStatusModal(null)
        setStatusNote('')
        setPrivateNote('')
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

  const kinderTerms = terms
    .filter((t) => t.level === 'kinder')
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const juniorTerms = terms
    .filter((t) => t.level === 'junior')
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const kinderStudied = kinderTerms.reduce(
    (sum, t) => sum + t.lessons.filter((l) => l.studied).length,
    0
  )
  const juniorStudied = juniorTerms.reduce(
    (sum, t) => sum + t.lessons.filter((l) => l.studied).length,
    0
  )

  const kinderReadyForTrial = kinderTerms.filter(
    (t) => t.traineeTerm?.status === 'ready_for_trial'
  ).length
  const juniorReadyForTrial = juniorTerms.filter(
    (t) => t.traineeTerm?.status === 'ready_for_trial'
  ).length

  const kinderCleared = kinderTerms.filter((t) => t.traineeTerm?.clearedToTeach).length
  const juniorCleared = juniorTerms.filter((t) => t.traineeTerm?.clearedToTeach).length

  const kinderNeedCheck = kinderTerms.filter(
    (t) => t.traineeTerm?.status === 'ready_for_check'
  ).length
  const juniorNeedCheck = juniorTerms.filter(
    (t) => t.traineeTerm?.status === 'ready_for_check'
  ).length

  const activeLevelTerms = levelTab === 'kinder' ? kinderTerms : juniorTerms

  const trialClassCount = trialClasses.length
  const avgConduct =
    trialClassCount > 0
      ? trialClasses.reduce((s, c) => s + c.scoreConduct, 0) / trialClassCount
      : 0
  const avgPlacement =
    trialClassCount > 0
      ? trialClasses.reduce((s, c) => s + c.scorePlacement, 0) / trialClassCount
      : 0
  const avgParentUpdate =
    trialClassCount > 0
      ? trialClasses.reduce((s, c) => s + c.scoreParentUpdate, 0) / trialClassCount
      : 0
  const overallTrialAvg =
    trialClassCount > 0
      ? (avgConduct + avgPlacement + avgParentUpdate) / 3
      : 0

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
                Kinder &amp; Junior
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
            {/* Assign Term Button */}
            <button
              id="btn-open-assign-term"
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Assign Term</span>
            </button>

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
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${isActive
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
              {terms.length > 0 ? Math.round((totalLessonsStudied / (terms.length * 10)) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: KELAYAKAN TRIAL CLASS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Kelayakan Trial Class
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Status kesiapan trainee memegang kelas trial per level (Kinder, Junior, Coder)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TRIAL_LEVELS.map((lvl) => {
            const readiness = trialReadiness.find((r) => r.level.toLowerCase() === lvl.key)
            const isReady = readiness?.isReady ?? false
            const isHistoryExpanded = expandedHistoryLevel === lvl.key
            const lvlHistories = readinessHistories.filter((h) => h.level.toLowerCase() === lvl.key)

            return (
              <div
                key={lvl.key}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {lvl.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        isReady
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-slate-400'}`}
                      />
                      <span>{isReady ? 'Layak' : 'Belum Layak'}</span>
                    </span>
                  </div>

                  {readiness && readiness.changedAt ? (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Diubah oleh{' '}
                      <strong className="text-slate-700 dark:text-slate-300">
                        {readiness.changedByName || 'Trainer'}
                      </strong>
                      <br />
                      {new Date(readiness.changedAt).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Belum ada pembaruan status</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={isReadinessPending}
                      onClick={() => handleToggleReadiness(lvl.key, isReady, lvl.label)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                        isReady
                          ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-rose-400'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      {isReadinessPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isReady ? (
                        <span>Batalkan Layak</span>
                      ) : (
                        <span>Tandai Layak</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleHistory(lvl.key)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                      title="Lihat riwayat perubahan"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Collapsible History */}
                  {isHistoryExpanded && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <span>Riwayat {lvl.label}</span>
                        {historyLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                      </div>

                      {historyLoading ? (
                        <p className="text-[11px] text-slate-400">Memuat...</p>
                      ) : lvlHistories.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Belum ada riwayat</p>
                      ) : (
                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-[11px]">
                          {lvlHistories.map((h) => (
                            <div
                              key={h.id}
                              className="p-1.5 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`font-semibold ${
                                    h.isReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                                  }`}
                                >
                                  {h.isReady ? 'Ditandai Layak' : 'Dibatalkan Layak'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(h.changedAt).toLocaleString('id-ID', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                oleh {h.changedByName || 'Trainer'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Level & Trial Class Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto">
            <button
              type="button"
              onClick={() => setLevelTab('kinder')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                levelTab === 'kinder'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Kinder Level ({kinderTerms.length} Term)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-mono">
                {kinderStudied}/{kinderTerms.length * 10}
              </span>
              {kinderNeedCheck > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Ada term Ready for Check" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setLevelTab('junior')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                levelTab === 'junior'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Junior Level ({juniorTerms.length} Term)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 font-mono">
                {juniorStudied}/{juniorTerms.length * 10}
              </span>
              {juniorNeedCheck > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Ada term Ready for Check" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setLevelTab('trial_class')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                levelTab === 'trial_class'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Trial Class ({trialClassCount} Sesi)</span>
              {trialClassCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 font-mono flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  <span>{overallTrialAvg.toFixed(1)}</span>
                </span>
              )}
            </button>
          </div>

          {levelTab !== 'trial_class' ? (
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
              <span>
                Ready for Trial:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {levelTab === 'kinder' ? kinderReadyForTrial : juniorReadyForTrial}/
                  {levelTab === 'kinder' ? kinderTerms.length : juniorTerms.length} Term
                </strong>
              </span>
              <span>•</span>
              <span>
                Layak Mengajar:{' '}
                <strong className="text-amber-600 dark:text-amber-400">
                  {levelTab === 'kinder' ? kinderCleared : juniorCleared}/
                  {levelTab === 'kinder' ? kinderTerms.length : juniorTerms.length} Term
                </strong>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingTrialClass(null)
                setIsTrialClassModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Trial Class</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        {levelTab === 'trial_class' ? (
          /* TRIAL CLASS TAB CONTENT */
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-slate-400 block mb-0.5">Rata-rata Conduct</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {trialClassCount > 0 ? avgConduct.toFixed(1) : '-'} <span className="text-xs text-slate-400 font-normal">/ 5</span>
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-slate-400 block mb-0.5">Rata-rata Placement</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {trialClassCount > 0 ? avgPlacement.toFixed(1) : '-'} <span className="text-xs text-slate-400 font-normal">/ 5</span>
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-slate-400 block mb-0.5">Rata-rata Update Ortu</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {trialClassCount > 0 ? avgParentUpdate.toFixed(1) : '-'} <span className="text-xs text-slate-400 font-normal">/ 5</span>
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 shadow-xs">
                <span className="text-amber-800 dark:text-amber-300 block mb-0.5 font-medium">Total Skor Rata-rata</span>
                <span className="text-base font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>{trialClassCount > 0 ? overallTrialAvg.toFixed(1) : '-'}</span>
                  <span className="text-xs font-normal text-amber-700/70 dark:text-amber-400/70">/ 5.0</span>
                </span>
              </div>
            </div>

            {/* Trial Classes Table or Empty State */}
            {trialClasses.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Belum ada sesi Trial Class untuk trainee ini.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Klik tombol di bawah untuk menambahkan penilaian sesi Trial Class pertama.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTrialClass(null)
                    setIsTrialClassModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Sesi Trial Class Pertama</span>
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Tanggal</th>
                        <th className="px-4 py-3 font-semibold">Murid</th>
                        <th className="px-4 py-3 font-semibold">Level &amp; Placement</th>
                        <th className="px-4 py-3 font-semibold">Conduct</th>
                        <th className="px-4 py-3 font-semibold">Placement</th>
                        <th className="px-4 py-3 font-semibold">Update Ortu</th>
                        <th className="px-4 py-3 font-semibold">Total</th>
                        <th className="px-4 py-3 font-semibold">Catatan</th>
                        <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {trialClasses.map((tc) => {
                        const total = ((tc.scoreConduct + tc.scorePlacement + tc.scoreParentUpdate) / 3).toFixed(1)
                        const lvlConfig = getTrialLevelConfig(tc.level)

                        return (
                          <tr key={tc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                              {tc.trialDate}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                              {tc.studentName || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 mr-1.5">
                                {lvlConfig?.label || tc.level}
                              </span>
                              <span className="text-slate-500">{tc.placement || '-'}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <StarRating value={tc.scoreConduct} readOnly size="sm" />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <StarRating value={tc.scorePlacement} readOnly size="sm" />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <StarRating value={tc.scoreParentUpdate} readOnly size="sm" />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-bold text-amber-600 dark:text-amber-400">
                              {total} / 5.0
                            </td>
                            <td className="px-4 py-3 max-w-xs text-slate-600 dark:text-slate-400 truncate">
                              {tc.notes || '-'}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTrialClass({
                                      id: tc.id,
                                      traineeId: tc.traineeId,
                                      trialDate: tc.trialDate,
                                      studentName: tc.studentName,
                                      level: tc.level,
                                      placement: tc.placement,
                                      scoreConduct: tc.scoreConduct,
                                      scorePlacement: tc.scorePlacement,
                                      scoreParentUpdate: tc.scoreParentUpdate,
                                      notes: tc.notes,
                                    })
                                    setIsTrialClassModalOpen(true)
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="Edit Penilaian"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeletingTrialClass}
                                  onClick={() => handleDeleteTrialClass(tc.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                                  title="Hapus Penilaian"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        ) : (
          /* KINDER / JUNIOR TAB CONTENT */
          activeLevelTerms.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Belum ada term {levelTab === 'kinder' ? 'Kinder' : 'Junior'} yang di-assign untuk trainee ini.
              </p>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Assign Term {levelTab === 'kinder' ? 'Kinder' : 'Junior'}</span>
              </button>
            </div>
          ) : (
            activeLevelTerms.map((term) => {
              const isExpanded = expandedTermId === term.termId
              const status = term.traineeTerm?.status || 'in_self_training'
              const statusStyle = STATUS_STYLES[status]
              const studiedCount = term.lessons.filter((l) => l.studied).length
              const clearedToTeach = term.traineeTerm?.clearedToTeach

              return (
                <div
                  key={term.termId}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-all"
                >
                  {/* Term Header Bar (Clickable) */}
                  <div
                    onClick={() => setExpandedTermId(isExpanded ? null : term.termId)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                    <div className="flex items-center gap-3">
                      {/* Status Indicator Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${status === 'ready_for_trial'
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                          }`}
                      >
                        {status === 'ready_for_trial' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span>{term.sortOrder}</span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            <span className="capitalize">{term.level}</span> · {term.name}
                          </h3>

                          {/* Status badge */}
                          {statusStyle && (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                              <span>{STATUS_LABELS[status]}</span>
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
                          {studiedCount} dari 10 lesson tercentang
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block text-right">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {studiedCount}/10
                        </span>
                      </div>

                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded content: Lessons & History */}
                  {isExpanded && (
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
                                  setPrivateNote('')
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
                                  setPrivateNote('')
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
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${clearedToTeach ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
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

                      {/* Read-only Lesson Checklist & Evidence Links */}
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Ceklis 10 Lesson & Link Bukti
                          </h4>
                          {status === 'understanding_check' && (
                            <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                              Tinjau link bukti di bawah untuk penilaian
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs">
                          {term.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border ${
                                lesson.studied
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-slate-800 dark:text-slate-200'
                                  : 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800/60 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  readOnly
                                  checked={lesson.studied}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none w-4 h-4 shrink-0"
                                />
                                <span className="font-medium truncate">
                                  Lesson {lesson.lessonNumber}: {lesson.title || `Lesson ${lesson.lessonNumber}`}
                                </span>
                              </div>

                              <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 pl-6 sm:pl-0">
                                <div className="flex items-center gap-1 text-[11px]">
                                  <span className="text-slate-400 font-medium">Bukti:</span>
                                  {lesson.evidenceUrl ? (
                                    isValidHttpUrl(lesson.evidenceUrl) ? (
                                      <a
                                        href={lesson.evidenceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline transition-colors"
                                        title={lesson.evidenceUrl}
                                      >
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                        <span>Buka Link</span>
                                      </a>
                                    ) : (
                                      <span
                                        className="text-slate-600 dark:text-slate-300 max-w-[120px] truncate"
                                        title={lesson.evidenceUrl}
                                      >
                                        {lesson.evidenceUrl}
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-400 font-mono">-</span>
                                  )}
                                </div>

                                <div className="border-l border-slate-200 dark:border-slate-700 pl-2">
                                  {lesson.studied && lesson.studiedAt ? (
                                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                                      {new Date(lesson.studiedAt).toLocaleDateString('id-ID', {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Belum</span>
                                  )}
                                </div>
                              </div>
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
                                          className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wide border ${obs.result === 'pass'
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

                      {/* Catatan Trainer (Rahasia) */}
                      {(status === 'understanding_check' ||
                        term.history.some(
                          (h) =>
                            h.toStatus === 'understanding_check' ||
                            h.toStatus === 'need_review' ||
                            h.toStatus === 'ready_for_trial' ||
                            h.fromStatus === 'understanding_check'
                        ) ||
                        (term.checkNotes && term.checkNotes.length > 0)) && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Catatan Trainer (Rahasia)
                              </h4>
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                                Rahasia • Hanya Terlihat Trainer
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setAddingNoteTermId(
                                  addingNoteTermId === term.traineeTerm?.id ? null : term.traineeTerm?.id || null
                                )
                                setNewCheckNoteText('')
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-100 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Catatan</span>
                            </button>
                          </div>

                          {/* Adding form */}
                          {addingNoteTermId === term.traineeTerm?.id && (
                            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-700/60 space-y-2 animate-in fade-in">
                              <label className="block text-[11px] font-bold uppercase text-amber-900 dark:text-amber-200">
                                Tulis Catatan Rahasia Baru
                              </label>
                              <textarea
                                rows={3}
                                maxLength={2000}
                                value={newCheckNoteText}
                                onChange={(e) => setNewCheckNoteText(e.target.value)}
                                placeholder="Tuliskan catatan evaluasi rahasia untuk sesama trainer..."
                                className="w-full p-2.5 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setAddingNoteTermId(null)}
                                  className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingNote || !newCheckNoteText.trim()}
                                  onClick={() => handleAddCheckNote(term.traineeTerm!.id)}
                                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  {isSavingNote && <Loader2 className="w-3 h-3 animate-spin" />}
                                  <span>Simpan Catatan</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Notes list */}
                          {term.checkNotes && term.checkNotes.length > 0 ? (
                            <div className="space-y-2">
                              {term.checkNotes.map((cn) => {
                                const isEditing = editingNoteId === cn.id
                                const isAuthor = cn.writtenBy === currentTrainerId

                                return (
                                  <div
                                    key={cn.id}
                                    className="p-3 rounded-xl bg-amber-50/30 dark:bg-amber-950/15 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                          {cn.writtenByName}
                                        </span>
                                        {cn.outcome === 'need_review' && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
                                            Need Review
                                          </span>
                                        )}
                                        {cn.outcome === 'ready_for_trial' && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                                            Ready for Trial Class
                                          </span>
                                        )}
                                        {cn.outcome === null && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                            Catatan tambahan
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          {new Date(cn.createdAt).toLocaleString('id-ID', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                          })}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingNoteId(cn.id)
                                              setEditNoteText(cn.note)
                                            }}
                                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                            title="Edit Catatan"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          {isAuthor && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteCheckNote(cn.id)}
                                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                              title="Hapus Catatan"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {isEditing ? (
                                      <div className="pt-1 space-y-1.5">
                                        <textarea
                                          rows={2}
                                          maxLength={2000}
                                          value={editNoteText}
                                          onChange={(e) => setEditNoteText(e.target.value)}
                                          className="w-full p-2 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        />
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => setEditingNoteId(null)}
                                            className="px-2 py-0.5 rounded text-[11px] text-slate-500 hover:bg-slate-100 cursor-pointer"
                                          >
                                            Batal
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isSavingNote || !editNoteText.trim()}
                                            onClick={() => handleUpdateCheckNote(cn.id)}
                                            className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                                          >
                                            Simpan
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed italic">
                                        &ldquo;{cn.note}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-1">
                              Belum ada catatan rahasia trainer untuk term ini.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )
        )}
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
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeStatusModal.action === 'start_check'
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

                {/* Catatan Rahasia Trainer */}
                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <label
                      htmlFor="needReviewPrivateNote"
                      className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200"
                    >
                      Catatan rahasia trainer (opsional)
                    </label>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Hanya terlihat trainer, tidak terlihat trainee.
                  </p>
                  <textarea
                    id="needReviewPrivateNote"
                    rows={3}
                    maxLength={2000}
                    value={privateNote}
                    onChange={(e) => setPrivateNote(e.target.value)}
                    placeholder="Tuliskan catatan rahasia internal untuk trainer..."
                    className="w-full p-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  />
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
                    Catatan Tambahan untuk Trainee (Opsional)
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

                {/* Catatan Rahasia Trainer */}
                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <label
                      htmlFor="readyForTrialPrivateNote"
                      className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200"
                    >
                      Catatan rahasia trainer (opsional)
                    </label>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Hanya terlihat trainer, tidak terlihat trainee.
                  </p>
                  <textarea
                    id="readyForTrialPrivateNote"
                    rows={3}
                    maxLength={2000}
                    value={privateNote}
                    onChange={(e) => setPrivateNote(e.target.value)}
                    placeholder="Tuliskan catatan rahasia internal untuk trainer..."
                    className="w-full p-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
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
                className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed ${activeStatusModal.action === 'start_check'
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
                          className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center ${crit.value === val
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
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${obsResult === 'pass'
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${obsResult === 'pass'
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
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${obsResult === 'retry'
                        ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${obsResult === 'retry'
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

      {/* ASSIGN TERM MODAL */}
      <AssignTermModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        fixedTrainee={{
          id: trainee.id,
          name: trainee.name,
          username: trainee.username,
        }}
        masterTerms={masterTerms}
      />

      {/* TRIAL CLASS MODAL */}
      <TrialClassModal
        isOpen={isTrialClassModalOpen}
        onClose={() => {
          setIsTrialClassModalOpen(false)
          setEditingTrialClass(null)
        }}
        trainees={[
          {
            id: trainee.id,
            name: trainee.name,
            username: trainee.username,
            branchId: trainee.branchId,
            branchName: trainee.branchName,
          },
        ]}
        defaultTraineeId={trainee.id}
        initialData={editingTrialClass}
        onSuccess={() => {
          setIsTrialClassModalOpen(false)
          setEditingTrialClass(null)
          window.location.reload()
        }}
      />
    </div>
  )
}
