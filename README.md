# Nutrition — educational 3D store

Romanian-language nutrition game built with TypeScript, Three.js, Vite, and Supabase. Prepare a one-week shopping list to take to physical stores, with quantities and clearly sourced or incomplete nutrition totals. The 3D store is the backdrop for login, profile, product, and shopping-list panels. No online orders, payment processing, or checkout.

## Run locally

Use Node.js 22.12+ (or a newer supported LTS).

```sh
npm ci
npm run dev
```

`npm run build` type-checks the application and generates `dist/`. `npm run preview` serves the production build locally. Deploy `dist/` to a static host. There is no configured linter or third-party test framework.

With Node.js 24 LTS, run the native regression checks:

```sh
node /home/runner/work/sly-nutrition/sly-nutrition/tests/frontend-state.test.mjs
node --test /home/runner/work/sly-nutrition/sly-nutrition/supabase/tests/auth-boundaries.mjs
```

These cover cart/snapshot invariants and mocked authentication boundaries, not hosted end-to-end behavior. Database authorization regressions use native SQL as described below.

## Connected and demonstration modes

The Supabase project is external infrastructure: installing the application does not create a database, provision an administrator, send email, configure Google, or deploy account deletion automatically. Without configuration, the application offers an explicitly labelled local demonstration, not a simulated authenticated account or a locally trusted administrator.

Connected mode requires the database migrations, storage policies, authentication provider settings, and account-deletion function described below. Errors connecting to an already configured project must not silently substitute the demonstration catalog or claim data was saved.

Only the Supabase public/publishable browser key belongs in Vite configuration. Never expose a service-role/secret key through a `VITE_` variable, commit it, or send it to a player. Local `.env` files are ignored; `.env.example` documents the public configuration names.

### Launch prerequisites

- Configure an HTTPS application origin and exact approved authentication redirect URLs; include localhost only for development.
- Enable email confirmation and configure transactional email delivery and password-reset redirects. Test delivery before inviting players.
- Enable Google separately in Supabase and Google's console if desired; its client secret belongs in the provider configuration, not the browser bundle.
- Apply row-level-security policies before exposing any tables or storage. Hiding an admin button is not authorization.
- Assign the first administrator through a trusted server/database operation, never through an editable player profile.
- Deploy the authenticated account-deletion function with its server-only credentials.
- Verify with two real test accounts that profiles and lists are isolated, regular players cannot edit the catalog or assign roles, and archived/draft products and private images are not exposed.
- Review privacy, retention, hosting region, consent and deletion requirements before collecting real body measurements or launching commercially.

Live email, OAuth, cloud uploads, cloud persistence and remote account deletion require a configured project and cannot be established by a local build alone.

### Supabase deployment

1. Create a Supabase project. Apply `/home/runner/work/sly-nutrition/sly-nutrition/supabase/migrations/202610090001_foundation.sql` through the Supabase SQL editor or your migration deployment process. It creates the catalog, private player data, administrator membership, audit history and private `product-images` bucket with their policies.
2. Copy `/home/runner/work/sly-nutrition/sly-nutrition/.env.example` to a local ignored `.env.local`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or the legacy `VITE_SUPABASE_ANON_KEY`). Restart Vite after changes; production variables are included at build time, so rebuild for deployment.
3. Set the application's origin and permitted redirects in Supabase Auth. Enable email confirmation, configure SMTP, and test registration, confirmation and recovery. Set `VITE_GOOGLE_AUTH_ENABLED=true` only after configuring Google's OAuth provider and its authorized Supabase callback.
4. Register the intended administrator normally, verify the email, and obtain that user's UUID from the Auth dashboard. A trusted project operator can assign catalog administration in the SQL editor:

   ```sql
   insert into private.admin_users (user_id) values ('<verified-auth-user-uuid>');
   ```

   Never expose this operation to players or assign a role from signup metadata. To revoke catalog administration, delete this membership through the same trusted operator channel.
5. Deploy the `delete-account` Edge Function from `/home/runner/work/sly-nutrition/sly-nutrition/supabase/functions/delete-account/index.ts`. Set its `ALLOWED_ORIGIN` secret to the exact application origin, without a trailing slash. Supabase supplies its server-side URL and service-role environment variables; these must never enter the Vite environment. The function validates the bearer token with Auth and accepts no target user ID. Its configuration disables gateway JWT verification because verification happens explicitly inside the function.
6. Publish a store, position and publish its shelves, then publish products with source metadata. Upload authorized raster images through the admin UI. Store/shelf publication controls visibility of their descendants.
7. Deploy the Vite build over HTTPS and test the real email, OAuth, image, cross-user isolation and deletion flows before public release.

Optionally apply `/home/runner/work/sly-nutrition/sly-nutrition/supabase/seed.sql` after the migration to initialize the eight requested product names and retailer assignments. The seed supplies no verified nutrition or artwork: label values remain unknown. This is not automatic production content.

Catalog images are private storage objects accessed through expiring signed URLs, not arbitrary external images. Archiving a product prevents new public image authorizations; a previously issued signed URL may remain valid until expiry. Use the admin workflow to manage images and database records together.

Account deletion preserves shared catalog artwork by releasing the verified caller's ownership of `product-images` objects through a service-role-only operation. Ownership of files in unrelated buckets can still require operator reassignment before Supabase permits deletion. Abandoned uploads are not automatically collected: operators may remove only images that no product references, using the orphan-only storage policy.

### Database regression checks

Use a **disposable, empty PostgreSQL database**, never a live Supabase project, for `/home/runner/work/sly-nutrition/sly-nutrition/supabase/tests/bootstrap.sql`. It models only the Auth/Storage schema contracts needed by the authorization tests; it is not a Supabase emulator.

Run the bootstrap, then the migration, then `/home/runner/work/sly-nutrition/sly-nutrition/supabase/tests/rls.sql` with `psql -v ON_ERROR_STOP=1`, using a local test-database connection. The assertions exercise owner isolation, catalog roles, publication inheritance, image policies, audit integrity, validation and deletion. Keep test connection credentials outside the repository. Passing these checks does not verify hosted OAuth, email delivery or Storage API behavior.

## Level 1 — discover your estimated needs

- Choose a fictional adult profile, personal inputs, or education without a personal energy target.
- Learn the difference between resting energy (labelled estimated BMR in the interface) and estimated total daily energy expenditure (TDEE), including activity.
- Review an approximate reference for exploration, maintenance, or a moderate deficit. Lower intake and larger deficits never earn rewards.
- Personal deficit exploration is for eligible adults only. Minors, pregnancy/breastfeeding, relevant medical circumstances, and users who prefer not to disclose eligibility can use education without a personalized deficit.
- Body measurements are optional. Using them for a local estimate does not by itself authorize saving them; connected profile storage requires a separate explicit choice. Players can continue educationally without supplying measurements.
- Connected accounts can save their own weekly lists and permitted profile/progress settings. Shopping-list printing and text export exclude body measurements and energy estimates; an explicitly requested account-data export is a separate operation.
- Demo state is local to the session and is not cloud persistence. Supabase authentication uses shared browser storage for its session and PKCE verifier so account changes stay consistent across tabs and email links can open in a new tab in the same browser. This can keep a login after closing the browser; sign out on shared devices. Body measurements and shopping lists are not automatically saved to browser storage.

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
- Inspect the front and back of a package and explore nutrition values when available. Purchased package mass or volume is distinct from any portion used for nutrition comparisons. Administrators can supply sourced ingredients and allergens; the initial requested-name and demonstration entries do not provide verified labels.
- Add purchased packages to the weekly list, adjust quantities, and remove entries. Totals include energy, protein, fibre, and represented food groups; variety is not inferred from the number of retailer departments.
- Each list entry retains the product, retailer association, purchased quantity and unit, and nutrition values/provenance used when it was added. Unsaved edits and other product selections do not change it; “Editează eticheta / cantitatea netă” explicitly saves corrections to that entry. Merge only identical purchase/nutrition snapshots.
- Review and print the shopping list grouped by store, with product names, package quantities, and purchased mass or volume. Demonstration, pending-label, and manually entered information remain distinguishable in the list and exports.
- Product dialogs retain editable, equal-portion calorie and sugar comparisons with input validation and higher, lower, or equal results.
- Responsive controls, native keyboard-accessible dialogs, and reduced-motion support.
- Move a product into the cart or return one purchased package using drag-and-drop. Invalid drops must not modify the list; cancellation, undo and button/keyboard alternatives keep the interaction usable without dragging.
- Catalog changes must not retroactively rewrite saved shopping snapshots. Reusing a saved list retains the quantities, units, unknown values and provenance originally recorded.

The shopping list is a planning tool, not a food log, dietary prescription, or nutritionally complete meal plan. Purchased food may be shared or last longer than one week. Total groceries are not automatically compared against seven times a personal daily-energy estimate. Calories are neutral information, not a success score or spending allowance; protein, fibre, and food-group counts do not establish nutritional adequacy.

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

## Administration and publication

The data model separates stores, positioned shelves, products, private player profiles and saved lists. Administrators manage catalog content, not players' private body data. Product images and fields need validation; nutrition fields left unknown must remain unknown rather than become zero.

Use draft/preview/publish/archive workflows with audit history. Each store has nine addressable shelf slots (`0–8`), laid out top-to-bottom and left-to-right; active shelves cannot share a slot. A draft shelf reserves its slot; archiving that shelf releases it. Archiving a parent hides its descendants without changing their own states.

Images accept JPEG, PNG or WebP up to 5 MB and 32–4096 pixels per side. Upload processing validates headers before decoding and re-encodes the image, stripping original metadata. SVG/HTML and arbitrary image URLs are not supported. Image objects use immutable random paths; replacing a photo does not overwrite another product's artwork. Remove only unreferenced objects through authorized storage maintenance.

The audit interface displays up to 100 recent changes for the selected catalog record, not the entire history, and never displays player health data. Archive catalog entries rather than changing historical player shopping snapshots.

## Engagement and commercial boundaries

Educational missions reward exploring labels, equal-portion comparisons and organizing a list. Cosmetic choices do not depend on body measurements, reduced calorie intake or larger deficits. There are no absence penalties or weight-loss leaderboards.

The core planner is free in this implementation. Family organization, premium personalization, retailer partnerships and transparently labelled affiliate links are future commercial options, not active subscriptions or promised revenue. No payment processor or billing entitlement is implemented. Sponsorship must never change nutrition calculations or source status, and health/profile data must not be used for advertising or sold.