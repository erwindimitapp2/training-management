'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/auth/actions'
import { GraduationCap, LogOut, MapPin, Users, Sparkles, CheckCircle2 } from 'lucide-react'

interface NavbarProps {
  user: {
    name: string
    role: 'trainer' | 'trainee'
    username: string
    branch_name?: string
    level?: string | null
  }
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()

  const navLinks = [
    {
      href: '/trainer',
      label: 'Daftar Trainee',
      icon: Users,
      isActive: pathname === '/trainer' || pathname.startsWith('/trainer/trainees'),
    },
    {
      href: '/trainer/trial-class',
      label: 'Trial Class',
      icon: Sparkles,
      isActive: pathname.startsWith('/trainer/trial-class'),
    },
    {
      href: '/trainer/layak-trial',
      label: 'Layak Trial',
      icon: CheckCircle2,
      isActive: pathname.startsWith('/trainer/layak-trial'),
    },
  ]

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link
            href={user.role === 'trainer' ? '/trainer' : '/dashboard'}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                  TMI Training
                </span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    user.role === 'trainer'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  }`}
                >
                  {user.role === 'trainer' ? 'Trainer' : 'Trainee'}
                </span>
              </div>
              {user.branch_name && (
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3 h-3" />
                  <span>{user.branch_name}</span>
                  {user.level && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{user.level} Level</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* Trainer Navigation Links */}
        {user.role === 'trainer' && (
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    link.isActive
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>
        )}

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {user.name}
            </span>
            <span className="text-xs text-slate-400">@{user.username}</span>
          </div>

          <form action={logoutAction}>
            <button
              id="logout-button"
              type="submit"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-2 text-xs font-medium cursor-pointer"
              title="Keluar dari akun"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </form>
        </div>
      </div>

      {/* Mobile sub-nav for trainer */}
      {user.role === 'trainer' && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 px-4 py-2 flex items-center justify-around bg-slate-50 dark:bg-slate-900/60 text-xs">
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold ${
                  link.isActive
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
