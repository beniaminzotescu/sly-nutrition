export type DepartmentId = string
export type FoodGroup = string
export type Nutrition = { calories: number | null; protein: number | null; fibre: number | null; sugar: number | null }
export type AmountUnit = 'g' | 'ml'
type ProductBase = {
  id: string
  name: string
  group: FoodGroup
  color: string
  shape?: 'box' | 'can' | 'bottle' | 'tray' | 'wafer' | 'pasta'
  portion: number
  packageAmount: number | null
  packageUnit: AmountUnit
  unitsPerPack: number
  nutrition: Nutrition
  departmentName?: string
  imageUrl?: string
  imagePath?: string
  ingredients?: string | null
  allergens?: string | null
}
export type Product = ProductBase & (
  | { department: 'atelier'; readiness: 'illustrative'; provenance: { status: 'illustrative'; source: string } }
  | { department: DepartmentId; readiness: 'approved'; provenance: { status: 'verified-label'; source: string } }
  | { department: DepartmentId; readiness: 'requested'; provenance: { status: 'pending-label'; source: string } }
)
export type Department = { id: DepartmentId; name: string; number: string; x: number; y?: number; color: string }

export const departments: Department[] = [
  { id: 'lidl', name: 'Lidl', number: '01', x: 110, color: 'grain' },
  { id: 'metro', name: 'Metro', number: '02', x: 400, color: 'leaf' },
  { id: 'kaufland', name: 'Kaufland', number: '03', x: 690, color: 'clay' },
]

const unknownNutrition = (): Nutrition => ({ calories: null, protein: null, fibre: null, sugar: null })
const pending = () => ({ status: 'pending-label' as const, source: 'Adăugat la cerere; etichetă și disponibilitate de verificat' })
export const retailerCatalog: Product[] = [
  { id: 'golfera-turkey', name: 'GOLFERA Piept Curcan Feliat 80 g', department: 'metro', group: 'Carne', color: 'clay', shape: 'tray', portion: 40, packageAmount: 80, packageUnit: 'g', unitsPerPack: 1, readiness: 'requested', nutrition: unknownNutrition(), provenance: pending() },
  { id: 'reggia-tortellini', name: 'REGGIA Tortellini cu Carne 500 g', department: 'metro', group: 'Paste', color: 'grain', shape: 'pasta', portion: 150, packageAmount: 500, packageUnit: 'g', unitsPerPack: 1, readiness: 'requested', nutrition: unknownNutrition(), provenance: pending() },
  { id: 'cola-zero-caffeine', name: 'COCA-COLA Zero Cofeina Doza SGR 4 x 0,33 L', department: 'metro', group: 'Băuturi', color: 'clay', shape: 'can', portion: 250, packageAmount: 330, packageUnit: 'ml', unitsPerPack: 4, readiness: 'requested', nutrition: unknownNutrition(), provenance: pending() },
  { id: 'cola-zero-sugar', name: 'COCA-COLA ZERO ZAHAR Doza SGR 12 x 0,25 L', department: 'metro', group: 'Băuturi', color: 'clay', shape: 'can', portion: 250, packageAmount: 250, packageUnit: 'ml', unitsPerPack: 12, readiness: 'requested', nutrition: unknownNutrition(), provenance: pending() },
  { id: 'lidl-christmas-biscuits', name: 'Biscuiți de Crăciun cocos/migdale', department: 'lidl', group: 'Biscuiți', color: 'grain', shape: 'box', portion: 30, packageAmount: null, packageUnit: 'g', unitsPerPack: 1, readiness: 'requested', nutrition: unknownNutrition(), provenance: pending() },
  { id: 'lidl-olive-oil', name: 'Ulei de măsline extravirgin / rafinat și virgin', department: 'lidl', group: 'Ulei', color: 'leaf', shape: 'bottle', portion: 10, packageAmount: null, packageUnit: 'ml', unitsPerPack: 1, readiness: 'requested', nutrition: unknownNutrition(), provenance: pending() },
  { id: 'sly-cocoa-wafer', name: 'Napolitana cu crema cu cacao Sly, fara zahar, 20 g', department: 'kaufland', group: 'Napolitane', color: 'clay', shape: 'wafer', portion: 20, packageAmount: 20, packageUnit: 'g', unitsPerPack: 1, readiness: 'requested', nutrition: unknownNutrition(), provenance: pending() },
  { id: 'sly-vanilla-wafer', name: 'Napolitana cu crema cu vanilie Sly, fara zahar, 20 g', department: 'kaufland', group: 'Napolitane', color: 'milk', shape: 'wafer', portion: 20, packageAmount: 20, packageUnit: 'g', unitsPerPack: 1, readiness: 'requested', nutrition: unknownNutrition(), provenance: pending() },
]
export const demoCatalog: Extract<Product, { readiness: 'illustrative' }>[] = [
  { id: 'oats', name: 'Fulgi de ovăz', group: 'Cereale', department: 'atelier', readiness: 'illustrative', color: 'grain', portion: 40, packageAmount: 500, packageUnit: 'g', unitsPerPack: 1, nutrition: { calories: 370, protein: 13, fibre: 10, sugar: 1 }, provenance: { status: 'illustrative', source: 'Exemplu didactic editabil, nu etichetă verificată' } },
  { id: 'lentils', name: 'Linte fiartă', group: 'Leguminoase', department: 'atelier', readiness: 'illustrative', color: 'clay', portion: 150, packageAmount: 400, packageUnit: 'g', unitsPerPack: 1, nutrition: { calories: 116, protein: 9, fibre: 8, sugar: 2 }, provenance: { status: 'illustrative', source: 'Exemplu didactic editabil, nu etichetă verificată' } },
  { id: 'yogurt', name: 'Iaurt simplu', group: 'Lactate', department: 'atelier', readiness: 'illustrative', color: 'milk', portion: 150, packageAmount: 150, packageUnit: 'g', unitsPerPack: 1, nutrition: { calories: 60, protein: 4, fibre: 0, sugar: 4 }, provenance: { status: 'illustrative', source: 'Exemplu didactic editabil, nu etichetă verificată' } },
  { id: 'vegetables', name: 'Legume, exemplu generic', group: 'Legume', department: 'atelier', readiness: 'illustrative', color: 'leaf', portion: 200, packageAmount: 1000, packageUnit: 'g', unitsPerPack: 1, nutrition: { calories: 35, protein: 2, fibre: 3, sugar: 3 }, provenance: { status: 'illustrative', source: 'Exemplu didactic editabil, nu etichetă verificată' } },
]
