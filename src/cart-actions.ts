import { initialNutritionSources, initialSource, shoppingKey, shoppingTotals, type ShoppingEntry } from './shopping-list'
import type { Product } from './catalog'

export function productEntry(product: Product): ShoppingEntry {
  const entry = {
    product: structuredClone(product), packageAmount: product.packageAmount, packageUnit: product.packageUnit,
    unitsPerPack: product.unitsPerPack, amountSource: product.packageAmount === null ? 'unknown' as const : initialSource(product),
    nutrition: { ...product.nutrition }, nutritionSources: initialNutritionSources(product), quantity: 1,
  }
  return { ...entry, key: shoppingKey(entry) }
}

export function addPackage(entries: ShoppingEntry[], product: Product): ShoppingEntry[] | undefined {
  const next = structuredClone(entries)
  const item = productEntry(product)
  const existing = next.find(entry => entry.key === item.key)
  if (shoppingTotals(next).quantity >= 999 || (existing ? existing.quantity >= 99 : next.length >= 30)) return
  if (existing) existing.quantity++
  else next.push(item)
  return next
}

export function returnPackage(entries: ShoppingEntry[], index: number): ShoppingEntry[] | undefined {
  if (!Number.isInteger(index) || !entries[index]) return
  const next = structuredClone(entries)
  if (--next[index]!.quantity === 0) next.splice(index, 1)
  return next
}
