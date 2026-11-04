'use client'

import { useState, useTransition } from 'react'
import { TRIAL_LEVELS, getTrialLevelConfig } from '@/lib/levels'
import { assignTrialClassAction } from '@/app/trainer/actions'
import { X, Loader2, AlertCircle, Sparkles, ChevronDown, ChevronUp, User, Calendar } from 'lucide-react'

export interface TraineeOption {
  id: string
  name: string
  username: string
  branchId: number | null
  branchName?: string
}

interface AssignTrialClassModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  trainees: TraineeOption[]
  defaultTraineeId?: string
}

export function AssignTrialClassModal({
  isOpen,
  onClose,
  onSuccess,
  trainees,
  defaultTraineeId,
}: AssignTrialClassModalProps) {
  const [traineeId, setTraineeId] = useState(defaultTraineeId || trainees[0]?.id || '')
  const [trialDate, setTrialDate] = useState(() => new Date().toISOString().split('T')[0])
  const [level, setLevel] = useState<string>(TRIAL_LEVELS[0].key)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [placement, setPlacement] = useState('')
  const [traineeNotes, setTraineeNotes] = useState('')

  const [traineeSearch, setTraineeSearch] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

  const selectedLevelConfig = getTrialLevelConfig(level)
  const availablePlacements = selectedLevelConfig ? selectedLevelConfig.placements : []

  const filteredTrainees = trainees.filter((t) => {
    const q = traineeSearch.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.username.toLowerCase().includes(q)
  })

  const selectedTrainee = trainees.find((t) => t.id === traineeId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!traineeId) {
      setErrorMessage('Pilih trainee terlebih dahulu.')
      return
    }
    if (!trialDate) {
      setErrorMessage('Tanggal trial class wajib diisi.')
      return
    }

    startTransition(async () => {
      const res = await assignTrialClassAction({
        traineeId,
        trialDate,
        level,
        studentName: isReportOpen && studentName ? studentName.trim() : null,
        placement: isReportOpen && placement ? placement.trim() : null,
        traineeNotes: isReportOpen && traineeNotes ? traineeNotes.trim() : null,
      })

      if (res.error) {
        setErrorMessage(res.error)
      } else {
        onSuccess()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Tugaskan Trial Class
              </h3>
              <p className="text-[11px] text-slate-500">
                Tentukan tanggal &amp; level penugasan trial class untuk trainee
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Trainee Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Pilih Trainee <span className="text-rose-500">*</span>
            </label>
            {defaultTraineeId && selectedTrainee ? (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedTrainee.name}
                  </span>
                  <span className="text-slate-400 font-mono">(@{selectedTrainee.username})</span>
                </div>
                {selectedTrainee.branchName && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {selectedTrainee.branchName}
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Cari nama atau username trainee..."
                  value={traineeSearch}
                  onChange={(e) => setTraineeSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <select
                  value={traineeId}
                  onChange={(e) => setTraineeId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">-- Pilih Trainee --</option>
                  {filteredTrainees.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (@{t.username}) {t.branchName ? `· ${t.branchName}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Date & Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Tanggal Trial <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={trialDate}
                  onChange={(e) => setTrialDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Level Trial <span className="text-rose-500">*</span>
              </label>
              <select
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value)
                  setPlacement('')
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
              >
                {TRIAL_LEVELS.map((lvl) => (
                  <option key={lvl.key} value={lvl.key}>
                    {lvl.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Collapsible: Isi laporan sekarang (opsional) */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setIsReportOpen(!isReportOpen)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <span>Isi laporan sekarang (opsional)</span>
              {isReportOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isReportOpen && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Jika trainer sudah mengetahui detail calon murid atau ingin menginputkan langsung atas nama trainee.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Nama Calon Murid
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Contoh: Budi Santoso"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Placement ({selectedLevelConfig?.label})
                  </label>
                  <select
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                  >
                    <option value="">-- Pilih Placement --</option>
                    {availablePlacements.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Catatan trainee (terlihat trainee)
                  </label>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400">
                    Perhatian: Catatan ini dapat dibaca oleh trainee. Jangan menuliskan penilaian rahasia di sini.
                  </p>
                  <textarea
                    rows={2}
                    maxLength={2000}
                    placeholder="Catatan mengenai jalannya trial..."
                    value={traineeNotes}
                    onChange={(e) => setTraineeNotes(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Tugaskan Trial Class</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

