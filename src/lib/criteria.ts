export const PROGRESS_UPDATE_CRITERIA = [
  { key: 'score_accuracy', label: 'Akurasi isi perkembangan anak' },
  { key: 'score_clarity', label: 'Kejelasan bahasa untuk orang tua' },
  { key: 'score_timeliness', label: 'Ketepatan waktu' },
  { key: 'score_followup', label: 'Saran tindak lanjut' },
] as const

export const FINAL_PROJECT_RESULTS = [
  { key: 'meets_standard', label: 'Sesuai standar' },
  { key: 'not_yet', label: 'Belum sesuai' },
] as const

export type ProgressUpdateCriterionKey = (typeof PROGRESS_UPDATE_CRITERIA)[number]['key']
export type FinalProjectResultKey = (typeof FINAL_PROJECT_RESULTS)[number]['key']

