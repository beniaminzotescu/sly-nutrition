import type { Nutrition, Product } from './catalog'

export type ShoppingEntry = {
  key: string
  product: Product
  packageGrams: number
  nutrition: Nutrition
  quantity: number
}
const format = (value: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 1 }).format(value)
const retailerNames = { lidl: 'Lidl', metro: 'Metro', kaufland: 'Kaufland', atelier: 'Atelier demo — fără magazin confirmat' }
export const shoppingNotice = 'Plan pentru o săptămână, nu meniu sau comandă. Cantitățile cumpărate nu sunt porții consumate: lista nu presupune că totul se mănâncă într-o săptămână și nu garantează că acoperă nevoile unei persoane.'
export const demoNotice = 'Produsele, ambalajele și valorile Atelier demo sunt exemple ilustrative, nu disponibilitate confirmată la un retailer. Verifică produsul, gramajul, eticheta, ingredientele și alergenii în magazin.'

export function shoppingKey(product: Product, packageGrams: number, nutrition: Nutrition) {
  return JSON.stringify([product.department, product.id, product.group, packageGrams, nutrition.calories, nutrition.protein, nutrition.fibre, nutrition.sugar])
}
export function shoppingTotals(entries: ShoppingEntry[]) {
  const totals = { quantity: 0, grams: 0, calories: 0, protein: 0, fibre: 0, sugar: 0 }
  for (const entry of entries) {
    const grams = entry.packageGrams * entry.quantity
    totals.quantity += entry.quantity
    totals.grams += grams
    for (const key of ['calories', 'protein', 'fibre', 'sugar'] as const) totals[key] += entry.nutrition[key] * grams / 100
  }
  return totals
}
export function shoppingGroups(entries: ShoppingEntry[]) {
  return (['lidl', 'metro', 'kaufland', 'atelier'] as const).map(id => ({
    id, name: retailerNames[id], entries: entries.filter(entry => entry.product.department === id),
  })).filter(group => group.entries.length > 0)
}

// Only shopping snapshots enter exports; the profile and energy references cannot.
export function shoppingText(entries: ShoppingEntry[]) {
  const totals = shoppingTotals(entries)
  const lines = ['LISTĂ DE CUMPĂRĂTURI — PLAN PENTRU O SĂPTĂMÂNĂ', '', shoppingNotice,
    'Concept independent, fără afiliere cu Lidl, Metro sau Kaufland. Nu este o comandă și nu confirmă stocul.', '']
  for (const group of shoppingGroups(entries)) {
    lines.push(group.name.toUpperCase())
    if (group.id === 'atelier') lines.push(demoNotice)
    for (const entry of group.entries) {
      lines.push(`[ ] ${entry.product.name}`,
        `    ${entry.quantity} ambalaje/unități × ${format(entry.packageGrams)} g net/unitate = ${format(entry.packageGrams * entry.quantity)} g cumpărate`,
        `    ${format(entry.nutrition.calories * entry.packageGrams * entry.quantity / 100)} kcal în întreaga cantitate cumpărată`,
        `    /100 g: ${format(entry.nutrition.calories)} kcal; proteine ${format(entry.nutrition.protein)} g; fibre ${format(entry.nutrition.fibre)} g; zaharuri ${format(entry.nutrition.sugar)} g`,
        `    Grupă: ${entry.product.group}. Proveniență: ${entry.product.provenance.source}.`)
    }
    lines.push('')
  }
  lines.push(`TOTAL CUMPĂRĂTURI: ${totals.quantity} ambalaje/unități · ${format(totals.grams)} g · ${format(totals.calories)} kcal`,
    `Proteine: ${format(totals.protein)} g · Fibre: ${format(totals.fibre)} g`,
    'Total informativ pentru toate cumpărăturile, nu obiectiv energetic de consumat.')
  return lines.join('\n')
}
