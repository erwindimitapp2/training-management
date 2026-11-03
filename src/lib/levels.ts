export const TRIAL_LEVELS = [
  { key: 'kinder', label: 'Kinder', placements: ['Foundation 1', 'Foundation 2', 'Term 1', 'Term 2', 'Term 3', 'Term 4'] },
  { key: 'junior', label: 'Junior', placements: ['Foundation 1', 'Foundation 2', 'Term 1', 'Term 2', 'Term 3', 'Term 4'] },
  { key: 'coder',  label: 'Coder',  placements: ['Basic', 'Intermediate', 'Advance'] },
] as const

export type TrialLevelKey = (typeof TRIAL_LEVELS)[number]['key']

export function getTrialLevelConfig(key: string) {
  return TRIAL_LEVELS.find((l) => l.key === key)
}

export function isValidTrialLevel(key: string): key is TrialLevelKey {
  return TRIAL_LEVELS.some((l) => l.key === key)
}

export function isValidPlacementForLevel(level: string, placement: string | null | undefined): boolean {
  if (!placement) return true
  const config = getTrialLevelConfig(level)
  if (!config) return false
  return (config.placements as readonly string[]).includes(placement)
}

