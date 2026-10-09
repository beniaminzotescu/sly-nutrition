import type { AmountUnit, Nutrition, Product } from './catalog'

export const nutrientKeys = ['calories', 'protein', 'fibre', 'sugar'] as const
export type ValueSource = 'unknown' | 'manual' | 'demo' | 'requested' | 'verified'
export type NutritionSources = Record<keyof Nutrition, ValueSource>
export type ShoppingEntry = {
  key: string
  product: Product
  packageAmount: number | null
  packageUnit: AmountUnit
  unitsPerPack: number
  amountSource: ValueSource
  nutrition: Nutrition
  nutritionSources: NutritionSources
  quantity: number
}
export type Subtotal = { known: number; unknown: number; knownCount: number }
const format = (value: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 1 }).format(value)
export const sourceLabels: Record<ValueSource, string> = {
  unknown: 'necunoscut', manual: 'introdus de utilizator / neverificat', demo: 'demo ilustrativ',
  requested: 'din denumirea furnizată / neverificat', verified: 'etichetă verificată',
}
const retailerNames: Record<string, string> = { lidl: 'Lidl', metro: 'Metro', kaufland: 'Kaufland', atelier: 'Atelier demo — fără magazin confirmat' }
export const shoppingNotice = 'Plan pentru o săptămână, nu meniu sau comandă. Cantitățile cumpărate nu sunt porții consumate: lista nu presupune că totul se mănâncă într-o săptămână și nu garantează că acoperă nevoile unei persoane.'
export const demoNotice = 'Produsele, ambalajele și valorile Atelier demo sunt exemple ilustrative, nu disponibilitate confirmată la un retailer. Verifică produsul, cantitatea netă, eticheta, ingredientele și alergenii în magazin.'
export const partialNotice = 'Total parțial: numai contribuțiile calculabile sunt însumate separat pentru fiecare nutrient; o valoare sau cantitate netă necunoscută nu înseamnă zero. Numărul de poziții necunoscute este indicat pentru fiecare total. Nu convertim g în ml.'

export function initialSource(product: Product): ValueSource {
  return product.readiness === 'illustrative' ? 'demo' : product.readiness === 'approved' ? 'verified' : 'requested'
}
export function initialNutritionSources(product: Product): NutritionSources {
  return Object.fromEntries(nutrientKeys.map(key => [key, product.nutrition[key] === null ? 'unknown' : initialSource(product)])) as NutritionSources
}
export function shoppingKey(entry: Omit<ShoppingEntry, 'key' | 'quantity'>) {
  return JSON.stringify([entry.product, entry.packageAmount, entry.packageUnit, entry.unitsPerPack, entry.amountSource,
    nutrientKeys.map(key => [entry.nutrition[key], entry.nutritionSources[key]])])
}
export function entryAmount(entry: ShoppingEntry) {
  return entry.packageAmount === null ? null : entry.packageAmount * entry.unitsPerPack * entry.quantity
}
export function scaled(value: number | null, amount: number | null) {
  return value === null || amount === null ? null : value * amount / 100
}
export function valueText(value: number | null, unit: string) {
  return value === null ? `necunoscut (${unit})` : `${format(value)} ${unit}`
}
export function amountText(entry: ShoppingEntry) {
  const total = valueText(entryAmount(entry), entry.packageUnit)
  return entry.unitsPerPack > 1
    ? `${entry.quantity} pachete × ${entry.unitsPerPack} doze × ${valueText(entry.packageAmount, entry.packageUnit)} / doză = ${total} cumpărați (${entry.quantity * entry.unitsPerPack} doze)`
    : `${entry.quantity} ambalaje/unități × ${valueText(entry.packageAmount, entry.packageUnit)} net/ambalaj = ${total} cumpărate`
}
export function nutritionText(entry: ShoppingEntry) {
  const names = { calories: 'Energie', protein: 'Proteine', fibre: 'Fibre', sugar: 'Zaharuri' }
  return `/100 ${entry.packageUnit}: ` + nutrientKeys.map(key =>
    `${names[key]} ${valueText(entry.nutrition[key], key === 'calories' ? 'kcal' : 'g')} [${sourceLabels[entry.nutritionSources[key]]}]`).join('; ')
}
export function subtotalText(total: Subtotal, unit: string) {
  if (!total.unknown) return `${format(total.known)} ${unit}`
  return `${total.knownCount ? `${format(total.known)} ${unit} cunoscute` : `subtotal cunoscut indisponibil (${unit})`} · total parțial (${total.unknown} poziții necunoscute)`
}
export function shoppingTotals(entries: ShoppingEntry[]) {
  const empty = (): Subtotal => ({ known: 0, unknown: 0, knownCount: 0 })
  const totals = { quantity: 0, grams: empty(), millilitres: empty(), calories: empty(), protein: empty(), fibre: empty(), sugar: empty() }
  const add = (total: Subtotal, value: number | null) => {
    if (value === null) total.unknown++
    else { total.known += value; total.knownCount++ }
  }
  for (const entry of entries) {
    const amount = entryAmount(entry)
    totals.quantity += entry.quantity
    add(entry.packageUnit === 'g' ? totals.grams : totals.millilitres, amount)
    for (const key of nutrientKeys) add(totals[key], scaled(entry.nutrition[key], amount))
  }
  return totals
}
export function totalsText(entries: ShoppingEntry[]) {
  const totals = shoppingTotals(entries)
  return `${totals.quantity} ambalaje/pachete · Masă: ${subtotalText(totals.grams, 'g')} · Volum: ${subtotalText(totals.millilitres, 'ml')}\nEnergie: ${subtotalText(totals.calories, 'kcal')} · Proteine: ${subtotalText(totals.protein, 'g')} · Fibre: ${subtotalText(totals.fibre, 'g')} · Zaharuri: ${subtotalText(totals.sugar, 'g')}`
}
export function shoppingGroups(entries: ShoppingEntry[]) {
  return [...new Set(entries.map(entry => entry.product.department))].map(id => ({
    id, name: entries.find(entry => entry.product.department === id)?.product.departmentName ?? retailerNames[id] ?? id, entries: entries.filter(entry => entry.product.department === id),
  })).filter(group => group.entries.length > 0)
}

// Only shopping snapshots enter exports; the profile and energy references cannot.
export function shoppingText(entries: ShoppingEntry[]) {
  const lines = ['LISTĂ DE CUMPĂRĂTURI — PLAN PENTRU O SĂPTĂMÂNĂ', '', shoppingNotice,
    'Concept educațional independent. Verifică magazinul, varianta produsului și disponibilitatea fizică; lista nu confirmă stocuri.', '']
  for (const group of shoppingGroups(entries)) {
    lines.push(group.name.toUpperCase())
    if (group.id === 'atelier') lines.push(demoNotice)
    for (const entry of group.entries) {
      lines.push(`[ ] ${entry.product.name}`, `    ${amountText(entry)}`,
        `    Cantitate netă: ${sourceLabels[entry.amountSource]}${entry.unitsPerPack > 1 ? `; doze/pachet: ${entry.unitsPerPack} (${sourceLabels[initialSource(entry.product)]})` : ''}`,
        `    ${valueText(scaled(entry.nutrition.calories, entryAmount(entry)), 'kcal')} în întreaga cantitate cumpărată`,
        `    ${nutritionText(entry)}`, `    Grupă: ${entry.product.group}. Proveniență produs: ${entry.product.provenance.source}.`)
    }
    lines.push('')
  }
  lines.push(`TOTAL CUMPĂRĂTURI: ${totalsText(entries)}`, partialNotice,
    'Total informativ pentru toate cumpărăturile, nu obiectiv energetic de consumat.')
  return lines.join('\n')
}
