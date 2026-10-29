'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TermStatus } from '@/types/database'
import { STATUS_LABELS, STATUS_STYLES, GOLD_BADGE_STYLE } from '@/lib/constants'
import {
  ArrowRight,
  Award,
  Sparkles,
  BookOpen,
  GraduationCap,
  Layers,
} from 'lucide-react'

export interface TermCardItem {
  id: number
  name: string
  sortOrder: number
  level: string
  status: TermStatus
  clearedToTeach: boolean
  completedAt?: string | null
  studiedLessonsCount: number
  totalLessonsCount: number
}

interface DashboardTabsClientProps {
  kinderTerms: TermCardItem[]
  juniorTerms: TermCardItem[]
}

export function DashboardTabsClient({
  kinderTerms,
  juniorTerms,
}: DashboardTabsClientProps) {
  const hasKinder = kinderTerms.length > 0
  const hasJunior = juniorTerms.length > 0

  const [activeTab, setActiveTab] = useState<'all' | 'kinder' | 'junior'>(() => {
    if (hasKinder && hasJunior) return 'all'
    if (hasKinder) return 'kinder'
    if (hasJunior) return 'junior'
    return 'all'
  })

  const kinderStudied = kinderTerms.reduce((sum, t) => sum + t.studiedLessonsCount, 0)
  const juniorStudied = juniorTerms.reduce((sum, t) => sum + t.studiedLessonsCount, 0)

  const kinderReadyForTrial = kinderTerms.filter((t) => t.status === 'ready_for_trial').length
  const juniorReadyForTrial = juniorTerms.filter((t) => t.status === 'ready_for_trial').length

  const kinderCleared = kinderTerms.filter((t) => t.clearedToTeach).length
  const juniorCleared = juniorTerms.filter((t) => t.clearedToTeach).length

  const totalTerms = kinderTerms.length + juniorTerms.length

  const renderTermCard = (term: TermCardItem) => {
    const status = term.status || 'in_self_training'
    const statusStyle = STATUS_STYLES[status]
    const progressPercent = Math.round((term.studiedLessonsCount / 10) * 100)
    const isCompleted = status === 'ready_for_trial'

    return (
      <div
        key={term.id}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between p-5 relative overflow-hidden"
      >
        <div>
          {/* Top Badges */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-slate-400 font-mono">
              TERM 0{term.sortOrder}
            </span>

            {statusStyle && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                <span>{STATUS_LABELS[status]}</span>
              </span>
            )}
          </div>

          {/* Term Title */}
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            {term.name}
          </h3>

          {/* Cleared to teach badge */}
          {term.clearedToTeach && (
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${GOLD_BADGE_STYLE.bg}`}
              >
                <Award className="w-3 h-3 text-amber-500" />
                <span>Layak Mengajar</span>
              </span>
            </div>
          )}

          {/* Progress description */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {term.studiedLessonsCount} dari 10 Lesson
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {progressPercent}%
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Link
            href={`/term/${term.id}`}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              isCompleted
                ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-indigo-500/20'
            }`}
          >
            <span>{isCompleted ? 'Lihat Ceklis Lesson' : 'Buka Ceklis Lesson'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Level Tabs Navigation - only shown if both levels have assigned terms */}
      {hasKinder && hasJunior && (
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua Level ({totalTerms} Term)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('kinder')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'kinder'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Kinder Level</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">
                {kinderStudied}/{kinderTerms.length * 10}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('junior')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'junior'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Junior Level</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">
                {juniorStudied}/{juniorTerms.length * 10}
              </span>
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hanya menampilkan term yang telah di-assign oleh Trainer Anda.
          </p>
        </div>
      )}

      {/* SECTION 1: Kinder Level (only if hasKinder) */}
      {hasKinder && (activeTab === 'all' || activeTab === 'kinder') && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                K
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Kinder Program ({kinderTerms.length} Term)
                  </h2>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                    PAUD / TK
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Materi pelatihan level Kinder yang di-assign oleh Trainer
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Progres Kinder</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {kinderStudied} / {kinderTerms.length * 10} Lesson
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Ready for Trial</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {kinderReadyForTrial} / {kinderTerms.length} Term
                </span>
              </div>
              {kinderCleared > 0 && (
                <>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">Layak Mengajar</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {kinderCleared} Term
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kinderTerms.map(renderTermCard)}
          </div>
        </section>
      )}

      {/* SECTION 2: Junior Level (only if hasJunior) */}
      {hasJunior && (activeTab === 'all' || activeTab === 'junior') && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                J
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Junior Program ({juniorTerms.length} Term)
                  </h2>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                    Sekolah Dasar (SD)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Materi pelatihan level Junior yang di-assign oleh Trainer
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Progres Junior</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {juniorStudied} / {juniorTerms.length * 10} Lesson
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Ready for Trial</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {juniorReadyForTrial} / {juniorTerms.length} Term
                </span>
              </div>
              {juniorCleared > 0 && (
                <>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">Layak Mengajar</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {juniorCleared} Term
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {juniorTerms.map(renderTermCard)}
          </div>
        </section>
      )}
    </div>
  )
}
