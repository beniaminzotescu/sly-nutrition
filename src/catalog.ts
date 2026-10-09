export type DepartmentId = 'lidl' | 'metro' | 'kaufland'
export type FoodGroup = 'Cereale' | 'Leguminoase' | 'Lactate' | 'Legume'
export type Nutrition = { calories: number; protein: number; fibre: number; sugar: number }
type ProductBase = {
  id: string
  name: string
  group: FoodGroup
  color: string
  portion: number
  packageGrams: number
  nutrition: Nutrition
}
export type Product = ProductBase & (
  | { department: 'atelier'; readiness: 'illustrative'; provenance: { status: 'illustrative'; source: string } }
  | { department: DepartmentId; readiness: 'approved'; provenance: { status: 'verified-label'; source: string } }
)
export type Department = { id: DepartmentId; name: string; number: string; x: number; color: string }

export const departments: Department[] = [
  { id: 'lidl', name: 'Lidl', number: '01', x: 110, color: 'grain' },
  { id: 'metro', name: 'Metro', number: '02', x: 400, color: 'leaf' },
  { id: 'kaufland', name: 'Kaufland', number: '03', x: 690, color: 'clay' },
]

// Only populate with approved product labels, source and food-group categorization.
export const retailerCatalog: Extract<Product, { readiness: 'approved' }>[] = []
export const demoCatalog: Extract<Product, { readiness: 'illustrative' }>[] = [
  { id: 'oats', name: 'Fulgi de ovăz', group: 'Cereale', department: 'atelier', readiness: 'illustrative', color: 'grain', portion: 40, packageGrams: 500, nutrition: { calories: 370, protein: 13, fibre: 10, sugar: 1 }, provenance: { status: 'illustrative', source: 'Exemplu didactic editabil, nu etichetă verificată' } },
  { id: 'lentils', name: 'Linte fiartă', group: 'Leguminoase', department: 'atelier', readiness: 'illustrative', color: 'clay', portion: 150, packageGrams: 400, nutrition: { calories: 116, protein: 9, fibre: 8, sugar: 2 }, provenance: { status: 'illustrative', source: 'Exemplu didactic editabil, nu etichetă verificată' } },
  { id: 'yogurt', name: 'Iaurt simplu', group: 'Lactate', department: 'atelier', readiness: 'illustrative', color: 'milk', portion: 150, packageGrams: 150, nutrition: { calories: 60, protein: 4, fibre: 0, sugar: 4 }, provenance: { status: 'illustrative', source: 'Exemplu didactic editabil, nu etichetă verificată' } },
  { id: 'vegetables', name: 'Legume, exemplu generic', group: 'Legume', department: 'atelier', readiness: 'illustrative', color: 'leaf', portion: 200, packageGrams: 1000, nutrition: { calories: 35, protein: 2, fibre: 3, sugar: 3 }, provenance: { status: 'illustrative', source: 'Exemplu didactic editabil, nu etichetă verificată' } },
]
