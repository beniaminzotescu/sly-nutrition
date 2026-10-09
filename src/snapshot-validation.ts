import type { Nutrition, Product } from './catalog'
import { nutrientKeys, shoppingKey, type NutritionSources, type ShoppingEntry, type ValueSource } from './shopping-list'

const sources = ['unknown', 'manual', 'demo', 'requested', 'verified']
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Snapshot invalid.')
  return value as Record<string, unknown>
}
function text(value: unknown, max: number, multiline = false) {
  const invalidControls = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/
  if (typeof value !== 'string' || !value.trim() || value.length > max || invalidControls.test(value)) throw Error('Text invalid în listă.')
  return value
}
function identifier(value: unknown) {
  const id = text(value, 100)
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw Error('Identificator invalid.')
  return id
}
function imagePath(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpg|jpeg)$/.test(value)) throw Error('Cale imagine invalidă.')
  return value
}
function numeric(value: unknown, min: number, max: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value)) || (!integer && Math.abs(value * 10 - Math.round(value * 10)) > 1e-6)) throw Error('Cantitate invalidă în listă.')
  return value
}
function amount(value: unknown) { return value === null ? null : numeric(value, 0.1, 10000) }
function unit(value: unknown): 'g' | 'ml' {
  if (value !== 'g' && value !== 'ml') throw Error('Unitate invalidă.')
  return value
}
function nutrition(value: unknown): Nutrition {
  const row = record(value)
  return Object.fromEntries(nutrientKeys.map(key => [key, row[key] === null ? null : numeric(row[key], 0, key === 'calories' ? 1000 : 100)])) as Nutrition
}
function source(value: unknown): ValueSource {
  if (typeof value !== 'string' || !sources.includes(value)) throw Error('Proveniență invalidă.')
  return value as ValueSource
}
export function validateShoppingEntries(value: unknown): ShoppingEntry[] {
  if (!Array.isArray(value) || value.length > 30) throw Error('Maximum 30 variante în listă.')
  let total = 0
  const entries = value.map(raw => {
    const row = record(raw), p = record(row.product), provenance = record(p.provenance)
    if (!['illustrative', 'approved', 'requested'].includes(String(p.readiness))) throw Error('Stare produs invalidă.')
    const expected = p.readiness === 'illustrative' ? 'illustrative' : p.readiness === 'approved' ? 'verified-label' : 'pending-label'
    if (provenance.status !== expected) throw Error('Sursă produs inconsistentă.')
    if (!['grain', 'leaf', 'clay', 'milk'].includes(String(p.color))) throw Error('Culoare invalidă.')
    const portion = numeric(p.portion, 5, 500)
    if (portion % 5 !== 0) throw Error('Porția trebuie să fie în pași de 5.')
    const product = {
      id: identifier(p.id), name: text(p.name, 200), group: text(p.group, 100), department: identifier(p.department),
      ...(p.departmentName === undefined ? {} : { departmentName: text(p.departmentName, 243) }),
      ...(p.imagePath === undefined ? {} : { imagePath: imagePath(p.imagePath) }),
      readiness: p.readiness, color: p.color, portion,
      ...(p.shape === undefined ? {} : { shape: ['box', 'can', 'bottle', 'tray', 'wafer', 'pasta'].includes(String(p.shape)) ? p.shape : undefined }),
      ...(typeof p.ingredients === 'string' && p.ingredients ? { ingredients: text(p.ingredients, 4000, true) } : {}),
      ...(typeof p.allergens === 'string' && p.allergens ? { allergens: text(p.allergens, 2000, true) } : {}),
      packageAmount: amount(p.packageAmount), packageUnit: unit(p.packageUnit),
      unitsPerPack: numeric(p.unitsPerPack, 1, 100, true), nutrition: nutrition(p.nutrition),
      provenance: { status: expected, source: text(provenance.source, 1000, true) },
    } as Product
    const values = nutrition(row.nutrition), rawSources = record(row.nutritionSources)
    const nutritionSources = Object.fromEntries(nutrientKeys.map(key => {
      const s = source(rawSources[key])
      if ((values[key] === null) !== (s === 'unknown')) throw Error('Nutrient necunoscut inconsistent.')
      return [key, s]
    })) as NutritionSources
    const entry = {
      product, packageAmount: amount(row.packageAmount), packageUnit: unit(row.packageUnit),
      unitsPerPack: numeric(row.unitsPerPack, 1, 100, true), amountSource: source(row.amountSource),
      nutrition: values, nutritionSources, quantity: numeric(row.quantity, 1, 99, true),
    }
    if (entry.packageUnit !== product.packageUnit || entry.unitsPerPack !== product.unitsPerPack || (entry.packageAmount === null) !== (entry.amountSource === 'unknown')) throw Error('Ambalaj inconsistent.')
    total += entry.quantity
    return { ...entry, key: shoppingKey(entry) }
  })
  if (total > 999) throw Error('Maximum 999 pachete în listă.')
  return entries
}
