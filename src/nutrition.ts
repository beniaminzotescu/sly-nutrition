export const activities = [
  { value: 1.2, label: 'Mai ales sedentar · mișcare puțină' },
  { value: 1.375, label: 'Ușor activ · mișcare ușoară, ocazională' },
  { value: 1.55, label: 'Moderat activ · mișcare regulată' },
  { value: 1.725, label: 'Foarte activ · mișcare intensă, frecventă' },
] as const
export type AdultProfile = { age: number; height: number; weight: number; coefficient: 5 | -161 }
export type Estimate = { bmr: number; tdee: number; bmi: number; deficitEligible: boolean }
export type Reference = { mode: 'fictional' | 'own' | 'educational'; goal: 'explore' | 'maintenance' | 'moderate'; energy?: number; bmr?: number; tdee?: number }
export const format = (value: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 1 }).format(value)

export function validNumber(value: number, min: number, max: number, step: number) {
  return Number.isFinite(value) && value >= min && value <= max && Math.abs(value / step - Math.round(value / step)) < 0.000001
}

export function estimateAdult(profile: AdultProfile, activity: number): Estimate | undefined {
  const { age, height, weight, coefficient } = profile
  if (!validNumber(age, 18, 100, 1) || !validNumber(height, 120, 230, 0.1) || !validNumber(weight, 35, 300, 0.1) ||
    ![5, -161].includes(coefficient) || !activities.some(item => item.value === activity)) return
  const bmr = 10 * weight + 6.25 * height - 5 * age + coefficient
  const bmi = weight / (height / 100) ** 2
  return { bmr, tdee: bmr * activity, bmi, deficitEligible: bmi >= 18.5 && age <= 65 }
}

export function moderateReference(estimate: Estimate, percent: number) {
  if (!estimate.deficitEligible || ![5, 10, 15].includes(percent)) return
  const target = estimate.tdee * (1 - percent / 100)
  return target >= estimate.bmr ? target : undefined
}
