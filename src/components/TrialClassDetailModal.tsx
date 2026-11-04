'use client'

import { useState, useTransition, useEffect } from 'react'
import { getTrialLevelConfig } from '@/lib/levels'
import {
  updateTrialClassReportByTrainerAction,
  evaluateTrialClassAction,
  deleteTrialEvaluationAction,
  deleteTrialClassAction,
} from '@/app/trainer/actions'
import { StarRating } from '@/components/StarRating'
import { TRIAL_CLASS_STATUS_LABELS, TRIAL_CLASS_STATUS_STYLES, TrialClassStatus } from '@/lib/status-labels'
import {
  X,
  Loader2,
  AlertCircle,
  Lock,
  User,
  CheckCircle2,
  Trash2,
  Calendar,
  Sparkles,
  Award,
  AlertTriangle,
} from 'lucide-react'

export interface TrialClassDetailItem {
  id: number
  traineeId: string
  traineeName: string
  username: string
  branchId?: number | null
  branchName?: string
  trialDate: string
  level: string
  studentName?: string | null
  placement?: string | null
  traineeNotes?: string | null
  status: TrialClassStatus
  submittedAt?: string | null
  createdAt?: string
  evaluation?: {
    id: number
    scoreConduct: number
    scorePlacement: number
    scoreParentUpdate: number
    trainerPlacement?: string | null
    trainerNotes?: string | null
    evaluatedAt: string
    evaluatorName?: string
  } | null
}

interface TrialClassDetailModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  item: TrialClassDetailItem | null
}

export function TrialClassDetailModal({
  isOpen,
  onClose,
  onSuccess,
  item,
}: TrialClassDetailModalProps) {
  // Report states (Trainer can correct)
  const [trialDate, setTrialDate] = useState('')
  const [studentName, setStudentName] = useState('')
  const [placement, setPlacement] = useState('')
  const [traineeNotes, setTraineeNotes] = useState('')

  // Evaluation states
  const [scoreConduct, setScoreConduct] = useState(5)
  const [scorePlacement, setScorePlacement] = useState(5)
  const [scoreParentUpdate, setScoreParentUpdate] = useState(5)
  const [trainerPlacement, setTrainerPlacement] = useState('')
  const [trainerNotes, setTrainerNotes] = useState('')

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [isSavingReport, startSavingReport] = useTransition()
  const [isSavingEval, startSavingEval] = useTransition()
  const [isDeletingEval, startDeletingEval] = useTransition()
  const [isDeletingTC, startDeletingTC] = useTransition()

  useEffect(() => {
    if (item) {
      setTrialDate(item.trialDate || '')
      setStudentName(item.studentName || '')
      setPlacement(item.placement || '')
      setTraineeNotes(item.traineeNotes || '')

      if (item.evaluation) {
        setScoreConduct(item.evaluation.scoreConduct)
        setScorePlacement(item.evaluation.scorePlacement)
        setScoreParentUpdate(item.evaluation.scoreParentUpdate)
        setTrainerPlacement(item.evaluation.trainerPlacement || '')
        setTrainerNotes(item.evaluation.trainerNotes || '')
      } else {
        setScoreConduct(5)
        setScorePlacement(5)
        setScoreParentUpdate(5)
        setTrainerPlacement('')
        setTrainerNotes('')
      }
      setErrorMessage(null)
      setSuccessMessage(null)
    }
  }, [item])

  if (!isOpen || !item) return null

  const levelConfig = getTrialLevelConfig(item.level)
  const availablePlacements = levelConfig ? levelConfig.placements : []
  const statusStyle = TRIAL_CLASS_STATUS_STYLES[item.status]

  // Check placement match
  const hasBothPlacements = Boolean(placement && trainerPlacement)
  const isPlacementMatch = hasBothPlacements && placement === trainerPlacement

  // Handler: Save Report Corrections
  const handleSaveReport = () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!trialDate) {
      setErrorMessage('Tanggal trial class wajib diisi.')
      return
    }

    startSavingReport(async () => {
      const res = await updateTrialClassReportByTrainerAction({
        trialClassId: item.id,
        traineeId: item.traineeId,
        trialDate,
        studentName: studentName.trim() || null,
        placement: placement.trim() || null,
        traineeNotes: traineeNotes.trim() || null,
      })

      if (res.error) {
        setErrorMessage(res.error)
      } else {
        setSuccessMessage('Koreksi laporan trainee berhasil disimpan.')
        setTimeout(() => setSuccessMessage(null), 3000)
        onSuccess()
      }
    })
  }

  // Handler: Save Trainer Evaluation
  const handleSaveEvaluation = () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    startSavingEval(async () => {
      const res = await evaluateTrialClassAction({
        trialClassId: item.id,
        traineeId: item.traineeId,
        scoreConduct,
        scorePlacement,
        scoreParentUpdate,
        trainerPlacement: trainerPlacement.trim() || null,
        trainerNotes: trainerNotes.trim() || null,
      })

      if (res.error) {
        setErrorMessage(res.error)
      } else {
        setSuccessMessage('Penilaian trainer berhasil disimpan.')
        setTimeout(() => setSuccessMessage(null), 3000)
        onSuccess()
      }
    })
  }

  // Handler: Delete Evaluation
  const handleDeleteEvaluation = () => {
    if (
      !window.confirm(
        'Apakah Anda yakin ingin menghapus penilaian trainer ini? Status trial class akan dikembalikan ke status sebelumnya.'
      )
    ) {
      return
    }

    startDeletingEval(async () => {
      const res = await deleteTrialEvaluationAction(item.id, item.traineeId)
      if (res.error) {
        setErrorMessage(res.error)
      } else {
        onSuccess()
      }
    })
  }

  // Handler: Delete Trial Class
  const handleDeleteTrialClass = () => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus seluruh sesi Trial Class ini untuk ${item.traineeName}?`
      )
    ) {
      return
    }

    startDeletingTC(async () => {
      const res = await deleteTrialClassAction(item.id, item.traineeId)
      if (res.error) {
        setErrorMessage(res.error)
      } else {
        onSuccess()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Detail &amp; Penilaian Trial Class
                </h3>
                {statusStyle && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                    <span>{TRIAL_CLASS_STATUS_LABELS[item.status]}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Trainee: <strong>{item.traineeName}</strong> (@{item.username})
                {item.branchName ? ` · Cabang ${item.branchName}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* SECTION 1: LAPORAN TRAINEE */}
          <div className="space-y-3.5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-2.5">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  1. Laporan Trainee
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Data yang diisi oleh trainee mengenai calon murid &amp; placement. Trainer dapat mengoreksi jika diperlukan.
                </p>
              </div>

              {item.submittedAt && (
                <span className="text-[10px] text-slate-400 font-mono">
                  Dikirim:{' '}
                  {new Date(item.submittedAt).toLocaleString('id-ID', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Trial <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={trialDate}
                  onChange={(e) => setTrialDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Level Trial
                </label>
                <div className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-between">
                  <span>{levelConfig?.label || item.level}</span>
                  <span className="text-[10px] text-slate-400 font-normal">Terkunci</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Nama Calon Murid
                </label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Nama calon murid..."
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Placement Trainee
                </label>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs cursor-pointer focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Belum Dipilih --</option>
                  {availablePlacements.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Catatan Trainee (Terlihat Trainee)
              </label>
              <textarea
                rows={2}
                maxLength={2000}
                placeholder="Catatan dari trainee..."
                value={traineeNotes}
                onChange={(e) => setTraineeNotes(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-amber-500 resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={isSavingReport}
                onClick={handleSaveReport}
                className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingReport && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Simpan Koreksi Laporan</span>
              </button>
            </div>
          </div>

          {/* SECTION 2: PENILAIAN TRAINER (RAHASIA) */}
          <div className="space-y-4 p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/20">
            <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    2. Penilaian Trainer (Rahasia)
                  </h4>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Hanya terlihat oleh trainer. Trainee tidak dapat melihat skor, placement trainer, maupun catatan rahasia ini.
                  </p>
                </div>
              </div>

              {item.evaluation && (
                <button
                  type="button"
                  disabled={isDeletingEval}
                  onClick={handleDeleteEvaluation}
                  className="px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {isDeletingEval ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  <span>Hapus Penilaian</span>
                </button>
              )}
            </div>

            {/* 3 Star Ratings */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                    1. Conduct Trial Class (Cara Membawakan Kelas) <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Penguasaan panggung, antusiasme, kehangatan pada anak &amp; instruksi.
                  </span>
                </div>
                <StarRating value={scoreConduct} onChange={setScoreConduct} size="md" />
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                    2. Penentuan Placement (Tingkat Kesiapan Anak) <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Ketepatan observasi kemampuan awal anak dan kesesuaian modul.
                  </span>
                </div>
                <StarRating value={scorePlacement} onChange={setScorePlacement} size="md" />
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                    3. Update ke Orang Tua (Komunikasi &amp; Konsultasi) <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Kejelasan penyampaian progres, rekomendasi placement &amp; keramahan.
                  </span>
                </div>
                <StarRating value={scoreParentUpdate} onChange={setScoreParentUpdate} size="md" />
              </div>
            </div>

            {/* Placement Trainer & Comparison */}
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Placement Menurut Trainer (Opsional)
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Rekomendasi placement yang sesungguhnya sesuai evaluasi trainer.
                  </p>
                </div>

                {hasBothPlacements && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      isPlacementMatch
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                        : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                    }`}
                  >
                    {isPlacementMatch ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    <span>{isPlacementMatch ? 'Sesuai' : 'Berbeda'}</span>
                  </span>
                )}
              </div>

              <select
                value={trainerPlacement}
                onChange={(e) => setTrainerPlacement(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs cursor-pointer focus:ring-1 focus:ring-amber-500"
              >
                <option value="">-- Sama dengan Trainee / Tidak Diubah --</option>
                {availablePlacements.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Secret Trainer Notes */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 mb-1">
                Catatan Evaluasi Trainer (Rahasia Internal, Maks 2000 Karakter)
              </label>
              <textarea
                rows={3}
                maxLength={2000}
                placeholder="Tuliskan catatan evaluasi internal untuk sesama trainer..."
                value={trainerNotes}
                onChange={(e) => setTrainerNotes(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500/40 resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={isSavingEval}
                onClick={handleSaveEvaluation}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingEval && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Penilaian Trainer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0 flex items-center justify-between">
          <button
            type="button"
            disabled={isDeletingTC}
            onClick={handleDeleteTrialClass}
            className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {isDeletingTC ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>Hapus Trial Class</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
