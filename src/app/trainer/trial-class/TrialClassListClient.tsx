'use client'

import { useState, useTransition } from 'react'
import { TRIAL_LEVELS } from '@/lib/levels'
import { deleteTrialClassAction } from '@/app/trainer/actions'
import { StarRating } from '@/components/StarRating'
import {
  TrialClassModal,
  TraineeOption,
  ExistingTrialClass,
} from '@/components/TrialClassModal'
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Sparkles,
  Edit2,
  Trash2,
  Building2,
  User,
  GraduationCap,
  MessageSquare,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

export interface TrialClassListItem {
  id: number
  traineeId: string
  traineeName: string
  traineeUsername: string
  branchId: number | null
  branchName: string
  trialDate: string
  studentName: string | null
  level: string
  placement: string | null
  scoreConduct: number
  scorePlacement: number
  scoreParentUpdate: number
  notes: string | null
  createdAt: string
}

interface TrialClassListClientProps {
  initialItems: TrialClassListItem[]
  trainees: TraineeOption[]
  branches: Array<{ id: number; name: string }>
}

export function TrialClassListClient({
  initialItems,
  trainees,
  branches,
}: TrialClassListClientProps) {
  const [items, setItems] = useState<TrialClassListItem[]>(initialItems)
  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ExistingTrialClass | null>(null)

  // Delete states
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isDeleting, startDeleting] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  // Sync if initialItems changes
  if (initialItems !== items && !search && selectedBranch === 'all' && selectedLevel === 'all' && !startDate && !endDate) {
    // Only auto-sync if no local filter applied
  }

  // Filter items
  const filteredItems = initialItems.filter((item) => {
    // Search query on studentName or traineeName
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchStudent = item.studentName?.toLowerCase().includes(q) || false
      const matchTrainee =
        item.traineeName.toLowerCase().includes(q) ||
        item.traineeUsername.toLowerCase().includes(q)
      if (!matchStudent && !matchTrainee) return false
    }

    // Branch filter
    if (selectedBranch !== 'all') {
      const branchNum = parseInt(selectedBranch, 10)
      if (item.branchId !== branchNum) return false
    }

    // Level filter
    if (selectedLevel !== 'all') {
      if (item.level.toLowerCase() !== selectedLevel.toLowerCase()) return false
    }

    // Date range filter
    if (startDate && item.trialDate < startDate) return false
    if (endDate && item.trialDate > endDate) return false

    return true
  })

  const handleOpenAddModal = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (item: TrialClassListItem) => {
    setEditingItem({
      id: item.id,
      traineeId: item.traineeId,
      trialDate: item.trialDate,
      studentName: item.studentName,
      level: item.level,
      placement: item.placement,
      scoreConduct: item.scoreConduct,
      scorePlacement: item.scorePlacement,
      scoreParentUpdate: item.scoreParentUpdate,
      notes: item.notes,
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: number, studentOrTrainee: string) => {
    const ok = window.confirm(
      `Apakah Anda yakin ingin menghapus data penilaian Trial Class (${studentOrTrainee})? Tindakan ini tidak dapat dibatalkan.`
    )
    if (!ok) return

    setActionError(null)
    startDeleting(async () => {
      const res = await deleteTrialClassAction(id)
      if (res.error) {
        setActionError(res.error)
      } else {
        // window reloads or revalidation updates
        window.location.reload()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              Penilaian Khusus
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {filteredItems.length} Sesi Terdata
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-1.5 flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Penilaian Trial Class</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Sesi observasi trainee dengan <strong>calon murid sungguhan</strong>. Tidak mengubah status self-training dan berdiri sendiri.
          </p>
        </div>

        <button
          id="btn-add-trial-class"
          type="button"
          onClick={handleOpenAddModal}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold tracking-wide shadow-md hover:shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Trial Class</span>
        </button>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari calon murid atau trainee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {/* Branch filter */}
          <div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id.toString()}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Level filter */}
          <div>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 capitalize"
            >
              <option value="all">Semua Level</option>
              {TRIAL_LEVELS.map((lvl) => (
                <option key={lvl.key} value={lvl.key}>
                  Level {lvl.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date range toggle / inputs */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              title="Tanggal Mulai"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              title="Tanggal Selesai"
            />
          </div>
        </div>
      </div>

      {/* Trial Class Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <Sparkles className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Belum ada data penilaian Trial Class
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {search || selectedBranch !== 'all' || selectedLevel !== 'all' || startDate || endDate
                ? 'Tidak ada data yang cocok dengan kriteria filter saat ini.'
                : 'Klik tombol "Tambah Trial Class" di atas untuk mencatat sesi trial class baru.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Calon Murid</th>
                  <th className="py-3 px-4">Level & Placement</th>
                  <th className="py-3 px-4">Trainee</th>
                  <th className="py-3 px-4">Penilaian (3 Bintang)</th>
                  <th className="py-3 px-4 text-center">Rata-rata</th>
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => {
                  const avg = (
                    (item.scoreConduct + item.scorePlacement + item.scoreParentUpdate) /
                    3
                  ).toFixed(1)

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Tanggal */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {new Date(item.trialDate).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Calon Murid */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {item.studentName ? (
                          item.studentName
                        ) : (
                          <span className="text-slate-400 font-normal italic">-</span>
                        )}
                      </td>

                      {/* Level & Placement */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="capitalize px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                            {item.level}
                          </span>
                          {item.placement && (
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                              • {item.placement}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Trainee */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {item.traineeName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span>{item.branchName}</span>
                          <span>•</span>
                          <span>@{item.traineeUsername}</span>
                        </div>
                      </td>

                      {/* 3 Stars */}
                      <td className="py-3.5 px-4 whitespace-nowrap space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <span className="text-slate-400">Conduct:</span>
                          <StarRating value={item.scoreConduct} readOnly size="xs" />
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <span className="text-slate-400">Placement:</span>
                          <StarRating value={item.scorePlacement} readOnly size="xs" />
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <span className="text-slate-400">Ortu:</span>
                          <StarRating value={item.scoreParentUpdate} readOnly size="xs" />
                        </div>
                      </td>

                      {/* Average */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl font-bold font-mono text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
                          {avg}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 max-w-xs text-slate-500 dark:text-slate-400 text-xs">
                        {item.notes ? (
                          <p className="line-clamp-2 italic" title={item.notes}>
                            &ldquo;{item.notes}&rdquo;
                          </p>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Penilaian"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() =>
                              handleDelete(
                                item.id,
                                item.studentName || item.traineeName
                              )
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
        )}
      </div>

      {/* Trial Class Modal */}
      <TrialClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => window.location.reload()}
        trainees={trainees}
        initialData={editingItem}
      />
    </div>
  )
}

