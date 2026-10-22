import { TermStatus } from '@/types/database'

export const INTERNAL_EMAIL_DOMAIN = '@trainee.internal'

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}${INTERNAL_EMAIL_DOMAIN}`
}

export function emailToUsername(email: string): string {
  return email.replace(INTERNAL_EMAIL_DOMAIN, '')
}

export const STATUS_LABELS: Record<TermStatus, string> = {
  in_self_training: 'In Self-Training',
  ready_for_check: 'Ready for Check',
  understanding_check: 'Understanding Check',
  need_review: 'Need Review',
  ready_for_trial: 'Ready for Trial Class',
}

export const STATUS_STYLES: Record<
  TermStatus,
  { bg: string; text: string; border: string; dot: string }
> = {
  in_self_training: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
  ready_for_check: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-700',
    dot: 'bg-amber-500',
  },
  understanding_check: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-300 dark:border-sky-700',
    dot: 'bg-sky-500',
  },
  need_review: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-300 dark:border-rose-700',
    dot: 'bg-rose-500',
  },
  ready_for_trial: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-700',
    dot: 'bg-emerald-500',
  },
}

export const GOLD_BADGE_STYLE = {
  bg: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
}
