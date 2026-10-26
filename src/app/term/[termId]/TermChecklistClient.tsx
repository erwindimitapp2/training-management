'use client'

import { useState, useTransition, useOptimistic } from 'react'
import Link from 'next/link'
import { toggleLessonAction, submitReadyForCheckAction } from '@/app/trainee/actions'
import { TermStatus, ObservationResult } from '@/types/database'
import { STATUS_LABELS, STATUS_STYLES, GOLD_BADGE_STYLE } from '@/lib/constants'
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Clock,
  Award,
  AlertCircle,
  HelpCircle,
  Loader2,
  Calendar,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Star,
  GraduationCap,
} from 'lucide-react'

export interface LessonItem {
  id: number
  lessonNumber: number
  title: string | null
  studied: boolean
  studiedAt: string | null
}

export interface StatusHistoryItem {
  id: number
  fromStatus: string | null
  toStatus: string
  note: string | null
  changedAt: string
  changedByName: string
}

export interface ObservationItem {
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
}

interface TermChecklistClientProps {
  term: {
    id: number
    name: string
    sortOrder: number
    level: string
  }
  traineeTerm: {
    id: number
    status: TermStatus
    clearedToTeach: boolean
    completedAt: string | null
    updatedAt: string
  }
  initialLessons: LessonItem[]
  history: StatusHistoryItem[]
  observations?: ObservationItem[]
}

export function TermChecklistClient({
  term,
  traineeTerm,
  initialLessons,
  history,
  observations = [],
}: TermChecklistClientProps) {
  const [lessons, setLessons] = useState<LessonItem[]>(initialLessons)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Confirmation modal for Ready for Check
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSubmittingCheck, startSubmittingCheck] = useTransition()

  // Track which lesson is currently toggling
  const [togglingLessonId, setTogglingLessonId] = useState<number | null>(null)

  // Optimistic UI for lesson checkboxes
  const [optimisticLessons, setOptimisticLessons] = useOptimistic(
    lessons,
    (current, update: { lessonId: number; studied: boolean }) =>
      current.map((l) =>
        l.id === update.lessonId
          ? {
              ...l,
              studied: update.studied,
              studiedAt: update.studied ? new Date().toISOString() : null,
            }
          : l
      )
  )

  const isEditable = traineeTerm.status === 'in_self_training'
  const studiedCount = optimisticLessons.filter((l) => l.studied).length
  const allStudied = studiedCount === 10

  const statusStyle = STATUS_STYLES[traineeTerm.status]

  // Find latest Need Review note if any
  const latestNeedReview = history.find((h) => h.toStatus === 'need_review')

  const handleToggle = async (lesson: LessonItem) => {
    if (!isEditable) return

    const newStudied = !lesson.studied
    setErrorMessage(null)
    setTogglingLessonId(lesson.id)

    // Apply optimistic update immediately
    setOptimisticLessons({ lessonId: lesson.id, studied: newStudied })

    const res = await toggleLessonAction(term.id, lesson.id, newStudied)

    setTogglingLessonId(null)

    if (res.error) {
      setErrorMessage(res.error)
      // Rollback optimistic update by syncing with state
      setLessons([...lessons])
    } else {
      // Commit update to local state
      setLessons((prev) =>
        prev.map((l) =>
          l.id === lesson.id
            ? {
                ...l,
                studied: newStudied,
                studiedAt: newStudied ? new Date().toISOString() : null,
              }
            : l
        )
      )
    }
  }

  const handleConfirmReadyForCheck = () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    startSubmittingCheck(async () => {
      const res = await submitReadyForCheckAction(traineeTerm.id, term.id)
      setIsConfirmOpen(false)

      if (res.error) {
        setErrorMessage(res.error)
      } else {
        setSuccessMessage(res.message || 'Status berhasil diperbarui!')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* Term Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                Term {term.sortOrder} • {term.level} Level
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                <span>{STATUS_LABELS[traineeTerm.status]}</span>
              </span>

              {traineeTerm.clearedToTeach && (
                <span
                  className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold border ${GOLD_BADGE_STYLE.bg}`}
                >
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>Layak Mengajar</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-2">
              {term.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Pelajari materi mandiri pada setiap lesson dan beri centang setelah selesai.
            </p>
          </div>

          {/* Progress Pill */}
          <div className="self-start sm:self-center shrink-0 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center min-w-[120px]">
            <span className="text-[11px] text-slate-400 block font-medium">Progres Lesson</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {studiedCount} <span className="text-xs font-normal text-slate-400">/ 10</span>
            </span>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(studiedCount / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {latestNeedReview && traineeTerm.status === 'in_self_training' && (
          <div className="mt-5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs sm:text-sm text-rose-800 dark:text-rose-300 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <MessageSquare className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900 dark:text-rose-200">
                  Catatan Need Review dari Trainer:
                </p>
                <p className="mt-1 italic">&ldquo;{latestNeedReview.note}&rdquo;</p>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5">
                  Silakan pelajari kembali lesson yang perlu ditinjau, kemudian ajukan Ready for Check kembali setelah siap.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cleared to Teach Celebratory Banner */}
        {traineeTerm.clearedToTeach && (
          <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-yellow-500/15 border border-amber-300 dark:border-amber-600/50 shadow-xs flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm text-amber-950 dark:text-amber-200">
                  Predikat Layak Mengajar (Cleared to Teach)
                </h4>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                  Lulus Observasi
                </span>
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                Selamat! Anda telah lulus sesi observasi sebagai Main Teacher di kelas dan resmi diizinkan mengajar materi <strong>{term.name}</strong>.
              </p>
            </div>
          </div>
        )}

        {!isEditable && (
          <div className="mt-5 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Ceklis lesson sedang <strong>dikunci (read-only)</strong> karena status term saat ini adalah{' '}
              <strong>{STATUS_LABELS[traineeTerm.status]}</strong>.
            </span>
          </div>
        )}
      </div>

      {/* Feedback Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-start gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 10 Lessons Checklist */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Daftar Lesson ({studiedCount}/10 Selesai)
            </h2>
            <p className="text-xs text-slate-400">
              Centang setiap lesson yang telah Anda pelajari
            </p>
          </div>

          {isEditable && (
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hidden sm:inline">
              Perubahan langsung tersimpan otomatis
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {optimisticLessons.map((lesson) => {
            const isTogglingThis = togglingLessonId === lesson.id

            return (
              <label
                key={lesson.id}
                htmlFor={`lesson-checkbox-${lesson.id}`}
                className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all ${
                  lesson.studied
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-slate-900 dark:text-white'
                    : 'bg-slate-50/40 dark:bg-slate-800/20 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                } ${
                  isEditable
                    ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs'
                    : 'cursor-not-allowed opacity-80'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="relative flex items-center justify-center">
                    <input
                      id={`lesson-checkbox-${lesson.id}`}
                      type="checkbox"
                      disabled={!isEditable || isTogglingThis}
                      checked={lesson.studied}
                      onChange={() => handleToggle(lesson)}
                      className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed border-slate-300 dark:border-slate-600"
                    />
                    {isTogglingThis && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 absolute" />
                    )}
                  </div>

                  <div>
                    <span className="text-sm font-semibold block">
                      Lesson {lesson.lessonNumber}: {lesson.title || `Materi Lesson ${lesson.lessonNumber}`}
                    </span>
                    <span className="text-xs text-slate-400">
                      {lesson.studied ? 'Sudah dipelajari mandiri' : 'Belum dipelajari'}
                    </span>
                  </div>
                </div>

                <div>
                  {lesson.studied && lesson.studiedAt ? (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono bg-emerald-100/60 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                      Selesai:{' '}
                      {new Date(lesson.studiedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Belum Selesai</span>
                  )}
                </div>
              </label>
            )
          })}
        </div>

        {/* Ready for Check Action Bar */}
        {isEditable && (
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {allStudied
                  ? 'Semua 10 lesson telah selesai! Anda sekarang dapat mengajukan Ready for Check.'
                  : `Tersisa ${10 - studiedCount} lesson lagi sebelum tombol Ready for Check dapat ditekan.`}
              </p>
            </div>

            <button
              id="btn-ready-for-check"
              type="button"
              disabled={!allStudied || isSubmittingCheck}
              onClick={() => setIsConfirmOpen(true)}
              className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                allStudied
                  ? 'bg-amber-500 hover:bg-amber-600 text-white hover:shadow-amber-500/25 cursor-pointer ring-2 ring-amber-400/30'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Ready for Check</span>
            </button>
          </div>
        )}
      </div>

      {/* History Timeline */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Riwayat Status Term Ini</span>
          </h3>

          <div className="space-y-2 pt-1">
            {history.map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {STATUS_LABELS[h.toStatus as TermStatus] || h.toStatus}
                  </span>
                  {h.note && (
                    <span className="text-slate-500 italic ml-2">
                      &ldquo;{h.note}&rdquo;
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
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

      {/* Observation Sessions Results for this term */}
      {observations && observations.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Hasil Sesi Observasi Mengajar (Main Teacher)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {observations.length} Sesi Terdata
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {observations.map((obs) => {
              const avg = (
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
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs border border-slate-200/70 dark:border-slate-700/70 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wide border ${
                          obs.result === 'pass'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                            : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700'
                        }`}
                      >
                        {obs.result === 'pass' ? 'Lulus (Pass) — Layak Mengajar' : 'Ulang (Retry)'}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Tanggal: {obs.sessionDate}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Penilai: {obs.trainerName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-xs bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60 self-start sm:self-auto">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>Rata-rata: {avg} / 5.0</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Persiapan:</span>
                      <span className="font-bold text-xs">{obs.scorePreparation} / 5</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Penyampaian:</span>
                      <span className="font-bold text-xs">{obs.scoreDelivery} / 5</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Penguasaan:</span>
                      <span className="font-bold text-xs">{obs.scoreMastery} / 5</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Visual &amp; Media:</span>
                      <span className="font-bold text-xs">{obs.scoreVisual} / 5</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Interaksi:</span>
                      <span className="font-bold text-xs">{obs.scoreEngagement} / 5</span>
                    </div>
                  </div>

                  {obs.notes && (
                    <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-slate-600 dark:text-slate-300 text-xs">
                      <span className="font-semibold text-amber-900 dark:text-amber-200 block text-[10px] uppercase tracking-wider mb-0.5">
                        Catatan &amp; Feedback Trainer:
                      </span>
                      <p className="italic">&ldquo;{obs.notes}&rdquo;</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Ready for Check */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Ajukan Ready for Check?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Anda telah menyelesaikan seluruh 10 lesson pada <strong>{term.name}</strong>. Setelah diajukan, status akan berubah menjadi <strong>Ready for Check</strong> dan Trainer Anda akan segera menjadwalkan <strong>Understanding Check</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200">
              Ceklis lesson tidak dapat diubah lagi setelah status ini diajukan.
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingCheck}
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>

              <button
                id="btn-confirm-submit-check"
                type="button"
                disabled={isSubmittingCheck}
                onClick={handleConfirmReadyForCheck}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmittingCheck ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengajukan...</span>
                  </>
                ) : (
                  <span>Ya, Ajukan Sekarang</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
