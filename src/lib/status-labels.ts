import { TermStatus } from '@/types/database'

/**
 * Peta label terpusat untuk status term self-training
 * Sesuai aturan:
 * in_self_training   -> In Self-Training
 * ready_for_check    -> Ready for Check
 * understanding_check-> Understanding Check
 * need_review        -> Need Review
 * ready_for_trial    -> Self-Training Done
 */
export const TERM_STATUS_LABELS: Record<TermStatus, string> = {
  in_self_training: 'In Self-Training',
  ready_for_check: 'Ready for Check',
  understanding_check: 'Understanding Check',
  need_review: 'Need Review',
  ready_for_trial: 'Self-Training Done',
}

/**
 * Status trial class
 */
export type TrialClassStatus = 'assigned' | 'awaiting_evaluation' | 'evaluated'

export const TRIAL_CLASS_STATUS_LABELS: Record<TrialClassStatus, string> = {
  assigned: 'Ditugaskan',
  awaiting_evaluation: 'Menunggu Penilaian',
  evaluated: 'Dinilai',
}

export const TRIAL_CLASS_STATUS_STYLES: Record<
  TrialClassStatus,
  { bg: string; text: string; border: string; dot: string }
> = {
  assigned: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-700',
    dot: 'bg-amber-500',
  },
  awaiting_evaluation: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-300 dark:border-sky-700',
    dot: 'bg-sky-500',
  },
  evaluated: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-700',
    dot: 'bg-emerald-500',
  },
}

