import type { ShoppingEntry } from './shopping-list'

export type CatalogStatus = 'draft' | 'published' | 'archived'
export type StoreRow = { id: string; name: string; status: CatalogStatus }
export type ShelfRow = { id: string; store_id: string; name: string; slot: number; status: CatalogStatus }
export type ProductRow = {
  id: string; shelf_id: string; name: string; group_name: string; color: string
  shape: 'box' | 'can' | 'bottle' | 'tray' | 'wafer' | 'pasta'
  package_amount: number | null; package_unit: 'g' | 'ml'; units_per_pack: number; portion: number
  nutrition: { calories: number | null; protein: number | null; fibre: number | null; sugar: number | null }
  image_path: string | null; ingredients: string | null; allergens: string | null; source: string
  status: CatalogStatus; label_verified: boolean
}
export type CloudCatalog = { stores: StoreRow[]; shelves: ShelfRow[]; products: ProductRow[] }
export type BodyProfile = { age: number; height: number; weight: number; coefficient: 5 | -161; activity: number }
export type PlayerProgress = { level: number; completed: string[] }
export type ProfileRow = {
  user_id: string; display_name: string; avatar_color: string; progress: PlayerProgress
  body_profile: BodyProfile | null; body_consent_at: string | null
}
export type SavedListRow = { id: string; user_id: string; name: string; entries: ShoppingEntry[]; created_at: string; updated_at: string }
export type AuditRow = { id: number; actor_id: string | null; table_name: string; record_id: string; action: string; old_data: unknown; new_data: unknown; created_at: string }
export type Role = 'player' | 'admin'
export type CatalogTable = 'stores' | 'shelves' | 'products'
export type CatalogRows = { stores: StoreRow; shelves: ShelfRow; products: ProductRow }
