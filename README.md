# Nutrition — educational 3D store

Romanian-language nutrition game built with TypeScript, Three.js, and Vite. Level 1 introduces resting-energy and daily-energy estimates before unlocking an educational 3D store. Prepare a one-week shopping list to take to physical stores, with quantities and illustrative nutrition totals. No online orders, payment, checkout, account, or backend.

## Run locally

Use Node.js 22.12+ (or a newer supported LTS).

```sh
npm ci
npm run dev
```

`npm run build` type-checks the application and generates `dist/`. `npm run preview` serves the production build locally. Deploy `dist/` to a static host. There is no configured lint or automated test suite.

## Level 1 — discover your estimated needs

- Choose a fictional adult profile, personal inputs, or education without a personal energy target.
- Learn the difference between resting energy (labelled estimated BMR in the interface) and estimated total daily energy expenditure (TDEE), including activity.
- Review an approximate reference for exploration, maintenance, or a moderate deficit. Lower intake and larger deficits never earn rewards.
- Personal deficit exploration is for eligible adults only. Minors, pregnancy/breastfeeding, relevant medical circumstances, and users who prefer not to disclose eligibility can use education without a personalized deficit.
- Profile inputs and the shopping list remain in page memory only. No profile information is sent to a server, added to URLs, or saved to browser storage. An explicitly requested list export must exclude personal measurements and energy estimates.

### Estimation limits

The Mifflin–St Jeor equation estimates resting energy expenditure: `10 × weight (kg) + 6.25 × height (cm) − 5 × age (years) + coefficient`, with the published coefficients `+5` and `−161`. These equation categories are not gender identity. The result is not a measured metabolic rate or a medical test.

Reference: Mifflin et al., *A new predictive equation for resting energy expenditure in healthy individuals* (1990), [doi:10.1093/ajcn/51.2.241](https://doi.org/10.1093/ajcn/51.2.241). The reference could not be retrieved from this development environment.

Activity multipliers are rough educational assumptions, not individualized measurements. TDEE and any deficit reference are estimates, not a prescribed intake. Form limits and eligibility restrictions are prototype safeguards, not diagnostic rules or guarantees that a target is appropriate. Seek qualified professional guidance for individual dietary needs; the educational route does not require personal measurements.

## Virtual store and weekly shopping list

- Enter a WebGL-rendered 3D store with a visible player, trolley, and Lidl, Metro, and Kaufland departments. The original futuristic supermarket scene uses a following camera and an overview option; it is not a recreation of GTA or a photorealistic commercial game.
- Retailer departments are independent concepts, not confirmed collaborations. Requested products appear with unverified labels and availability clearly identified; a user-supplied name is not an approved nutrition source.
- A separate generic demonstration workshop provides illustrative foods for testing the shopping-list experience without attributing them to a retailer.
- Explore using arrow keys / WASD or on-screen direction controls. Accessible product buttons provide an alternative to moving through the store.
- Rotate the camera using the view buttons or Q/R, switch between follow and overview with V, click a 3D department, or press E near one to explore its selection. The same camera actions have touch controls.
- Inspect the front and back of a concept package and explore nutrition values when available. Purchased package mass or volume is distinct from any portion used for nutrition comparisons. Real ingredients and allergens are not available in this prototype.
- Add purchased packages to the weekly list, adjust quantities, and remove entries. Totals include energy, protein, fibre, and represented food groups; variety is not inferred from the number of retailer departments.
- Each list entry retains the product, retailer association, purchased quantity and unit, and nutrition values/provenance used when it was added. Unsaved edits and other product selections do not change it; “Editează eticheta / cantitatea netă” explicitly saves corrections to that entry. Merge only identical purchase/nutrition snapshots.
- Review and print the shopping list grouped by store, with product names, package quantities, and purchased mass or volume. Demonstration, pending-label, and manually entered information remain distinguishable in the list and exports.
- Product dialogs retain editable, equal-portion calorie and sugar comparisons with input validation and higher, lower, or equal results.
- Responsive controls, native keyboard-accessible dialogs, and reduced-motion support.

The shopping list is a planning tool, not a food log, dietary prescription, or nutritionally complete meal plan. Purchased food may be shared or last longer than one week. Total groceries are not automatically compared against seven times a personal daily-energy estimate. Calories are neutral information, not a success score or spending allowance; protein, fibre, and food-group counts do not establish nutritional adequacy. State resets on page reload.

The 3D view requires WebGL2. If it is unavailable or its context is lost, a 2D store and accessible product controls keep inspection and cart interactions available.

## Requested retailer products

These eight entries reflect the requested names and retailer assignments, not verified stock, nutrition, or universal suitability:

| Department | Requested product | Known package information |
| --- | --- | --- |
| Metro | GOLFERA Piept Curcan Feliat 80 g | 80 g |
| Metro | REGGIA Tortellini cu Carne 500 g | 500 g |
| Metro | COCA-COLA Zero Cofeina Doza SGR 4 x 0,33 L | 4 × 330 ml = 1,320 ml per multipack |
| Metro | COCA-COLA ZERO ZAHAR Doza SGR 12 x 0,25 L | 12 × 250 ml = 3,000 ml per multipack |
| Lidl | Biscuiți de Crăciun cocos/migdale | Size and exact variant to confirm |
| Lidl | Ulei de măsline extravirgin / rafinat și virgin | Volume and exact variant to confirm |
| Kaufland | Napolitana cu crema cu cacao Sly, fara zahar, 20 g | 20 g |
| Kaufland | Napolitana cu crema cu vanilie Sly, fara zahar, 20 g | 20 g |

Missing nutrition or package sizes are unknown, not zero. Such items can still be planned by name and count. Totals must identify incomplete information per nutrient rather than imply that a partial sum is the total energy of the basket. Explicitly entered zero is distinct from a blank field. Product-name claims such as “ZERO ZAHAR” are preserved as supplied names, not adopted as verified nutrient values.

Drinks use millilitres and nutrition per 100 ml. Solids use grams and nutrition per 100 g. Do not convert between mass and volume without a sourced density. A shopping quantity for a cola multipack counts multipacks, not individual cans. Comparison portions remain separate and use the same unit for both examples.

## Content boundaries

Packaging illustrations are original concepts, not official product photographs. Demonstration and manually entered nutrition values must never be presented as verified product data. Comparisons use `(comparison value − alternative value) × portion / 100`, with both products measured at the same portion size and unit. Shopping totals use `value per 100 units × net units per package / 100 × package count`, summed across known entries without rounding intermediate values; unknown contributions remain explicitly excluded. A portion comparison must not silently change the purchased package size.

Before promoting requested entries to verified products, obtain current nutrition labels, ingredients/allergens, provenance, permission for any artwork, and confirmation of the retailer association. Record portion units and food groups consistently. Curate products for balanced-meal exploration without claiming that any food is universally healthy, suitable for every medical condition, or allergen-free.

This is an independent concept, not an official retailer launch or nutritional advice. No weight-loss or medical outcomes are promised.