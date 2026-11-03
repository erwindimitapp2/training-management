'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TRIAL_LEVELS, getTrialLevelConfig } from '@/lib/levels'
import {
  Search,
  Filter,
  CheckCircle2,
  GraduationCap,
  Building2,
  Calendar,
  ExternalLink,
  Sparkles,
} from 'lucide-react'

export interface LayakTrialItem {
  id: number
  traineeId: string
  traineeName: string
  traineeUsername: string
  branchId: number | null
  branchName: string
  level: string
  changedAt: string
}

interface LayakTrialListClientProps {
  initialItems: LayakTrialItem[]
  branches: Array<{ id: number; name: string }>
}

export function LayakTrialListClient({
  initialItems,
  branches,
}: LayakTrialListClientProps) {
  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')

  const filteredItems = initialItems.filter((item) => {
    // Search trainee name or username
    if (search.trim()) {
      const q = search.toLowerCase()
      const match =
        item.traineeName.toLowerCase().includes(q) ||
        item.traineeUsername.toLowerCase().includes(q)
      if (!match) return false
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

    return true
  })

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              Kelayakan Mengajar
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {filteredItems.length} Trainee Layak
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-1.5 flex items-center gap-2.5">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>Daftar Layak Trial Class</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Trainee yang telah dinyatakan <strong>layak memandu trial class</strong> dengan calon murid sungguhan pada level terkait.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama trainee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {/* Branch filter */}
          <div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 capitalize"
            >
              <option value="all">Semua Level</option>
              {TRIAL_LEVELS.map((lvl) => (
                <option key={lvl.key} value={lvl.key}>
                  Level {lvl.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table of Trainees */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Belum ada trainee yang dinyatakan Layak Trial Class
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {search || selectedBranch !== 'all' || selectedLevel !== 'all'
                ? 'Tidak ada data yang cocok dengan kriteria pencarian/filter saat ini.'
                : 'Tandai kelayakan trial class melalui halaman detail profil masing-masing trainee.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nama Trainee</th>
                  <th className="py-3 px-4">Cabang</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Tanggal Ditandai Layak</th>
                  <th className="py-3 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => {
                  const levelConfig = getTrialLevelConfig(item.level)
                  const levelLabel = levelConfig ? levelConfig.label : item.level

                  return (
                    <tr
                      key={`${item.traineeId}-${item.level}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Trainee */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        <div>{item.traineeName}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          @{item.traineeUsername}
                        </div>
                      </td>

                      {/* Cabang */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.branchName}</span>
                        </div>
                      </td>

                      {/* Level */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Layak • {levelLabel}</span>
                        </span>
                      </td>

                      {/* Tanggal */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {new Date(item.changedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Detail Link */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/trainer/trainees/${item.traineeId}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                        >
                          <span>Buka Profil</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

