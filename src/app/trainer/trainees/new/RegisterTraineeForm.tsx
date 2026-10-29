'use client'

import { useActionState, useState } from 'react'
import { registerTraineeAction, ActionResponse } from '@/app/trainer/actions'
import Link from 'next/link'
import {
  User,
  AtSign,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  BookOpen,
  RotateCcw,
  MapPin,
} from 'lucide-react'

interface RegisterTraineeFormProps {
  branches: Array<{ id: number; name: string }>
  defaultBranchId?: number | null
  masterTerms?: Array<{
    id: number
    name: string
    level: string
    sort_order: number
  }>
}

export function RegisterTraineeForm({
  branches,
  defaultBranchId,
  masterTerms = [],
}: RegisterTraineeFormProps) {
  const [state, formAction, isPending] = useActionState<ActionResponse | null, FormData>(
    registerTraineeAction,
    null
  )

  const [selectedBranchId, setSelectedBranchId] = useState<number>(
    defaultBranchId && branches.some((b) => b.id === defaultBranchId)
      ? defaultBranchId
      : branches[0]?.id || 1
  )
  const [showPassword, setShowPassword] = useState(false)
  const [enteredUsername, setEnteredUsername] = useState('')
  const [assignLevel, setAssignLevel] = useState<'' | 'kinder' | 'junior'>('')
  const [selectedTermIds, setSelectedTermIds] = useState<number[]>([])

  const chosenBranchName =
    branches.find((b) => b.id === selectedBranchId)?.name || 'Cabang Terpilih'

  const levelTerms = masterTerms
    .filter((t) => t.level === assignLevel)
    .sort((a, b) => a.sort_order - b.sort_order)

  const handleLevelChange = (lvl: '' | 'kinder' | 'junior') => {
    setAssignLevel(lvl)
    setSelectedTermIds([])
  }

  const handleToggleTerm = (id: number) => {
    setSelectedTermIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedTermIds.length === levelTerms.length) {
      setSelectedTermIds([])
    } else {
      setSelectedTermIds(levelTerms.map((t) => t.id))
    }
  }

  if (state?.success) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-emerald-200 dark:border-emerald-800/60 shadow-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-5 shadow-sm shadow-emerald-500/10">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Pendaftaran Trainee Berhasil!
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          {state.message}
        </p>

        <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs sm:text-sm space-y-2">
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400">Cabang</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{chosenBranchName}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400">Username Login</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              @{enteredUsername.toLowerCase()}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500 dark:text-slate-400">Term Di-assign</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {selectedTermIds.length > 0
                ? `${selectedTermIds.length} Term (${assignLevel === 'kinder' ? 'Kinder' : 'Junior'})`
                : 'Belum ada term di-assign'}
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {state.traineeId ? (
            <Link
              href={`/trainer/trainees/${state.traineeId}`}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm text-center shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Lihat Detail Trainee</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : null}

          <Link
            href="/trainer"
            className="py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm text-center transition-colors"
          >
            Kembali ke Daftar Trainee
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
      {state?.error && (
        <div
          id="register-error-alert"
          className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3 text-rose-800 dark:text-rose-300 text-sm animate-in fade-in duration-200"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} className="space-y-5">
        {/* Cabang Penempatan (Dropdown) */}
        <div>
          <label
            htmlFor="branchId"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Cabang Penempatan <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <select
              id="branchId"
              name="branchId"
              required
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(Number(e.target.value))}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-colors cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Trainee akan terdaftar dan dikelompokkan dalam cabang ini.
          </p>
        </div>

        {/* Full Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Nama Lengkap Calon Pengajar <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="cth: Budi Santoso"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-colors"
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="username"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Username Login <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">
              3-30 karakter (huruf kecil, angka, titik, garis bawah)
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <AtSign className="w-4 h-4" />
            </div>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={enteredUsername}
              onChange={(e) => setEnteredUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
              placeholder="budi.kinder"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-mono transition-colors"
            />
          </div>
          {enteredUsername && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Format internal akun: <code className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">{enteredUsername}@trainee.internal</code>
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Kata Sandi Sementara <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Minimal 8 karakter</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="Minimal 8 karakter"
              className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>



        {/* Assign Term (Opsional) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="assignLevel"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Assign Term (Opsional)
              </label>
              <span className="text-[11px] text-slate-400">
                Bisa dikosongkan &amp; di-assign nanti
              </span>
            </div>
            <select
              id="assignLevel"
              name="assignLevel"
              value={assignLevel}
              onChange={(e) => handleLevelChange(e.target.value as '' | 'kinder' | 'junior')}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-colors cursor-pointer"
            >
              <option value="">-- Lewati / Assign Nanti --</option>
              <option value="kinder">Level Kinder</option>
              <option value="junior">Level Junior</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Pilih level untuk menentukan term awal yang langsung terbuka bagi trainee.
            </p>
          </div>

          {assignLevel && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Term {assignLevel === 'kinder' ? 'Kinder' : 'Junior'} ({selectedTermIds.length} dipilih)
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {selectedTermIds.length === levelTerms.length ? 'Batalkan Semua' : 'Pilih Semua'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {levelTerms.map((term) => {
                  const isChecked = selectedTermIds.includes(term.id)
                  return (
                    <label
                      key={term.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="termIds"
                        value={term.id}
                        checked={isChecked}
                        onChange={() => handleToggleTerm(term.id)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                      />
                      <span>
                        <span className="font-bold mr-1">Term 0{term.sort_order}:</span>
                        {term.name}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <Link
            href="/trainer"
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
          >
            Batal
          </Link>

          <button
            id="register-submit-button"
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-xs shadow-md hover:shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mendaftarkan Trainee...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Daftarkan Trainee</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
