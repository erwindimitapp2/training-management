'use client'

import { useState, useTransition } from 'react'
import { getTrialLevelConfig } from '@/lib/levels'
import { submitTrialReportAction } from '@/app/trainee/actions'
import {
  TRIAL_CLASS_STATUS_LABELS,
  TRIAL_CLASS_STATUS_STYLES,
  TrialClassStatus,
} from '@/lib/status-labels'
import {
  Award,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Edit2,
  X,
  Loader2,
  Sparkles,
  Clock,
} from 'lucide-react'

export interface TraineeTrialClassItem {
  id: number
  trialDate: string
  level: string
  studentName: string | null
  placement: string | null
  traineeNotes: string | null
  status: TrialClassStatus
  submittedAt: string | null
  createdAt: string
}

interface TraineeTrialClassSectionProps {
  items: TraineeTrialClassItem[]
}

export function TraineeTrialClassSection({ items }: TraineeTrialClassSectionProps) {
  const [activeModalItem, setActiveModalItem] = useState<TraineeTrialClassItem | null>(null)
  const [studentName, setStudentName] = useState('')
  const [placement, setPlacement] = useState('')
  const [notes, setNotes] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!items || items.length === 0) {
    return null
  }

  const handleOpenModal = (item: TraineeTrialClassItem) => {
    setActiveModalItem(item)
    setStudentName(item.studentName || '')
    setPlacement(item.placement || '')
    setNotes(item.traineeNotes || '')
    setErrorMessage(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeModalItem) return

    setErrorMessage(null)

    if (!studentName.trim()) {
      setErrorMessage('Nama calon murid wajib diisi.')
      return
    }
    if (!placement.trim()) {
      setErrorMessage('Placement wajib dipilih.')
      return
    }

    startTransition(async () => {
      const res = await submitTrialReportAction(
        activeModalItem.id,
        studentName.trim(),
        placement.trim(),
        notes.trim() || null
      )

      if (res.error) {
        setErrorMessage(res.error)
      } else {
        setActiveModalItem(null)
        window.location.reload()
      }
    })
  }

  const activeLevelConfig = activeModalItem ? getTrialLevelConfig(activeModalItem.level) : null
  const availablePlacements = activeLevelConfig ? activeLevelConfig.placements : []

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Sesi Trial Class ({items.length} Sesi)
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                Ditugaskan Trainer
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Daftar sesi trial class yang ditugaskan kepada Anda. Isi laporan calon murid setelah pelaksanaan sesi.
            </p>
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {items.map((item) => {
          const levelConfig = getTrialLevelConfig(item.level)
          const statusStyle = TRIAL_CLASS_STATUS_STYLES[item.status]
          const isEvaluated = item.status === 'evaluated'
          const isAwaiting = item.status === 'awaiting_evaluation'
          const isAssigned = item.status === 'assigned'

          return (
            <div
              key={item.id}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header item: Tanggal & Level & Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {levelConfig?.label || item.level}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{item.trialDate}</span>
                    </span>
                  </div>

                  {statusStyle && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                      <span>{TRIAL_CLASS_STATUS_LABELS[item.status]}</span>
                    </span>
                  )}
                </div>

                {/* Report Content */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Calon Murid:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.studentName || <span className="text-slate-400 italic">Belum diisi</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Placement:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.placement || <span className="text-slate-400 italic">-</span>}
                    </span>
                  </div>

                  {item.traineeNotes && (
                    <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Catatan Anda:
                      </span>
                      <p className="italic mt-0.5">&ldquo;{item.traineeNotes}&rdquo;</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isAssigned && (
                  <button
                    type="button"
                    onClick={() => handleOpenModal(item)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Isi Laporan Trial Class</span>
                  </button>
                )}

                {isAwaiting && (
                  <button
                    type="button"
                    onClick={() => handleOpenModal(item)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Laporan Trial Class</span>
                  </button>
                )}

                {isEvaluated && (
                  <div className="py-1.5 px-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Sesi Selesai Dinilai Trainer</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Trainee Report Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {activeModalItem.status === 'assigned'
                      ? 'Isi Laporan Trial Class'
                      : 'Edit Laporan Trial Class'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeLevelConfig?.label} • Tanggal {activeModalItem.trialDate}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Nama Calon Murid */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Nama Calon Murid <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Contoh: Ananda Arya"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Placement */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Placement yang Anda Tentukan ({activeLevelConfig?.label}) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                >
                  <option value="">-- Pilih Rekomendasi Placement --</option>
                  {availablePlacements.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Catatan Trainee */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Jalannya Sesi Trial (Opsional, Maks 2000 Karakter)
                </label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  placeholder="Ceritakan observasi Anda mengenai kemampuan anak, respons orang tua, dll..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500/50 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setActiveModalItem(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Laporan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

