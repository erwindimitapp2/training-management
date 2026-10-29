'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  getTraineeAssignedTermsAction,
  saveTermAssignmentsAction,
  AssignedTermInfo,
} from '@/app/trainer/actions'
import { ProgramLevel } from '@/types/database'
import {
  X,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  User,
} from 'lucide-react'

export interface MasterTermItem {
  id: number
  name: string
  level: ProgramLevel
  sortOrder: number
}

export interface AssignTermModalProps {
  isOpen: boolean
  onClose: () => void
  trainees?: Array<{
    id: string
    name: string
    username: string
    branchId: number | null
    branchName: string
  }>
  fixedTrainee?: {
    id: string
    name: string
    username: string
  }
  initialBranchFilter?: 'all' | number
  masterTerms: MasterTermItem[]
  onSuccess?: (summary: string) => void
}

export function AssignTermModal({
  isOpen,
  onClose,
  trainees = [],
  fixedTrainee,
  initialBranchFilter = 'all',
  masterTerms,
  onSuccess,
}: AssignTermModalProps) {
  const router = useRouter()

  // Selected Trainee
  const [selectedTraineeId, setSelectedTraineeId] = useState<string>(
    fixedTrainee?.id || ''
  )
  const [traineeSearch, setTraineeSearch] = useState('')

  // Level Selection ('kinder' | 'junior')
  const [selectedLevel, setSelectedLevel] = useState<ProgramLevel>('kinder')

  // Loaded assigned terms from DB for selected trainee
  const [assignedTerms, setAssignedTerms] = useState<AssignedTermInfo[]>([])
  const [isLoadingTerms, setIsLoadingTerms] = useState(false)

  // Checked terms for currently selected level
  const [checkedTermIds, setCheckedTermIds] = useState<number[]>([])

  // Modal feedback state
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSaving, startSaveTransition] = useTransition()

  // Unassign confirmation state
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false)

  // Initialize selected trainee
  useEffect(() => {
    if (fixedTrainee) {
      setSelectedTraineeId(fixedTrainee.id)
    } else if (trainees.length > 0 && !selectedTraineeId) {
      const filtered = trainees.filter((t) =>
        initialBranchFilter === 'all' ? true : t.branchId === initialBranchFilter
      )
      if (filtered.length > 0) {
        setSelectedTraineeId(filtered[0].id)
      }
    }
  }, [fixedTrainee, trainees, initialBranchFilter, selectedTraineeId])

  // Load trainee's assigned terms whenever selected trainee changes
  useEffect(() => {
    if (!isOpen || !selectedTraineeId) return

    let isMounted = true
    setIsLoadingTerms(true)
    setError(null)
    setSuccessMessage(null)
    setShowUnassignConfirm(false)

    getTraineeAssignedTermsAction(selectedTraineeId).then((res) => {
      if (!isMounted) return
      setIsLoadingTerms(false)
      if (res.error) {
        setError(res.error)
      } else {
        const terms = res.assignedTerms || []
        setAssignedTerms(terms)
        // Set initial checked term IDs for the current level
        const levelAssigned = terms
          .filter((t) => t.level === selectedLevel)
          .map((t) => t.termId)
        setCheckedTermIds(levelAssigned)
      }
    })

    return () => {
      isMounted = false
    }
  }, [isOpen, selectedTraineeId])

  // Handle level change: discard unsaved changes and display terms for new level
  const handleLevelChange = (lvl: ProgramLevel) => {
    setSelectedLevel(lvl)
    setError(null)
    setShowUnassignConfirm(false)

    // Reset checked term IDs to currently assigned terms of the new level
    const levelAssigned = assignedTerms
      .filter((t) => t.level === lvl)
      .map((t) => t.termId)
    setCheckedTermIds(levelAssigned)
  }

  if (!isOpen) return null

  // Filter trainees by search and branch
  const filteredTrainees = trainees.filter((t) => {
    const matchesBranch =
      initialBranchFilter === 'all' || t.branchId === initialBranchFilter
    const matchesSearch =
      t.name.toLowerCase().includes(traineeSearch.toLowerCase()) ||
      t.username.toLowerCase().includes(traineeSearch.toLowerCase())
    return matchesBranch && matchesSearch
  })

  // Master terms for the chosen level (6 terms)
  const currentLevelMasterTerms = masterTerms
    .filter((t) => t.level === selectedLevel)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  // Map of assigned terms info
  const assignedMap = new Map<number, AssignedTermInfo>()
  assignedTerms.forEach((t) => assignedMap.set(t.termId, t))

  // Toggle term checkbox
  const handleToggleTerm = (termId: number) => {
    const termInfo = assignedMap.get(termId)
    if (termInfo?.hasProgress) {
      // Disabled, cannot uncheck if has progress
      return
    }

    setCheckedTermIds((prev) =>
      prev.includes(termId) ? prev.filter((id) => id !== termId) : [...prev, termId]
    )
  }

  // Pilih Semua shortcut
  const handleSelectAll = () => {
    // Check all 6 terms of the current level
    const allIds = currentLevelMasterTerms.map((t) => t.id)
    setCheckedTermIds(allIds)
  }

  // Calculate diff for current level
  const originalLevelAssignedTermIds = assignedTerms
    .filter((t) => t.level === selectedLevel)
    .map((t) => t.termId)

  const toAssignTermIds = checkedTermIds.filter(
    (id) => !originalLevelAssignedTermIds.includes(id)
  )

  const toUnassignTermIds = originalLevelAssignedTermIds.filter(
    (id) => !checkedTermIds.includes(id)
  )

  const toUnassignTraineeTermIds = toUnassignTermIds
    .map((id) => assignedMap.get(id)?.id)
    .filter((id): id is number => typeof id === 'number')

  const termsToUnassignNames = toUnassignTermIds
    .map((id) => currentLevelMasterTerms.find((m) => m.id === id)?.name || `Term ${id}`)

  // Pre-save check: check if confirmation is needed for unassign
  const handlePreSave = () => {
    setError(null)
    if (toAssignTermIds.length === 0 && toUnassignTraineeTermIds.length === 0) {
      setError('Tidak ada perubahan term untuk disimpan.')
      return
    }

    if (toUnassignTraineeTermIds.length > 0) {
      // Require confirmation
      setShowUnassignConfirm(true)
      return
    }

    // Direct execute if only adding
    executeSave()
  }

  const executeSave = () => {
    setShowUnassignConfirm(false)
    setError(null)

    startSaveTransition(async () => {
      const res = await saveTermAssignmentsAction({
        traineeId: selectedTraineeId,
        toAssignTermIds,
        toUnassignTraineeTermIds,
      })

      if (res.error) {
        setError(res.error)
      } else {
        const msg = res.message || 'Perubahan term berhasil disimpan.'
        setSuccessMessage(msg)
        router.refresh()
        if (onSuccess) {
          onSuccess(msg)
        }

        // Refresh assigned terms in modal
        const refreshed = await getTraineeAssignedTermsAction(selectedTraineeId)
        if (refreshed.assignedTerms) {
          setAssignedTerms(refreshed.assignedTerms)
          const levelAssigned = refreshed.assignedTerms
            .filter((t) => t.level === selectedLevel)
            .map((t) => t.termId)
          setCheckedTermIds(levelAssigned)
        }
      }
    })
  }

  const selectedTraineeObj =
    fixedTrainee || trainees.find((t) => t.id === selectedTraineeId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Assign Term Pelatihan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur term materi yang dapat diakses oleh trainee
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Step 1: Trainee Selection (Skipped if fixedTrainee) */}
          {!fixedTrainee ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                1. Pilih Trainee <span className="text-rose-500">*</span>
              </label>

              {/* Trainee search */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau username trainee..."
                  value={traineeSearch}
                  onChange={(e) => setTraineeSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <select
                value={selectedTraineeId}
                onChange={(e) => setSelectedTraineeId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
              >
                {filteredTrainees.length === 0 ? (
                  <option value="">Tidak ada trainee yang cocok</option>
                ) : (
                  filteredTrainees.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (@{t.username}) - {t.branchName}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-slate-500 dark:text-slate-400">Trainee:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {fixedTrainee.name}
                </span>
                <span className="font-mono text-slate-400">(@{fixedTrainee.username})</span>
              </div>
            </div>
          )}

          {/* Step 2: Level Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              {!fixedTrainee ? '2. ' : '1. '}Pilih Level Program <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLevelChange('kinder')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  selectedLevel === 'kinder'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Kinder Level (6 Term)
              </button>
              <button
                type="button"
                onClick={() => handleLevelChange('junior')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  selectedLevel === 'junior'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Junior Level (6 Term)
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Satu aksi assign berlaku untuk satu level. Mengganti level akan mengosongkan perubahan yang belum disimpan.
            </p>
          </div>

          {/* Step 3: Terms Checkboxes for Selected Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {!fixedTrainee ? '3. ' : '2. '}Pilih Term{' '}
                <span className="capitalize">{selectedLevel}</span> ({checkedTermIds.length} dipilih)
              </label>

              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Pilih Semua
              </button>
            </div>

            {isLoadingTerms ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span>Memuat status term trainee...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {currentLevelMasterTerms.map((term) => {
                  const assignedInfo = assignedMap.get(term.id)
                  const isAssigned = !!assignedInfo
                  const hasProgress = assignedInfo?.hasProgress || false
                  const isChecked = checkedTermIds.includes(term.id)

                  return (
                    <div
                      key={term.id}
                      onClick={() => !hasProgress && handleToggleTerm(term.id)}
                      className={`p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${
                        hasProgress
                          ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-90'
                          : isChecked
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-700 cursor-pointer'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={hasProgress}
                          onChange={() => handleToggleTerm(term.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Term 0{term.sortOrder}: {term.name}</span>
                            {isAssigned && !hasProgress && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                Sudah di-assign
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {hasProgress && (
                        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full shrink-0">
                          Sudah ada progres, tetap terbuka
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Unassign Confirmation Card */}
          {showUnassignConfirm && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Konfirmasi Mencabut Assign Term</h4>
                  <p className="mt-1">
                    Anda akan mencabut akses trainee terhadap term berikut (belum ada progres):
                  </p>
                  <ul className="list-disc list-inside mt-1 font-semibold">
                    {termsToUnassignNames.map((name, i) => (
                      <li key={i}>{name}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                    Apakah Anda yakin ingin melanjutkan dan menyimpan perubahan?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200 dark:border-amber-800/60">
                <button
                  type="button"
                  onClick={() => setShowUnassignConfirm(false)}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executeSave}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Ya, Cabut &amp; Simpan</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="text-[11px] text-slate-400">
            {toAssignTermIds.length > 0 && (
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold mr-2">
                +{toAssignTermIds.length} baru
              </span>
            )}
            {toUnassignTraineeTermIds.length > 0 && (
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                -{toUnassignTraineeTermIds.length} dicabut
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handlePreSave}
              disabled={isSaving || isLoadingTerms || !selectedTraineeId}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

