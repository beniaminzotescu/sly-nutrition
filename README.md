# SLY Nutrition

Romanian-language virtual store prototype built with TypeScript and Vite. Explore as a visible player with a trolley, inspect product concepts, and collect portions in a calorie-based demonstration cart. No purchases, checkout, account, or backend.

## Run locally

Use Node.js 22.12+ (or a newer supported LTS).

```sh
npm ci
npm run dev
```

`npm run build` type-checks the application and generates `dist/`. `npm run preview` serves the production build locally. Deploy `dist/` to a static host. There is no configured lint or automated test suite.

## Virtual store

- Enter an elevated-view store with a visible player, trolley, and three wafer-flavor shelves.
- Explore using arrow keys / WASD or on-screen direction controls. Accessible product buttons provide an alternative to moving through the store.
- Inspect the front and back of a concept package, select a portion, and explore illustrative nutrition values. Real ingredients and allergens are not available in this prototype.
- Add portions to the trolley and remove them again. The cart shows quantities, portion sizes, and total illustrative kcal, never currency or a checkout button.
- Each cart entry retains the portion and nutrition values used when it was added; later input edits do not change existing entries.
- Product dialogs retain editable, equal-portion calorie and sugar comparisons with input validation and higher, lower, or equal results.
- Responsive controls, native keyboard-accessible dialogs, and reduced-motion support.

The cart is an exploration tool, not a food log or recommended intake. Calories are neutral information, not a score, target, or spending limit. State stays in memory and resets on page reload.

## Content boundaries

The packaging illustrations are original CSS concepts, not official product photographs. Nutrition values are explicitly illustrative; they must not be presented as verified SLY data. Comparisons use `(comparison value − alternative value) × portion / 100`, with both products measured at the same portion size. Cart energy uses `kcal per 100 g × portion in g / 100 × quantity`, summed across entries without rounding intermediate values.

Public search results identified SLY wafer varieties in cacao, vanilla, and hazelnut. The official site and retailer pages could not be retrieved directly during development, so no purported label values were adopted. Before launch, obtain approved artwork, current ingredient and allergen lists, and nutrition labels from [SLY Nutrition](https://slynutrition.eu/). Replace demo inputs with verified, sourced data and identify the comparison product.

This is an independent concept, not an official brand launch or nutritional advice. No weight-loss or medical outcomes are promised. Fonts currently load from Google Fonts, with local system fallbacks; self-host approved font files if third-party requests must be eliminated.