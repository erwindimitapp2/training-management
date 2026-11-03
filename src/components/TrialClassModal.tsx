'use client'

import { useState, useEffect, useTransition } from 'react'
import { TRIAL_LEVELS, getTrialLevelConfig } from '@/lib/levels'
import { saveTrialClassAction, TrialClassInput } from '@/app/trainer/actions'
import { StarRating } from '@/components/StarRating'
import { X, Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react'

export interface TraineeOption {
  id: string
  name: string
  username: string
  branchId: number | null
  branchName?: string
}

export interface ExistingTrialClass {
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
}

interface TrialClassModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  trainees: TraineeOption[]
  defaultTraineeId?: string
  initialData?: ExistingTrialClass | null
}

export function TrialClassModal({
  isOpen,
  onClose,
  onSuccess,
  trainees,
  defaultTraineeId,
  initialData,
}: TrialClassModalProps) {
  const [traineeId, setTraineeId] = useState(defaultTraineeId || '')
  const [trialDate, setTrialDate] = useState(new Date().toISOString().split('T')[0])
  const [studentName, setStudentName] = useState('')
  const [level, setLevel] = useState<string>(TRIAL_LEVELS[0].key)
  const [placement, setPlacement] = useState('')
  const [scoreConduct, setScoreConduct] = useState<number>(0)
  const [scorePlacement, setScorePlacement] = useState<number>(0)
  const [scoreParentUpdate, setScoreParentUpdate] = useState<number>(0)
  const [notes, setNotes] = useState('')

  const [traineeSearch, setTraineeSearch] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Reset or populate fields when modal opens
  useEffect(() => {
    if (!isOpen) return

    setErrorMessage(null)
    if (initialData) {
      setTraineeId(initialData.traineeId)
      setTrialDate(initialData.trialDate)
      setStudentName(initialData.studentName || '')
      setLevel(initialData.level)
      setPlacement(initialData.placement || '')
      setScoreConduct(initialData.scoreConduct)
      setScorePlacement(initialData.scorePlacement)
      setScoreParentUpdate(initialData.scoreParentUpdate)
      setNotes(initialData.notes || '')
    } else {
      setTraineeId(defaultTraineeId || (trainees[0]?.id ?? ''))
      setTrialDate(new Date().toISOString().split('T')[0])
      setStudentName('')
      setLevel(TRIAL_LEVELS[0].key)
      setPlacement('')
      setScoreConduct(0)
      setScorePlacement(0)
      setScoreParentUpdate(0)
      setNotes('')
    }
  }, [isOpen, initialData, defaultTraineeId, trainees])

  if (!isOpen) return null

  const currentLevelConfig = getTrialLevelConfig(level)
  const placements = currentLevelConfig ? currentLevelConfig.placements : []

  const handleLevelChange = (newLevel: string) => {
    setLevel(newLevel)
    setPlacement('') // Mengganti level mengosongkan placement
  }

  const filteredTrainees = trainees.filter((t) => {
    if (!traineeSearch.trim()) return true
    const q = traineeSearch.toLowerCase()
    return (
      t.name.toLowerCase().includes(q) ||
      t.username.toLowerCase().includes(q) ||
      (t.branchName && t.branchName.toLowerCase().includes(q))
    )
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!traineeId) {
      setErrorMessage('Pilih trainee terlebih dahulu.')
      return
    }

    if (!trialDate) {
      setErrorMessage('Tanggal Trial Class wajib diisi.')
      return
    }

    if (scoreConduct < 1 || scorePlacement < 1 || scoreParentUpdate < 1) {
      setErrorMessage('Ketiga aspek penilaian bintang (1-5) wajib diisi.')
      return
    }

    const input: TrialClassInput = {
      id: initialData?.id,
      traineeId,
      trialDate,
      studentName: studentName.trim() || null,
      level,
      placement: placement.trim() || null,
      scoreConduct,
      scorePlacement,
      scoreParentUpdate,
      notes: notes.trim() || null,
    }

    startTransition(async () => {
      const res = await saveTrialClassAction(input)
      if (res.error) {
        setErrorMessage(res.error)
      } else {
        onSuccess()
        onClose()
      }
    })
  }

  const isEdit = Boolean(initialData?.id)
  const isLockedTrainee = Boolean(defaultTraineeId) || isEdit

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{isEdit ? 'Edit Penilaian Trial Class' : 'Tambah Penilaian Trial Class'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sesi dengan calon murid sungguhan (tidak mengubah status self-training).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Trainee Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Trainee <span className="text-rose-500">*</span>
            </label>
            {isLockedTrainee ? (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200">
                {trainees.find((t) => t.id === traineeId)?.name || 'Trainee Terpilih'}
                {trainees.find((t) => t.id === traineeId)?.branchName && (
                  <span className="text-slate-400 ml-2">
                    ({trainees.find((t) => t.id === traineeId)?.branchName})
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Cari nama atau cabang trainee..."
                  value={traineeSearch}
                  onChange={(e) => setTraineeSearch(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <select
                  value={traineeId}
                  onChange={(e) => setTraineeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  required
                >
                  <option value="" disabled>
                    -- Pilih Trainee --
                  </option>
                  {filteredTrainees.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (@{t.username}){t.branchName ? ` - ${t.branchName}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Tanggal Trial & Nama Calon Murid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Tanggal Trial Class <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={trialDate}
                onChange={(e) => setTrialDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Calon Murid <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Budi Santoso"
                maxLength={100}
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          {/* 3. Level & Placement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Level <span className="text-rose-500">*</span>
              </label>
              <select
                value={level}
                onChange={(e) => handleLevelChange(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 capitalize"
              >
                {TRIAL_LEVELS.map((lvl) => (
                  <option key={lvl.key} value={lvl.key}>
                    {lvl.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Placement yang ditentukan trainee <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">-- Pilih Placement --</option>
                {placements.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Three Star Ratings (Mandatory) */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <span>Penilaian Bintang (1 - 5)</span>
              <span className="text-rose-500">*</span>
            </h4>

            {/* Score 1: Conduct */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-amber-200/50 dark:border-amber-800/30">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Conduct Trial Class
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kemampuan memandu dan mengelola alur sesi trial class
                </span>
              </div>
              <StarRating
                value={scoreConduct}
                onChange={setScoreConduct}
                size="md"
              />
            </div>

            {/* Score 2: Placement */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-amber-200/50 dark:border-amber-800/30">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Placement
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ketepatan trainee menempatkan level calon murid
                </span>
              </div>
              <StarRating
                value={scorePlacement}
                onChange={setScorePlacement}
                size="md"
              />
            </div>

            {/* Score 3: Parent Update */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Update ke Orang Tua
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ketepatan trainee menyampaikan hasil asesmen ke orang tua
                </span>
              </div>
              <StarRating
                value={scoreParentUpdate}
                onChange={setScoreParentUpdate}
                size="md"
              />
            </div>
          </div>

          {/* 5. Catatan (Opsional) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Catatan <span className="text-slate-400 font-normal">(opsional, maks 2000 karakter)</span>
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              placeholder="Tuliskan umpan balik atau catatan khusus mengenai sesi trial class ini..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEdit ? 'Simpan Perubahan' : 'Simpan Penilaian'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

