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

- Enter a WebGL-rendered 3D store with a visible player, trolley, and Lidl, Metro, and Kaufland departments.
- Retailer departments are independent concepts, not confirmed collaborations. Their product selections will be populated gradually from approved, sourced labels; empty departments must not imply current availability.
- A separate generic demonstration workshop provides illustrative foods for testing the shopping-list experience without attributing them to a retailer.
- Explore using arrow keys / WASD or on-screen direction controls. Accessible product buttons provide an alternative to moving through the store.
- Rotate the camera using the view buttons, click a 3D department, or press E near one to explore its selection.
- Inspect the front and back of a concept package and explore illustrative nutrition values. Purchased package weight is distinct from any portion used for nutrition comparisons. Real ingredients and allergens are not available in this prototype.
- Add purchased packages to the weekly list, adjust quantities, and remove entries. Totals include energy, protein, fibre, and represented food groups; variety is not inferred from the number of retailer departments.
- Each list entry retains the product, retailer association, purchased package weight, and all nutrition values used when it was added; later input edits do not change existing entries. Merge only identical purchase/nutrition snapshots.
- Review and print the shopping list grouped by store, with product names, package quantities, and purchased weights. Generic demonstration entries remain explicitly separate from verified retailer products in the list and any export.
- Product dialogs retain editable, equal-portion calorie and sugar comparisons with input validation and higher, lower, or equal results.
- Responsive controls, native keyboard-accessible dialogs, and reduced-motion support.

The shopping list is a planning tool, not a food log, dietary prescription, or nutritionally complete meal plan. Purchased food may be shared or last longer than one week. Total groceries are not automatically compared against seven times a personal daily-energy estimate. Calories are neutral information, not a success score or spending allowance; protein, fibre, and food-group counts do not establish nutritional adequacy. State resets on page reload.

The 3D view requires WebGL2. If it is unavailable or its context is lost, a 2D store and accessible product controls keep inspection and cart interactions available.

## Content boundaries

Packaging illustrations are original concepts, not official product photographs. Demonstration nutrition values must never be presented as verified product data. Comparisons use `(comparison value − alternative value) × portion / 100`, with both products measured at the same portion size. Shopping totals use `value per 100 g × package net weight in g / 100 × package count`, summed across entries without rounding intermediate values. A portion comparison must not silently change the purchased package weight.

Before adding real retailer products, obtain current nutrition labels, ingredients/allergens, provenance, permission for any artwork, and confirmation of the retailer association. Record portion units and food groups consistently. Curate products for balanced-meal exploration without claiming that any food is universally healthy, suitable for every medical condition, or allergen-free.

This is an independent concept, not an official retailer launch or nutritional advice. No weight-loss or medical outcomes are promised.