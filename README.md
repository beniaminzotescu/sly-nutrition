# SLY Nutrition

Romanian-language presentation prototype built with TypeScript and Vite. No cart, checkout, account, or backend.

## Run locally

Use Node.js 22.12+ (or a newer supported LTS).

```sh
npm ci
npm run dev
```

`npm run build` type-checks the application and generates `dist/`. `npm run preview` serves the production build locally. Deploy `dist/` to a static host. There is no configured lint or automated test suite.

## First iteration

- Animated virtual product display and three wafer flavors.
- Optional habit-goal journey, kept in memory for the current page session.
- Product dialogs with an equal-portion calorie and sugar comparison.
- Editable per-100 g values, portion slider, input validation, and support for higher, lower, or equal results.
- Responsive layouts, native keyboard-accessible dialogs, and reduced-motion support.

## Content boundaries

The packaging illustrations are original CSS concepts, not official product photographs. Nutrition values are explicitly illustrative and reset on each product selection; they must not be presented as verified SLY data. Calculations use `(comparison value − alternative value) × portion / 100`, with both products measured at the same portion size.

Public search results identified SLY wafer varieties in cacao, vanilla, and hazelnut. The official site and retailer pages could not be retrieved directly during development, so no purported label values were adopted. Before launch, obtain approved artwork, current ingredient and allergen lists, and nutrition labels from [SLY Nutrition](https://slynutrition.eu/). Replace demo inputs with verified, sourced data and identify the comparison product.

This is an independent concept, not an official brand launch or nutritional advice. No weight-loss or medical outcomes are promised. Fonts currently load from Google Fonts, with local system fallbacks; self-host approved font files if third-party requests must be eliminated.