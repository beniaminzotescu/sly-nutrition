import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// Node 22's native TypeScript loader needs explicit extensions; Vite does not.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.endsWith('.ts') && specifier.startsWith('./') && !/\.\w+$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context)
    }
    return nextResolve(specifier, context)
  },
})
const { retailerCatalog, demoCatalog } = await import('../src/catalog.ts')
const { productEntry, addPackage, returnPackage } = await import('../src/cart-actions.ts')
const { validateShoppingEntries } = await import('../src/snapshot-validation.ts')
const { shoppingTotals, shoppingText } = await import('../src/shopping-list.ts')
const { estimateAdult, moderateReference } = await import('../src/nutrition.ts')
const { shelfCoordinates, canTraverse, roomBottom } = await import('../src/catalog-layout.ts')

const product = retailerCatalog.find(item => item.id === 'cola-zero-caffeine')
const original = [productEntry(product)]
original[0].quantity = 3
const before = structuredClone(original)
const returned = returnPackage(original, 0)
assert.deepEqual(original, before)
assert.equal(returned[0].quantity, 2)
assert.equal(shoppingTotals(original).millilitres.known, 3960)
assert.equal(shoppingTotals(returned).millilitres.known, 2640)
assert.equal(shoppingTotals(original).calories.unknown, 1)
assert.deepEqual(returnPackage([productEntry(product)], 0), [])
assert.equal(returnPackage(original, -1), undefined)
assert.equal(returnPackage(original, 0.5), undefined)
const added = addPackage(original, product)
assert.equal(added[0].quantity, 4)
assert.deepEqual(original, before)
const capped = [productEntry(product)]
capped[0].quantity = 99
assert.equal(addPackage(capped, product), undefined)
const all = retailerCatalog.map(productEntry)
for (const entry of all) entry.quantity = 99
all.push(...demoCatalog.map(productEntry))
for (const entry of all) entry.quantity = 99
assert.equal(addPackage(all, product), undefined)

const changes = [
  entries => { entries[0].quantity = 100 },
  entries => { entries[0].quantity = 1.5 },
  entries => { entries[0].nutrition.protein = NaN },
  entries => { entries[0].nutrition.sugar = Infinity },
  entries => { entries[0].nutritionSources.sugar = 'evil' },
  entries => { entries[0].packageUnit = 'kg' },
  entries => { entries[0].product.department = '<img src=x>' },
  entries => { entries[0].product.provenance.status = 'verified-label' },
  entries => { entries[0].unitsPerPack = 0 },
  entries => { entries[0].product.name = 'x'.repeat(201) },
  entries => { entries[0].amountSource = 'unknown' },
  entries => { entries[0].product.portion = 7 },
]
for (const change of changes) {
  const invalid = structuredClone(original)
  change(invalid)
  assert.throws(() => validateShoppingEntries(invalid))
}
assert.throws(() => validateShoppingEntries({ entries: original }))
assert.throws(() => validateShoppingEntries(Array(31).fill(original[0])))
const snapshot = validateShoppingEntries(original)
snapshot[0].product.departmentName = 'Magazin din snapshot / Raft nou'
snapshot[0].product.imageUrl = 'https://unapproved.example/image'
const loaded = validateShoppingEntries(snapshot)
assert.equal(loaded[0].product.imageUrl, undefined)
assert.equal(loaded[0].nutrition.calories, null)
assert.match(shoppingText(loaded), /MAGAZIN DIN SNAPSHOT \/ RAFT NOU/)
assert.match(shoppingText(loaded), /necunoscut/)
assert.doesNotMatch(shoppingText(loaded), /body_profile|bmi|height|weight|email/)
loaded[0].product.name = 'Nume schimbat'
assert.deepEqual(original, before)

const adult = { age: 30, height: 170, weight: 70, coefficient: 5 }
assert.equal(estimateAdult(adult, 1.2).bmr, 1617.5)
assert.equal(estimateAdult({ ...adult, age: 17 }, 1.2), undefined)
assert.equal(estimateAdult({ ...adult, age: 66 }, 1.2).deficitEligible, false)
assert.equal(estimateAdult({ ...adult, weight: 40 }, 1.2).deficitEligible, false)
assert.equal(moderateReference(estimateAdult(adult, 1.2), 30), undefined)
const shelves = Array.from({ length: 9 }, (_, slot) => ({ id: `shelf-${slot}`, name: `Raft ${slot}`, number: String(slot), color: 'grain', ...shelfCoordinates(slot) }))
assert.equal(new Set(shelves.map(shelf => `${shelf.x},${shelf.y}`)).size, 9)
for (const shelf of shelves) {
  assert.equal(canTraverse(shelves, shelf.x + 82, shelf.y + 80), false)
  assert.equal(canTraverse(shelves, shelf.x + 82, shelf.y - 52), false)
  assert.equal(canTraverse(shelves, shelf.x + 82, shelf.y - 55), true)
}
assert.equal(canTraverse(shelves, 470, roomBottom(shelves) - 43), true)
assert.equal(canTraverse(shelves, 470, roomBottom(shelves) + 1), false)
assert.throws(() => shelfCoordinates(9))
assert.throws(() => shelfCoordinates(-1))
console.log('Frontend state tests passed: immutable package actions, multipacks, unknown nutrients, limits, untrusted snapshots, dynamic groups, privacy and adult safeguards.')
