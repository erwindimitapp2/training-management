'use client'

import { useState } from 'react'
import { TRIAL_LEVELS, getTrialLevelConfig } from '@/lib/levels'
import { StarRating } from '@/components/StarRating'
import {
  AssignTrialClassModal,
  TraineeOption,
} from '@/components/AssignTrialClassModal'
import {
  TrialClassDetailModal,
  TrialClassDetailItem,
} from '@/components/TrialClassDetailModal'
import {
  TRIAL_CLASS_STATUS_LABELS,
  TRIAL_CLASS_STATUS_STYLES,
  TrialClassStatus,
} from '@/lib/status-labels'
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  Building2,
  User,
  ExternalLink,
} from 'lucide-react'

export interface TrialClassListItem extends TrialClassDetailItem {}

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
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modal states
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<TrialClassListItem | null>(null)

  // Filter items
  const filteredItems = initialItems.filter((item) => {
    // Search query on studentName or traineeName or username
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchStudent = item.studentName?.toLowerCase().includes(q) || false
      const matchTrainee =
        item.traineeName.toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q)
      if (!matchStudent && !matchTrainee) return false
    }

    // Status filter
    if (selectedStatus !== 'all' && item.status !== selectedStatus) {
      return false
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
    if (startDate && item.trialDate < startDate) {
      return false
    }
    if (endDate && item.trialDate > endDate) {
      return false
    }

    return true
  })

  // Quick stats
  const totalAssigned = initialItems.filter((i) => i.status === 'assigned').length
  const totalAwaiting = initialItems.filter((i) => i.status === 'awaiting_evaluation').length
  const totalEvaluated = initialItems.filter((i) => i.status === 'evaluated').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Penugasan &amp; Penilaian Trial Class
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              Tahap 1b
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tugaskan trial class ke trainee, pantau laporan calon murid, dan berikan penilaian evaluasi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAssignOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-amber-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tugaskan Trial Class</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-400 block mb-1">Total Sesi Trial Class</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {initialItems.length} Sesi
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-amber-700 dark:text-amber-400 block mb-1 font-medium">Ditugaskan (Menunggu Laporan)</span>
          <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
            {totalAssigned} Sesi
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-sky-700 dark:text-sky-400 block mb-1 font-medium">Menunggu Penilaian Trainer</span>
          <span className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-400">
            {totalAwaiting} Sesi
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-emerald-700 dark:text-emerald-400 block mb-1 font-medium">Sudah Dinilai</span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalEvaluated} Sesi
          </span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama calon murid, nama trainee, atau username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="assigned">Ditugaskan</option>
              <option value="awaiting_evaluation">Menunggu Penilaian</option>
              <option value="evaluated">Dinilai</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Cabang
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Level
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">Semua Level</option>
              {TRIAL_LEVELS.map((lvl) => (
                <option key={lvl.key} value={lvl.key}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filters */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Rentang Tanggal
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                placeholder="Dari"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                placeholder="Sampai"
              />
            </div>
          </div>
        </div>

        {(search || selectedStatus !== 'all' || selectedBranch !== 'all' || selectedLevel !== 'all' || startDate || endDate) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">
              Menampilkan {filteredItems.length} dari {initialItems.length} sesi
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSelectedStatus('all')
                setSelectedBranch('all')
                setSelectedLevel('all')
                setStartDate('')
                setEndDate('')
              }}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Table of Trial Classes */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Tidak ada sesi Trial Class yang sesuai kriteria.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Silakan ubah filter pencarian atau klik tombol di bawah untuk menugaskan trial class baru.
          </p>
          <button
            type="button"
            onClick={() => setIsAssignOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tugaskan Trial Class Baru</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Tanggal</th>
                  <th className="px-4 py-3.5 font-semibold">Level</th>
                  <th className="px-4 py-3.5 font-semibold">Trainee</th>
                  <th className="px-4 py-3.5 font-semibold">Cabang</th>
                  <th className="px-4 py-3.5 font-semibold">Calon Murid</th>
                  <th className="px-4 py-3.5 font-semibold">Placement Trainee</th>
                  <th className="px-4 py-3.5 font-semibold">Placement Trainer</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Nilai (3 Skor)</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => {
                  const levelConfig = getTrialLevelConfig(item.level)
                  const statusStyle = TRIAL_CLASS_STATUS_STYLES[item.status]
                  const hasBothPlacements = Boolean(
                    item.placement && item.evaluation?.trainerPlacement
                  )
                  const isMatch =
                    hasBothPlacements &&
                    item.placement === item.evaluation?.trainerPlacement

                  const avgScore = item.evaluation
                    ? (
                        (item.evaluation.scoreConduct +
                          item.evaluation.scorePlacement +
                          item.evaluation.scoreParentUpdate) /
                        3
                      ).toFixed(1)
                    : null

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Tanggal */}
                      <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {item.trialDate}
                      </td>

                      {/* Level */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {levelConfig?.label || item.level}
                        </span>
                      </td>

                      {/* Trainee */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {item.traineeName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            @{item.username}
                          </span>
                        </div>
                      </td>

                      {/* Cabang */}
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.branchName}
                      </td>

                      {/* Calon Murid */}
                      <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                        {item.studentName || <span className="text-slate-400 italic">Belum diisi</span>}
                      </td>

                      {/* Placement Trainee */}
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                        {item.placement || <span className="text-slate-400 italic">-</span>}
                      </td>

                      {/* Placement Trainer */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.evaluation?.trainerPlacement ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {item.evaluation.trainerPlacement}
                            </span>
                            {hasBothPlacements && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                  isMatch
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                                }`}
                              >
                                {isMatch ? 'Sesuai' : 'Berbeda'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {statusStyle && (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            <span>{TRIAL_CLASS_STATUS_LABELS[item.status]}</span>
                          </span>
                        )}
                      </td>

                      {/* Nilai / Evaluasi */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.evaluation ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              {avgScore} / 5.0
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({item.evaluation.scoreConduct},{item.evaluation.scorePlacement},{item.evaluation.scoreParentUpdate})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum dinilai</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDetailItem(item)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>{item.status === 'evaluated' ? 'Lihat / Edit' : 'Detail & Nilai'}</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      <AssignTrialClassModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        trainees={trainees}
        onSuccess={() => {
          setIsAssignOpen(false)
          window.location.reload()
        }}
      />

      {/* Detail & Evaluation Modal */}
      <TrialClassDetailModal
        isOpen={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        item={detailItem}
        onSuccess={() => {
          setDetailItem(null)
          window.location.reload()
        }}
      />
    </div>
  )
}
