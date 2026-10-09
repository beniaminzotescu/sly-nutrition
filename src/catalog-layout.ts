import type { Department } from './catalog'

export function shelfCoordinates(slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 8) throw Error('Poziție de raft invalidă.')
  return { x: 110 + slot % 3 * 290, y: 205 + Math.floor(slot / 3) * 270 }
}
export function roomBottom(departments: Department[]) {
  return Math.max(568, ...departments.map(item => (item.y ?? 205) + 363))
}
export function canTraverse(departments: Department[], x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 45 || x > 915 || y < 132 || y > roomBottom(departments)) return false
  // The footprint includes both avatar and trolley in every camera heading.
  return !departments.some(shelf => x + 53 > shelf.x && x - 53 < shelf.x + 165 &&
    y + 53 > (shelf.y ?? 205) && y - 53 < (shelf.y ?? 205) + 160)
}
