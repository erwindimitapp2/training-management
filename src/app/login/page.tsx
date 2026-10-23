'use client'

import { Suspense, useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { loginAction, AuthState } from '@/app/auth/actions'
import { Lock, User, Eye, EyeOff, GraduationCap, AlertCircle, Loader2 } from 'lucide-react'

function LoginForm() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  let initialError: string | undefined
  if (errorParam === 'inactive') {
    initialError = 'Akun Anda berstatus nonaktif. Silakan hubungi Trainer Anda.'
  } else if (errorParam === 'env_missing') {
    initialError =
      'Koneksi Supabase belum terkonfigurasi di Vercel. Pastikan Environment Variables sudah ditambahkan di dashboard Vercel lalu lakukan Redeploy.'
  }

  const [state, formAction, isPending] = useActionState<AuthState | null, FormData>(
    loginAction,
    initialError ? { error: initialError } : null
  )

  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-7 shadow-2xl border border-slate-200/50 dark:border-slate-800">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Masuk ke Akun
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Masukkan username dan kata sandi yang telah didaftarkan
        </p>
      </div>

      {state?.error && (
        <div
          id="login-error-alert"
          className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3 text-rose-800 dark:text-rose-300 text-sm animate-in fade-in duration-200"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="contoh: budi.kinder"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-colors"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Kata Sandi
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          id="login-submit-button"
          type="submit"
          disabled={isPending}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-sm shadow-md hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memverifikasi...</span>
            </>
          ) : (
            <span>Masuk</span>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Belum memiliki akun? Hubungi Trainer di cabang Anda.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Portal Monitoring Training
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cabang Kelapa Gading &amp; Bekasi
          </p>
        </div>

        <Suspense
          fallback={
            <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl p-7 shadow-2xl border border-slate-200/50 flex items-center justify-center min-h-[300px]">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          &copy; {new Date().getFullYear()} TMI Training Monitoring System
        </p>
      </div>
    </main>
  )
}
