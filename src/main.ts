import './style.css'
import { departments, demoCatalog, retailerCatalog, type Department, type Nutrition, type Product } from './catalog'
import { createGame } from './game'
import { mountOnboarding } from './onboarding'
import { format, type Reference } from './nutrition'
import { demoNotice, shoppingGroups, shoppingKey, shoppingNotice, shoppingText, shoppingTotals, type ShoppingEntry } from './shopping-list'

const miniPack = (product: Product) => `<span class="mini-pack ${product.color}" aria-hidden="true">✳</span>`
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <a class="skip-link" href="#journey">Sari la conținut</a>
  <header class="header"><a class="logo" href="./" aria-label="Atelier de mese, reîncepe">a<span>ATELIER<br>DE MESE</span><i>✳</i></a><span class="header-label">UN MIC MAGAZIN. O LISTĂ MAI CLARĂ.</span><span class="session-badge">Planificare · fără comenzi</span></header>
  <main id="journey" tabindex="-1">
    <section class="intro"><div><span class="eyebrow">PLANUL TĂU DE CUMPĂRĂTURI / O SĂPTĂMÂNĂ</span><h1>La raft, <em>în ritmul tău.</em></h1></div><p>Explorează, alege cantități, pregătește lista.<br>Apoi ia-o cu tine <strong>la magazinul fizic.</strong></p></section>
    <p class="independent-notice">Concept educațional independent, fără afiliere, aprobare sau parteneriat cu Lidl, Metro ori Kaufland. Numele desemnează departamente viitoare; nu un catalog comercial actual.</p>
    <section id="onboarding" class="onboarding" aria-label="Nivelul 1: profil, energie și intenție"></section>
    <section id="store" hidden inert aria-label="Nivelul 2: magazinul de explorat">
      <div class="store-session"><div><span class="eyebrow">NIVELUL 2 / ALEGERI LA RAFT</span><p id="session-summary"></p></div><button class="text-button" id="edit-profile">Schimbă profilul / resetează sesiunea</button></div>
      <div class="store-layout">
        <section class="store-panel" aria-label="Explorează magazinul">
          <div class="store-topline"><span><i class="status-dot"></i> ATELIER DE MESE</span><span>3 DEPARTAMENTE · 3D</span></div>
          <div class="scene-viewport">
            <div class="scene-3d" id="scene-mount" aria-hidden="true"></div>
            <div id="store-world" class="store-world" tabindex="-1" role="region" aria-label="Magazin. Deplasează-te cu săgețile sau WASD. E lângă un raft." aria-describedby="movement-help">
              <div class="back-wall" aria-hidden="true"><strong>Atelier <small>DE MESE</small></strong><p>O lume de descoperit. ✳</p></div>
              <div class="floor" aria-hidden="true"></div>
              ${departments.map(department => {
                const products = retailerCatalog.filter(product => product.department === department.id)
                return `<button class="shelf ${department.color}" style="left:${department.x}px" data-department="${department.id}" disabled aria-label="Departament ${department.name} · ${products.length ? 'explorează selecția' : 'produse în curând'}"><span class="shelf-sign"><small>${department.number} / DEPARTAMENT</small><strong>${department.name}</strong></span>${products.length ? `<span class="shelf-products">${products.slice(0, 6).map(miniPack).join('')}</span>` : '<span class="empty-shelf">Produse în curând</span>'}<span class="shelf-lip">SELECȚIE PENTRU MESE</span></button>`
              }).join('')}
              <div class="entrance-mat" aria-hidden="true">↑ INTRARE ↑</div>
              <div id="player" class="player" aria-hidden="true"><div class="player-shadow"></div><div class="avatar"><div class="avatar-legs"><i></i><i></i></div><div class="avatar-body"></div><div class="avatar-head"></div><div class="avatar-hair"></div><div class="avatar-arm"></div></div><div class="trolley"><span class="trolley-handle"></span><div id="trolley-packs"></div><span class="basket-grid"></span><i class="wheel wheel-one"></i><i class="wheel wheel-two"></i><b id="trolley-count" hidden>0</b></div><span class="player-label">TU</span></div>
            </div>
            <div class="camera-controls" role="group" aria-label="Vedere 3D"><span>VEDERE</span><button data-camera="-1" aria-label="Rotește vederea la stânga" disabled>↶</button><button data-camera="1" aria-label="Rotește vederea la dreapta" disabled>↷</button></div>
            <span class="scene-demo">RAFTURI ÎN PREGĂTIRE · CONCEPT INDEPENDENT</span>
          </div>
          <p class="webgl-notice" id="webgl-notice" role="status" hidden>3D nu este disponibil. Poți explora magazinul 2D sau folosi butoanele directe; atelierul și căruciorul funcționează în continuare.</p>
          <div class="game-controls"><div><strong id="location" role="status">Căruciorul te așteaptă.</strong><p id="movement-help"><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd> mers · <kbd>E</kbd> la raft<br>Sau folosește accesul direct de mai jos.</p></div><button class="button" id="inspect-nearby" disabled>Apropie-te de un raft</button><div class="direction-pad" role="group" aria-label="Deplasare cu atingere">${[['up', '↑', 'înainte'], ['left', '←', 'la stânga'], ['down', '↓', 'înapoi'], ['right', '→', 'la dreapta']].map(([direction, symbol, name]) => `<button data-direction="${direction}" aria-label="Mergi ${name}" disabled>${symbol}</button>`).join('')}</div></div>
          <div class="section-heading"><h2>Departamente</h2><span>Acces direct, fără deplasare</span></div>
          <div class="department-shortcuts">${departments.map(department => `<button class="department-card" data-department="${department.id}" disabled><small>${department.number} / DEPARTAMENT</small><strong>${department.name} ↗</strong><span>${retailerCatalog.some(product => product.department === department.id) ? 'Explorează selecția' : 'Produse în curând'}</span></button>`).join('')}</div>
          <section class="demo-workshop" aria-labelledby="demo-title"><div class="section-heading"><h2 id="demo-title">Atelier <em>demo.</em></h2><span>SEPARAT DE RETAILERI</span></div><p>Selecție pentru mese echilibrate: exemple generice de cereale, leguminoase, lactate și legume. Nu sunt produse atribuite magazinelor și nici un clasament de sănătate.</p><div class="demo-cards">${demoCatalog.map(product => `<button class="demo-card" data-demo="${product.id}" disabled>${miniPack(product)}<span><small>${product.group}</small><strong>${product.name}</strong><small>Exemplu editabil · inspectează ↗</small></span></button>`).join('')}</div></section>
        </section>
        <aside class="cart-panel" aria-labelledby="cart-title"><div class="cart-heading"><div><span class="eyebrow">LISTĂ PENTRU O SĂPTĂMÂNĂ</span><h2 id="cart-title" tabindex="-1">Cumpărături, <em>cu un plan.</em></h2></div><span id="cart-count" class="cart-count">0</span></div>
         <div class="cart-total"><span>ENERGIE ÎN TOATE CUMPĂRĂTURILE</span><div><strong id="cart-total">0</strong> kcal</div><p>Cantități cumpărate, nu porții consumate. Nu este un buget energetic.</p></div>
         <dl class="cart-macros"><div><dt>Greutate totală cumpărată</dt><dd id="cart-weight">0 g</dd></div><div><dt>Proteine</dt><dd id="cart-protein">0 g</dd></div><div><dt>Fibre</dt><dd id="cart-fibre">0 g</dd></div><div><dt>Grupe alimentare distincte</dt><dd id="cart-variety">0</dd></div></dl><p id="cart-groups" class="hint"></p><p id="cart-reference" class="reference-note"></p><div id="cart-items"></div>
         <button class="button primary review-button" id="review-list" disabled>Revizuiește lista →</button><p id="list-state" class="hint" role="status"></p>
         <p class="cart-footnote"><span class="demo-pill">PLANIFICARE, NU COMANDĂ</span> ${shoppingNotice} Varietatea numără grupe alimentare, nu magazine. Exemplele demo nu confirmă disponibilitatea la raft.</p>
        </aside>
      </div>
    </section>
  </main>
  <footer><span>ATELIER DE MESE / CONCEPT INDEPENDENT</span><p>Fără afiliere, cont, plată sau salvare automată. Lista se exportă doar la cererea ta; profilul nu se exportă. Informație educațională, nu sfat medical.</p><a href="#journey">Înapoi sus ↑</a></footer>
  <dialog id="product-dialog" aria-labelledby="detail-title"><button class="close-button" aria-label="Închide detaliile" autofocus>✕</button><div id="product-detail"></div></dialog>
  <dialog id="shopping-dialog" aria-labelledby="shopping-title"><button class="close-button" aria-label="Închide revizuirea listei" autofocus>✕</button><div class="shopping-review"><span class="eyebrow">DE LA MAGAZINUL VIRTUAL LA CEL FIZIC</span><h2 id="shopping-title">Lista pentru <em>o săptămână.</em></h2><p>${shoppingNotice}</p><div id="shopping-review-items"></div><p id="review-status" class="notice" role="status"></p><div class="actions"><button class="button primary" id="finalize-list">Finalizează lista</button><button class="button" id="print-shopping" disabled>Tipărește lista</button><button class="button" id="download-shopping" disabled>Descarcă .txt</button><button class="text-button" id="back-to-list">← Ajustează cumpărăturile</button></div><p class="hint">Tipărirea și fișierul includ doar cumpărăturile, fără datele sau estimările profilului. Exportul salvează local lista numai la cererea ta. Nu plasăm comenzi.</p></div></dialog>
  <section id="print-list" aria-label="Listă pentru tipărire"><pre id="print-content"></pre></section>
  <div id="announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>`

const dialog = document.querySelector<HTMLDialogElement>('#product-dialog')!
const shoppingDialog = document.querySelector<HTMLDialogElement>('#shopping-dialog')!
const detail = document.querySelector<HTMLElement>('#product-detail')!
const cart: ShoppingEntry[] = []
let reference: Reference | undefined
let activeProduct: Product | undefined
let opener: HTMLElement | null = null
let unlocked = false
let finalized = false
let shoppingOpener: HTMLElement | null = null
const game = createGame(openDepartment, () => dialog.open || shoppingDialog.open)
const announce = (message: string) => { document.querySelector('#announcement')!.textContent = message }
const store = document.querySelector<HTMLElement>('#store')!
const resetOnboarding = mountOnboarding(document.querySelector<HTMLElement>('#onboarding')!, next => {
  reference = next
  unlocked = true
  store.hidden = false
  store.inert = false
  const label = next.mode === 'fictional' ? 'Profil fictiv adult' : next.mode === 'own' ? 'Date proprii · repere aproximative' : 'Explorare educațională · fără estimări personale'
  document.querySelector('#session-summary')!.textContent = `${label} · ${next.goal === 'explore' ? 'explorare liberă' : next.goal === 'maintenance' ? 'menținere' : 'deficit moderat, simulare'}.`
  renderCart()
  game.enter()
  document.querySelector<HTMLElement>('.store-session')!.scrollIntoView({ block: 'start' })
  announce('Magazin deblocat. Explorează departamentele sau exemplele separate din Atelier demo.')
})
document.querySelector('#edit-profile')!.addEventListener('click', () => {
  unlocked = false
  reference = undefined
  activeProduct = undefined
  cart.splice(0)
  dialog.close()
  shoppingDialog.close()
  finalized = false
  document.querySelector('#shopping-review-items')!.replaceChildren()
  document.querySelector('#review-status')!.textContent = ''
  document.querySelector('#print-content')!.textContent = ''
  detail.replaceChildren()
  game.reset()
  renderCart()
  document.querySelector('#session-summary')!.textContent = ''
  store.hidden = true
  store.inert = true
  resetOnboarding()
  announce('Sesiune resetată: datele, reperul și lista de cumpărături au fost șterse.')
})
document.querySelectorAll<HTMLButtonElement>('[data-department]').forEach(button => button.addEventListener('click', () => {
  const department = departments.find(item => item.id === button.dataset.department)
  if (unlocked && department) openDepartment(department)
}))
document.querySelectorAll<HTMLButtonElement>('[data-demo]').forEach(button => button.addEventListener('click', () => {
  const product = demoCatalog.find(item => item.id === button.dataset.demo)
  if (unlocked && product) openProduct(product)
}))

function showDialog() {
  game.clearMovement()
  if (!dialog.open) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.showModal()
  document.body.classList.add('modal-open')
  dialog.querySelector<HTMLButtonElement>('.close-button')!.focus()
}
function openDepartment(department: Department) {
  if (!unlocked) return
  activeProduct = undefined
  const products = retailerCatalog.filter(product => product.department === department.id)
  detail.innerHTML = `<div class="department-detail"><span class="eyebrow">DEPARTAMENT ${department.number}</span><h2 id="detail-title">${department.name}</h2><div class="empty-department"><span aria-hidden="true">▤</span><h3>${products.length ? 'Selecție pentru mese echilibrate' : 'Produse în curând'}</h3><p>${products.length ? 'Consultă proveniența fiecărui produs.' : 'Acest raft este gol. Produsele vor fi adăugate treptat, după verificarea etichetelor, surselor și grupelor alimentare.'}</p>${products.map(product => `<button class="button" data-catalog="${product.id}">${product.name}</button>`).join('')}</div><p class="notice">Concept independent, fără afiliere sau aprobare ${department.name}. Niciun produs din Atelier demo nu este atribuit acestui retailer.</p><button class="button" id="department-close">Înapoi la magazin și Atelier demo →</button></div>`
  detail.querySelector('#department-close')!.addEventListener('click', () => dialog.close())
  detail.querySelectorAll<HTMLButtonElement>('[data-catalog]').forEach(button => button.addEventListener('click', () => {
    const product = products.find(item => item.id === button.dataset.catalog)
    if (product) openProduct(product)
  }))
  showDialog()
}

const nutrientFields = [
  { key: 'calories', name: 'Energie', unit: 'kcal', max: 1000 },
  { key: 'protein', name: 'Proteine', unit: 'g', max: 100 },
  { key: 'fibre', name: 'Fibre', unit: 'g', max: 100 },
  { key: 'sugar', name: 'Zaharuri', unit: 'g', max: 100 },
] as const
function nutritionFields(prefix: string, values: Nutrition) {
  return nutrientFields.map(field => `<label for="${prefix}-${field.key}">${field.name} (${field.unit})<input id="${prefix}-${field.key}" type="number" min="0" max="${field.max}" step="0.1" required value="${values[field.key]}" inputmode="decimal" aria-describedby="${prefix}-error"></label>`).join('')
}
function openProduct(product: Product) {
  if (!unlocked) return
  activeProduct = product
  detail.innerHTML = `<div class="detail-layout"><div class="package-panel ${product.color}"><span class="eyebrow">${product.readiness === 'illustrative' ? 'ATELIER DEMO / FĂRĂ MAGAZIN CONFIRMAT' : `DEPARTAMENT ${product.department.toUpperCase()}`}</span><div id="package-front"><div class="concept-pack"><span>ATELIER<br>DE MESE</span><i aria-hidden="true">✳</i><strong>${product.name}</strong><small>REPREZENTARE CONCEPT</small></div><p>Față · reprezentare generică, nu fotografia unui ambalaj comercial.</p></div><div id="package-back" hidden><h3>Dincolo de ambalaj.</h3><span class="demo-pill">VALORI ALЕSE / 100 g</span><dl id="label-nutrition"></dl><p>Ingrediente și alergeni: informații indisponibile aici. Verifică eticheta reală înainte de consum. Nu pretindem că produsul este fără alergeni.</p></div><button class="button" id="flip-package" aria-pressed="false" aria-controls="package-front package-back">Întoarce pe verso ⟳</button><p class="hint">Gramajul unei unități cumpărate și porția de consum sunt lucruri diferite. Ambalajele demo sunt strict ilustrative, fără disponibilitate confirmată.</p></div>
      <div class="detail-content"><span class="eyebrow">${product.group} / PLAN DE CUMPĂRĂTURI</span><h2 id="detail-title">${product.name}</h2><p class="notice">${product.provenance.source}. ${product.readiness === 'illustrative' ? 'Ambalajele și valorile sunt ipoteze de lucru, nu produse confirmate într-un magazin.' : 'Verifică eticheta și disponibilitatea actuală în magazin.'}</p>
        <fieldset class="nutrition-inputs"><legend>Valorile alese / 100 g · demo editabil</legend>${nutritionFields('selected', product.nutrition)}</fieldset>
        <p id="selected-error" class="input-error" role="alert" hidden>Folosește energie 0–1.000 kcal, proteine, fibre și zaharuri 0–100 g (maximum o zecimală).</p>
        <fieldset class="purchase-inputs"><legend>Ce pui pe lista pentru o săptămână?</legend><label for="package-grams">Gramaj net / ambalaj sau unitate (g)<input id="package-grams" type="number" min="1" max="10000" step="0.1" value="${product.packageGrams}" required inputmode="decimal" aria-describedby="purchase-error purchase-help"></label><label for="purchase-quantity">Număr de ambalaje / unități<input id="purchase-quantity" type="number" min="1" max="99" step="1" value="1" required inputmode="numeric" aria-describedby="purchase-error"></label></fieldset>
        <p id="purchase-help" class="hint">Pentru vrac, folosește o unitate și introdu greutatea cumpărată. Pentru ambalaje, introdu gramajul net al unui ambalaj și numărul de ambalaje.</p>
        <p id="purchase-error" class="input-error" role="alert" hidden>Gramaj 1–10.000 g, maximum o zecimală; număr întreg de unități 1–99. Limite tehnice ale listei.</p>
        <div class="purchase-summary" id="purchase-summary" aria-live="polite"></div><button class="button primary" id="add-to-cart">Adaugă cumpărăturile în listă ＋</button><p id="add-status" role="status"></p>
        <section class="portion-estimator" aria-labelledby="portion-heading"><h3 id="portion-heading">Separat: explorează o porție</h3><p class="hint">Nu schimbă gramajul cumpărat sau lista. Aceeași porție este folosită pentru ambele exemple din comparație.</p><label for="portion">Porție de consum simulată (g)<input id="portion" type="number" min="5" max="500" step="5" value="${product.portion}" required inputmode="numeric" aria-describedby="portion-error"></label><p id="portion-error" class="input-error" role="alert" hidden>Porție 5–500 g, în pași de 5 g.</p><div class="portion-summary" id="portion-summary" aria-live="polite"></div></section>
        <details class="comparison"><summary>Compară aceeași porție</summary><p>Introdu alte valori / 100 g. Comparăm cantități egale, nu ambalaje. Diferențele nu clasifică alimentele ca „bune” sau „rele”.</p><fieldset class="nutrition-inputs"><legend>Al doilea exemplu · demo editabil / 100 g</legend>${nutritionFields('comparison', { calories: 120, protein: 5, fibre: 2, sugar: 3 })}</fieldset><p id="comparison-error" class="input-error" role="alert" hidden>Completează energie 0–1.000 kcal, proteine, fibre și zaharuri 0–100 g, cu maximum o zecimală.</p><div id="comparison-results" class="comparison-results" aria-live="polite"></div></details>
        <p class="hint">Datele și porțiile pot diferi între variante crude, fierte și preparate. Aceste exemple nu înlocuiesc eticheta reală sau evaluarea unui dietetician.</p><button class="text-button" id="continue-exploring">← Înapoi la atelier</button>
      </div></div>`
  detail.querySelector('#flip-package')!.addEventListener('click', () => {
    const front = detail.querySelector<HTMLElement>('#package-front')!
    front.hidden = !front.hidden
    detail.querySelector<HTMLElement>('#package-back')!.hidden = !front.hidden
    const button = detail.querySelector('#flip-package')!
    button.setAttribute('aria-pressed', String(front.hidden))
    button.textContent = front.hidden ? 'Întoarce pe față ⟳' : 'Întoarce pe verso ⟳'
  })
  detail.querySelectorAll<HTMLInputElement>('input').forEach(field => field.addEventListener('input', updateNutrition))
  detail.querySelector('#add-to-cart')!.addEventListener('click', addToCart)
  detail.querySelector('#continue-exploring')!.addEventListener('click', () => dialog.close())
  updateNutrition()
  showDialog()
}
const input = (id: string) => detail.querySelector<HTMLInputElement>(`#${id}`)!
function validFields(ids: string[]) {
  return ids.map(id => {
    const field = input(id)
    const valid = field.value !== '' && Number.isFinite(field.valueAsNumber) && field.checkValidity()
    field.setAttribute('aria-invalid', String(!valid))
    return valid
  }).every(Boolean)
}
const selectedIds = nutrientFields.map(field => `selected-${field.key}`)
const purchaseIds = ['package-grams', 'purchase-quantity']
function readNutrition(prefix: string): Nutrition {
  return { calories: input(`${prefix}-calories`).valueAsNumber, protein: input(`${prefix}-protein`).valueAsNumber, fibre: input(`${prefix}-fibre`).valueAsNumber, sugar: input(`${prefix}-sugar`).valueAsNumber }
}
function updateNutrition() {
  const valid = validFields(selectedIds)
  const purchaseValid = validFields(purchaseIds)
  const portionValid = validFields(['portion'])
  const comparisonValid = validFields(nutrientFields.map(field => `comparison-${field.key}`))
  const portion = input('portion').valueAsNumber
  const selected = readNutrition('selected')
  const comparison = readNutrition('comparison')
  detail.querySelector<HTMLElement>('#selected-error')!.hidden = valid
  detail.querySelector<HTMLElement>('#purchase-error')!.hidden = purchaseValid
  detail.querySelector<HTMLElement>('#portion-error')!.hidden = portionValid
  detail.querySelector<HTMLElement>('#comparison-error')!.hidden = comparisonValid
  detail.querySelector<HTMLButtonElement>('#add-to-cart')!.disabled = !valid || !purchaseValid
  detail.querySelector('#add-status')!.textContent = ''
  const grams = input('package-grams').valueAsNumber
  const quantity = input('purchase-quantity').valueAsNumber
  detail.querySelector('#purchase-summary')!.textContent = valid && purchaseValid ? `${quantity} unități × ${format(grams)} g = ${format(grams * quantity)} g cumpărate · ${format(selected.calories * grams * quantity / 100)} kcal în întreaga cantitate. Nu reprezintă o porție.` : 'Verifică gramajul, numărul de unități și valorile nutriționale.'
  detail.querySelector('#portion-summary')!.textContent = valid && portionValid ? `${format(portion)} g → ${format(selected.calories * portion / 100)} kcal · ${format(selected.protein * portion / 100)} g proteine · ${format(selected.fibre * portion / 100)} g fibre · ${format(selected.sugar * portion / 100)} g zaharuri` : 'Verifică porția și valorile pentru acest calcul separat.'
  detail.querySelector('#label-nutrition')!.innerHTML = nutrientFields.map(field => `<div><dt>${field.name}</dt><dd>${valid ? format(selected[field.key]) : '—'} ${field.unit}</dd></div>`).join('')
  const results = detail.querySelector<HTMLElement>('#comparison-results')!
  results.hidden = !valid || !comparisonValid || !portionValid
  results.innerHTML = valid && comparisonValid && portionValid ? `<p>Ambele exemple: ${format(portion)} g / porție</p>${nutrientFields.map(field => {
    const first = selected[field.key] * portion / 100
    const second = comparison[field.key] * portion / 100
    const difference = first - second
    return `<div><strong>${field.name}: ${format(first)} vs ${format(second)} ${field.unit}</strong><span>Primul exemplu: ${Math.abs(difference) < 0.0001 ? 'fără diferență' : `${format(Math.abs(difference))} ${field.unit} ${difference > 0 ? 'mai mult' : 'mai puțin'}`}.</span></div>`
  }).join('')}` : ''
}
function addToCart() {
  if (!unlocked || !activeProduct || !validFields([...selectedIds, ...purchaseIds])) return
  const packageGrams = input('package-grams').valueAsNumber
  const quantity = input('purchase-quantity').valueAsNumber
  const nutrition = readNutrition('selected')
  const key = shoppingKey(activeProduct, packageGrams, nutrition)
  const existing = cart.find(entry => entry.key === key)
  const status = detail.querySelector('#add-status')!
  if ((existing?.quantity ?? 0) + quantity > 99 || shoppingTotals(cart).quantity + quantity > 999 || (!existing && cart.length >= 30)) {
    status.textContent = 'Limită tehnică: 99 unități / variantă, 30 variante, 999 unități. Redu cantitatea sau elimină un articol.'
    return
  }
  if (existing) existing.quantity += quantity
  else cart.push({ key, product: { ...activeProduct, nutrition: { ...nutrition }, packageGrams }, packageGrams, nutrition: { ...nutrition }, quantity })
  invalidateList()
  renderCart()
  status.textContent = `${activeProduct.name}: ${quantity} unități × ${format(packageGrams)} g adăugate. Lista păstrează cantitatea cumpărată și valorile acestei variante; porția nu modifică lista.`
}
function renderCart() {
  const totals = shoppingTotals(cart)
  const count = totals.quantity
  const groups = [...new Set(cart.map(entry => entry.product.group))]
  document.querySelector('#cart-count')!.textContent = String(count)
  document.querySelector('#cart-count')!.setAttribute('aria-label', `${count} ambalaje sau unități de cumpărat`)
  document.querySelector('#cart-total')!.textContent = format(totals.calories)
  document.querySelector('#cart-weight')!.textContent = `${format(totals.grams)} g`
  document.querySelector('#cart-protein')!.textContent = `${format(totals.protein)} g`
  document.querySelector('#cart-fibre')!.textContent = `${format(totals.fibre)} g`
  document.querySelector('#cart-variety')!.textContent = String(groups.length)
  document.querySelector('#cart-groups')!.textContent = groups.length ? groups.join(' · ') : 'Grupele apar pe măsură ce adaugi exemple.'
  document.querySelector('#cart-reference')!.textContent = reference?.energy !== undefined ? `${reference.mode === 'fictional' ? 'Reper fictiv' : 'Reper orientativ'} din nivelul 1: ≈ ${format(reference.energy)} kcal/zi, strict educațional. Separat de cumpărături: nu îl multiplicăm cu 7 și nu îl folosim drept țintă pentru listă. Nu se tipărește și nu se exportă.` : 'Lista nu are țintă calorică. Nu presupunem câte persoane sau câte mese acoperă cumpărăturile.'
  document.querySelector<HTMLButtonElement>('#review-list')!.disabled = !unlocked || cart.length === 0
  document.querySelector('#list-state')!.textContent = cart.length ? finalized ? 'Listă finalizată. Orice modificare va necesita o nouă revizuire.' : 'Ciornă · verifică unitățile și gramajele înainte de finalizare.' : ''
  const container = document.querySelector<HTMLElement>('#cart-items')!
  container.innerHTML = cart.length ? shoppingGroups(cart).map(group => `<section class="retailer-list"><h3>${group.name}</h3>${group.id === 'atelier' ? '<p class="hint">Exemple generice; disponibilitate neconfirmată.</p>' : ''}<ul class="cart-list">${group.entries.map(entry => {
    const index = cart.indexOf(entry)
    return `<li class="cart-item">${miniPack(entry.product)}<div><h3>${entry.product.name}</h3><p>${entry.quantity} unități × ${format(entry.packageGrams)} g net/unitate<br><strong>${format(entry.packageGrams * entry.quantity)} g cumpărate</strong> · ${entry.product.group}</p><small>${format(entry.nutrition.calories)} kcal · ${format(entry.nutrition.protein)} g proteine · ${format(entry.nutrition.fibre)} g fibre · ${format(entry.nutrition.sugar)} g zaharuri / 100 g</small><p>${format(entry.nutrition.calories * entry.packageGrams / 100 * entry.quantity)} kcal în cantitatea cumpărată</p><div class="quantity-controls"><button data-quantity="${index}" data-change="-1" aria-label="Scade o unitate ${entry.product.name}, varianta ${index + 1}">−</button><span aria-label="${entry.quantity} unități">${entry.quantity}</span><button data-quantity="${index}" data-change="1" ${entry.quantity >= 99 || count >= 999 ? 'disabled' : ''} aria-label="Adaugă o unitate ${entry.product.name}, varianta ${index + 1}">+</button><button class="text-button" data-remove="${index}" aria-label="Elimină ${entry.product.name}, varianta ${index + 1}">Elimină</button></div></div></li>`
  }).join('')}</ul></section>`).join('') : '<div class="cart-empty"><span aria-hidden="true">✳</span><h3>O săptămână de organizat.</h3><p>Alege un exemplu din Atelier demo și stabilește numărul de unități și gramajul cumpărat.</p></div>'
  container.querySelectorAll<HTMLButtonElement>('[data-quantity], [data-remove]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.quantity ?? button.dataset.remove)
    const entry = cart[index]!
    const change = Number(button.dataset.change ?? 0)
    if (change > 0 && (entry.quantity >= 99 || shoppingTotals(cart).quantity >= 999)) return
    if (button.dataset.remove !== undefined) cart.splice(index, 1)
    else {
      entry.quantity += change
      if (!entry.quantity) cart.splice(index, 1)
    }
    invalidateList()
    renderCart()
    const nextIndex = Math.min(index, cart.length - 1)
    const selector = button.dataset.remove !== undefined ? `[data-remove="${nextIndex}"]` : `[data-quantity="${nextIndex}"][data-change="${change}"]`
    const next = container.querySelector<HTMLButtonElement>(selector)
    const focus = next && !next.disabled ? next : container.querySelector<HTMLButtonElement>('[data-remove]')
    if (focus) focus.focus({ preventScroll: true })
    else document.querySelector<HTMLElement>('#cart-title')!.focus({ preventScroll: true })
    announce(`Lista a fost actualizată: ${shoppingTotals(cart).quantity} unități de cumpărat. ${entry.product.name}.`)
  }))
  const visible = cart.flatMap(entry => Array.from({ length: Math.min(entry.quantity, 6) }, () => entry.product)).slice(0, 6)
  game.setCart(visible, count)
}
function invalidateList() {
  finalized = false
  document.querySelector('#print-content')!.textContent = ''
  document.querySelector('#shopping-review-items')!.replaceChildren()
  if (shoppingDialog.open) renderReview()
}
function renderReview() {
  const totals = shoppingTotals(cart)
  document.querySelector('#shopping-review-items')!.innerHTML = shoppingGroups(cart).map(group => `<section class="review-group"><h3>${group.name}</h3>${group.id === 'atelier' ? `<p class="notice">${demoNotice}</p>` : '<p class="hint">Verifică disponibilitatea și eticheta actuală înainte de cumpărare.</p>'}<ul>${group.entries.map(entry => `<li><span aria-hidden="true">□</span><div><strong>${entry.product.name}</strong><p>${entry.quantity} ambalaje/unități × ${format(entry.packageGrams)} g net/unitate = <strong>${format(entry.quantity * entry.packageGrams)} g cumpărate</strong></p><small>${format(entry.nutrition.calories * entry.packageGrams * entry.quantity / 100)} kcal în întreaga cantitate · ${entry.product.group}</small></div></li>`).join('')}</ul></section>`).join('') + `<p class="review-totals"><strong>Total cumpărături</strong> · ${totals.quantity} ambalaje/unități · ${format(totals.grams)} g · ${format(totals.calories)} kcal</p><p class="hint">Energie = kcal/100 g × gramaj net/unitate × număr de unități ÷ 100. Nu calculăm un obiectiv de consum săptămânal.</p>`
  document.querySelector('#review-status')!.textContent = finalized ? 'Lista este pregătită pentru tipărire sau descărcare. Exemplele demo rămân fără magazin confirmat; verifică disponibilitatea în magazinul fizic.' : 'Verifică numărul de ambalaje, gramajele și magazinul fiecărui articol, apoi finalizează lista. Aceasta nu este o comandă.'
  document.querySelector<HTMLButtonElement>('#finalize-list')!.disabled = finalized || !cart.length
  document.querySelector<HTMLButtonElement>('#print-shopping')!.disabled = !finalized
  document.querySelector<HTMLButtonElement>('#download-shopping')!.disabled = !finalized
}
document.querySelector('#review-list')!.addEventListener('click', () => {
  if (!unlocked || !cart.length) return
  game.clearMovement()
  shoppingOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  renderReview()
  shoppingDialog.showModal()
  document.body.classList.add('modal-open')
  shoppingDialog.querySelector<HTMLButtonElement>('.close-button')!.focus()
})
document.querySelector('#finalize-list')!.addEventListener('click', () => {
  if (!unlocked || !cart.length) return
  finalized = true
  renderReview()
  renderCart()
  document.querySelector<HTMLButtonElement>('#print-shopping')!.focus()
})
document.querySelector('#print-shopping')!.addEventListener('click', () => {
  if (!finalized || !cart.length) return
  document.querySelector('#print-content')!.textContent = shoppingText(cart)
  window.print()
})
document.querySelector('#download-shopping')!.addEventListener('click', () => {
  if (!finalized || !cart.length) return
  const url = URL.createObjectURL(new Blob([shoppingText(cart)], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'lista-cumparaturi-o-saptamana.txt'
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})
window.addEventListener('beforeprint', () => {
  document.querySelector('#print-content')!.textContent = cart.length ? shoppingText(cart) : 'LISTĂ DE CUMPĂRĂTURI — PLAN PENTRU O SĂPTĂMÂNĂ\nLista este goală.'
})
shoppingDialog.querySelector('.close-button')!.addEventListener('click', () => shoppingDialog.close())
document.querySelector('#back-to-list')!.addEventListener('click', () => shoppingDialog.close())
shoppingDialog.addEventListener('close', () => {
  game.clearMovement()
  document.body.classList.remove('modal-open')
  if (unlocked) shoppingOpener?.focus({ preventScroll: true })
})
dialog.querySelector('.close-button')!.addEventListener('click', () => dialog.close())
dialog.addEventListener('close', () => {
  game.clearMovement()
  activeProduct = undefined
  detail.querySelectorAll<HTMLInputElement>('input').forEach(field => field.value = '')
  detail.replaceChildren()
  document.body.classList.remove('modal-open')
  if (unlocked) opener?.focus({ preventScroll: true })
})
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return
  const rect = dialog.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close()
})
renderCart()
