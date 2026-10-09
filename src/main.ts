import './style.css'
import { departments, demoCatalog, retailerCatalog, type Department, type Nutrition, type Product } from './catalog'
import { createGame } from './game'
import { addPackage, returnPackage } from './cart-actions'
import { mountCartDrag } from './drag-cart'
import { mountOnboarding, type OnboardingBody } from './onboarding'
import { cloud } from './cloud'
import { mountConnectedGame } from './connected-game'
import { format, type Reference } from './nutrition'
import { amountText, demoNotice, entryAmount, initialNutritionSources, initialSource, nutritionText, partialNotice, scaled, shoppingGroups, shoppingKey, shoppingNotice, shoppingText, shoppingTotals, sourceLabels, subtotalText, totalsText, valueText, type NutritionSources, type ShoppingEntry, type ValueSource } from './shopping-list'

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const miniPack = (product: Product) => `<span class="mini-pack ${escapeHtml(product.color)}" aria-hidden="true">✳</span>`
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <a class="skip-link" href="#journey">Sari la conținut</a>
  <header class="header"><a class="logo" href="./" aria-label="Atelier de mese, reîncepe">a<span>ATELIER<br>DE MESE</span><i>✳</i></a><span class="header-label">UN MIC MAGAZIN. O LISTĂ MAI CLARĂ.</span><span class="session-badge">Planificare · fără comenzi</span></header>
  <main id="journey" tabindex="-1">
    <section class="intro"><div><span class="eyebrow">PLANUL TĂU DE CUMPĂRĂTURI / O SĂPTĂMÂNĂ</span><h1>La raft, <em>în ritmul tău.</em></h1></div><p>Explorează, alege cantități, pregătește lista.<br>Apoi ia-o cu tine <strong>la magazinul fizic.</strong></p></section>
    <p class="independent-notice">Concept educațional independent, fără afiliere, aprobare sau parteneriat cu Lidl, Metro ori Kaufland. Cele 8 produse sunt asociate departamentelor la cerere; etichetele și disponibilitatea nu sunt verificate.</p>
    <section id="onboarding" class="onboarding" aria-label="Nivelul 1: profil, energie și intenție"></section>
    <section id="store" aria-label="Nivelul 2: magazinul de explorat">
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
                return `<button class="shelf ${escapeHtml(department.color)}" style="left:${department.x}px" data-department="${department.id}" disabled aria-label="Departament ${escapeHtml(department.name)} · ${products.length ? `${products.length} produse la cerere` : 'produse în curând'}"><span class="shelf-sign"><small>${department.number} / DEPARTAMENT</small><strong>${escapeHtml(department.name)}</strong></span>${products.length ? `<span class="shelf-products">${products.slice(0, 6).map(miniPack).join('')}</span>` : '<span class="empty-shelf">Produse în curând</span>'}<span class="shelf-lip">SELECȚIE PENTRU MESE</span></button>`
              }).join('')}
              <div class="entrance-mat" aria-hidden="true">↑ INTRARE ↑</div>
              <div id="player" class="player" aria-hidden="true"><div class="player-shadow"></div><div class="avatar"><div class="avatar-legs"><i></i><i></i></div><div class="avatar-body"></div><div class="avatar-head"></div><div class="avatar-hair"></div><div class="avatar-arm"></div></div><div class="trolley"><span class="trolley-handle"></span><div id="trolley-packs"></div><span class="basket-grid"></span><i class="wheel wheel-one"></i><i class="wheel wheel-two"></i><b id="trolley-count" hidden>0</b></div><span class="player-label">TU</span></div>
            </div>
            <div class="camera-controls" role="group" aria-label="Vedere 3D"><span>VEDERE</span><button data-camera="-1" aria-label="Rotește vederea la stânga" disabled>↶</button><button data-camera="1" aria-label="Rotește vederea la dreapta" disabled>↷</button></div>
            <span class="scene-demo">8 PRODUSE LA CERERE · ETICHETE DE VERIFICAT</span>
          </div>
          <p class="webgl-notice" id="webgl-notice" role="status" hidden>3D nu este disponibil. Poți explora magazinul 2D sau folosi butoanele directe; atelierul și căruciorul funcționează în continuare.</p>
          <div class="game-controls"><div><strong id="location" role="status">Căruciorul te așteaptă.</strong><p id="movement-help"><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd> mers · <kbd>E</kbd> la raft<br>Sau folosește accesul direct de mai jos.</p></div><button class="button" id="inspect-nearby" disabled>Apropie-te de un raft</button><div class="direction-pad" role="group" aria-label="Deplasare cu atingere">${[['up', '↑', 'înainte'], ['left', '←', 'la stânga'], ['down', '↓', 'înapoi'], ['right', '→', 'la dreapta']].map(([direction, symbol, name]) => `<button data-direction="${direction}" aria-label="Mergi ${name}" disabled>${symbol}</button>`).join('')}</div></div>
          <div class="section-heading"><h2>Departamente</h2><span>Acces direct, fără deplasare</span></div>
          <div class="department-shortcuts">${departments.map(department => `<button class="department-card" data-department="${department.id}" disabled><small>${department.number} / DEPARTAMENT</small><strong>${escapeHtml(department.name)} ↗</strong><span>${retailerCatalog.filter(product => product.department === department.id).length} produse la cerere · explorează</span></button>`).join('')}</div>
          <section class="demo-workshop" aria-labelledby="demo-title"><div class="section-heading"><h2 id="demo-title">Atelier <em>demo.</em></h2><span>SEPARAT DE RETAILERI</span></div><p>Selecție pentru mese echilibrate: exemple generice de cereale, leguminoase, lactate și legume. Nu sunt produse atribuite magazinelor și nici un clasament de sănătate.</p><div class="demo-cards">${demoCatalog.map(product => `<button class="demo-card" data-demo="${escapeHtml(product.id)}" disabled>${miniPack(product)}<span><small>${escapeHtml(product.group)}</small><strong>${escapeHtml(product.name)}</strong><small>Exemplu editabil · inspectează ↗</small></span></button>`).join('')}</div></section>
        </section>
        <aside class="cart-panel" aria-labelledby="cart-title"><div class="cart-heading"><div><span class="eyebrow">LISTĂ PENTRU O SĂPTĂMÂNĂ</span><h2 id="cart-title" tabindex="-1">Cumpărături, <em>cu un plan.</em></h2></div><span id="cart-count" class="cart-count">0</span></div>
         <div class="cart-total"><span>ENERGIE ÎN TOATE CUMPĂRĂTURILE</span><div><strong id="cart-total">0 kcal</strong></div><p id="cart-energy-status"></p><p>Cantități cumpărate, nu porții consumate. Nu este un buget energetic.</p></div>
         <dl class="cart-macros"><div><dt>Masă / volum cumpărat (separat)</dt><dd id="cart-weight">0 g · 0 ml</dd></div><div><dt>Proteine</dt><dd id="cart-protein">0 g</dd></div><div><dt>Fibre</dt><dd id="cart-fibre">0 g</dd></div><div><dt>Zaharuri</dt><dd id="cart-sugar">0 g</dd></div><div><dt>Grupe alimentare distincte</dt><dd id="cart-variety">0</dd></div></dl><div id="cart-partial-status" class="hint"></div><p class="hint">${partialNotice}</p><p id="cart-groups" class="hint"></p><p id="cart-reference" class="reference-note"></p><div id="cart-items"></div>
         <button class="button primary review-button" id="review-list" disabled>Revizuiește lista →</button><p id="list-state" class="hint" role="status"></p>
         <p class="cart-footnote"><span class="demo-pill">PLANIFICARE, NU COMANDĂ</span> ${shoppingNotice} Varietatea numără grupe alimentare, nu magazine. Exemplele demo nu confirmă disponibilitatea la raft.</p>
        </aside>
      </div>
    </section>
  </main>
  <footer><span>ATELIER DE MESE / CONCEPT INDEPENDENT</span><p>Listele și progresul pot fi salvate într-un cont real când serviciul este configurat. Datele corporale se salvează numai cu acord explicit. Modul offline nu salvează în cloud. Informație educațională, nu sfat medical.</p><a href="#journey">Înapoi sus ↑</a></footer>
  <dialog id="product-dialog" aria-labelledby="detail-title"><button class="close-button" aria-label="Închide detaliile" autofocus>✕</button><div id="product-detail"></div></dialog>
  <dialog id="shopping-dialog" aria-labelledby="shopping-title"><button class="close-button" aria-label="Închide revizuirea listei" autofocus>✕</button><div class="shopping-review"><span class="eyebrow">DE LA MAGAZINUL VIRTUAL LA CEL FIZIC</span><h2 id="shopping-title">Lista pentru <em>o săptămână.</em></h2><p>${shoppingNotice}</p><div id="shopping-review-items"></div><p id="review-status" class="notice" role="status"></p><div class="actions"><button class="button primary" id="finalize-list">Finalizează lista</button><button class="button" id="print-shopping" disabled>Tipărește lista</button><button class="button" id="download-shopping" disabled>Descarcă .txt</button><button class="text-button" id="back-to-list">← Ajustează cumpărăturile</button></div><p class="hint">Tipărirea și fișierul includ doar cumpărăturile, fără datele sau estimările profilului. Exportul salvează local lista numai la cererea ta. Nu plasăm comenzi.</p></div></dialog>
  <section id="print-list" aria-label="Listă pentru tipărire"><pre id="print-content"></pre></section>
  <div id="announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>`

document.body.classList.add('game-shell')
document.querySelector('.header')!.insertAdjacentHTML('beforeend', `<nav class="hud-nav" aria-label="Terminal de joc"><button data-hud="catalog-dialog">Rafturi</button><button data-hud="cart-dialog">Cărucior <b id="hud-count">0</b></button><button data-hud="profile">Profil</button><button data-hud="saved">Liste salvate</button><button data-hud="missions">Misiuni</button><button id="admin-open" hidden>Administrare</button></nav>`)
document.querySelector('#app')!.insertAdjacentHTML('beforeend', `
  <dialog id="entry-dialog" aria-label="Bun venit la Atelier"><div id="entry-content" class="terminal-content"></div></dialog>
  <dialog id="onboarding-dialog" aria-label="Profil și explorare"></dialog>
  <dialog id="catalog-dialog" aria-label="Magazine și rafturi"><button class="close-button" aria-label="Închide rafturile">✕</button><div class="terminal-content"><span class="eyebrow">EXPLORARE / MAGAZINE</span><h2>Alege un <em>raft.</em></h2><div id="store-selector"></div><p id="catalog-status" role="status"></p><div id="catalog-departments"></div><div id="catalog-demo"></div></div></dialog>
  <dialog id="cart-dialog" aria-label="Căruciorul tău"><button class="close-button" aria-label="Închide căruciorul">✕</button><div class="dialog-dropbar"><div data-drop="return" tabindex="0">↩ Pune înapoi <small>exact un ambalaj / pachet</small></div><button class="button" data-undo disabled>Anulează ultima modificare</button></div></dialog>
  <dialog id="utility-dialog" aria-label="Terminalul personal"><button class="close-button" aria-label="Închide terminalul">✕</button><div id="utility-content" class="terminal-content"></div></dialog>
  <div class="world-hud"><span id="connection-label">DEMO OFFLINE · fără salvare cloud</span><button id="world-cart" data-drop="cart" disabled>🛒 Cărucior · <span id="world-count">0</span></button><button class="button" data-undo disabled>Anulează</button></div>`)
const onboardingDialog = document.querySelector<HTMLDialogElement>('#onboarding-dialog')!
onboardingDialog.append(document.querySelector('#onboarding')!)
document.querySelector('#catalog-departments')!.append(document.querySelector('.department-shortcuts')!)
document.querySelector('#catalog-demo')!.append(document.querySelector('.demo-workshop')!)
document.querySelector('#cart-dialog')!.append(document.querySelector('.cart-panel')!)
document.querySelector('#cart-dialog')!.append(document.querySelector('#cart-dialog .dialog-dropbar')!)
const utilityDialog = document.querySelector<HTMLDialogElement>('#utility-dialog')!
const utility = document.querySelector<HTMLElement>('#utility-content')!
document.querySelectorAll<HTMLDialogElement>('#entry-dialog, #onboarding-dialog').forEach(modal => modal.addEventListener('cancel', event => event.preventDefault()))
document.querySelectorAll<HTMLDialogElement>('#catalog-dialog, #cart-dialog, #utility-dialog').forEach(modal => {
  modal.querySelector('.close-button')!.addEventListener('click', () => modal.close())
})
const dialog = document.querySelector<HTMLDialogElement>('#product-dialog')!
const shoppingDialog = document.querySelector<HTMLDialogElement>('#shopping-dialog')!
const detail = document.querySelector<HTMLElement>('#product-detail')!
const cart: ShoppingEntry[] = []
let reference: Reference | undefined
let activeProduct: Product | undefined
let editingEntry: ShoppingEntry | undefined
let nutritionSources: NutritionSources
let amountSource: ValueSource = 'unknown'
let opener: HTMLElement | null = null
let unlocked = false
let finalized = false
let shoppingOpener: HTMLElement | null = null
let undoSnapshot: ShoppingEntry[] | undefined
let sessionAllowed = false
let currentDepartments = [...departments]
let currentProducts = [...retailerCatalog]
let ownBody: OnboardingBody | undefined
let savedBody: OnboardingBody | undefined
let guestEducational = false
let completed: string[] = []
let avatarColor = 'clay'
let onUtility: ((kind: string) => void) | undefined
let onProgress: (() => void) | undefined
const game = createGame(openDepartment, () => Boolean(document.querySelector('dialog[open]')) || document.body.classList.contains('drag-active'))
const announce = (message: string) => { document.querySelector('#announcement')!.textContent = message }
const store = document.querySelector<HTMLElement>('#store')!
const resetOnboarding = mountOnboarding(document.querySelector<HTMLElement>('#onboarding')!, (next, body) => {
  if (!sessionAllowed) return
  reference = next
  ownBody = body
  unlocked = true
  store.hidden = false
  store.inert = false
  const label = next.mode === 'fictional' ? 'Profil fictiv adult' : next.mode === 'own' ? 'Date proprii · repere aproximative' : 'Explorare educațională · fără estimări personale'
  document.querySelector('#session-summary')!.textContent = `${label} · ${next.goal === 'explore' ? 'explorare liberă' : next.goal === 'maintenance' ? 'menținere' : 'deficit moderat, simulare'}.`
  renderCart()
  game.enter()
  onboardingDialog.close()
  document.querySelector<HTMLButtonElement>('#world-cart')!.disabled = false
  announce('Magazin deblocat. Explorează departamentele sau exemplele separate din Atelier demo.')
}, { savedBody: () => savedBody, educationOnly: () => guestEducational })
function resetSession() {
  drag.cancel()
  unlocked = false
  reference = undefined
  ownBody = undefined
  activeProduct = undefined
  cart.splice(0)
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(modal => modal.close())
  finalized = false
  document.querySelector('#shopping-review-items')!.replaceChildren()
  document.querySelector('#review-status')!.textContent = ''
  document.querySelector('#print-content')!.textContent = ''
  detail.replaceChildren()
  game.reset()
  renderCart()
  document.querySelector('#session-summary')!.textContent = ''
  store.hidden = false
  store.inert = false
  undoSnapshot = undefined
  completed = []
  avatarColor = 'clay'
  game.setAvatarColor(avatarColor)
  document.querySelector<HTMLButtonElement>('#world-cart')!.disabled = true
  resetOnboarding()
  announce('Sesiune resetată: datele, reperul și lista de cumpărături au fost șterse.')
}
document.querySelector('#edit-profile')!.addEventListener('click', () => { resetSession(); onboardingDialog.showModal() })
document.querySelectorAll<HTMLButtonElement>('[data-department]').forEach(button => button.addEventListener('click', () => {
  const department = currentDepartments.find(item => item.id === button.dataset.department)
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
  drag.cancel()
  activeProduct = undefined
  const products = currentProducts.filter(product => product.department === department.id)
  detail.innerHTML = `<div class="department-detail"><span class="eyebrow">RAFT ${escapeHtml(department.number)}</span><h2 id="detail-title">${escapeHtml(department.name)}</h2><p>${products.length} produse · verifică eticheta, nu doar denumirea.</p><div class="shelf-cards">${products.map(product => `<article class="shelf-card">${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : miniPack(product)}<h3>${escapeHtml(product.name)}</h3><small>${escapeHtml(product.provenance.source)}</small><div class="actions"><button class="button" data-catalog="${escapeHtml(product.id)}">Inspectează eticheta</button><button class="button" data-quick-add="${escapeHtml(product.id)}">+ 1 pachet</button><button class="drag-handle" data-drag-product="${escapeHtml(product.id)}" aria-label="Trage un pachet ${escapeHtml(product.name)}">⠿ Trage</button></div></article>`).join('') || '<p>Nu există produse publicate pe acest raft.</p>'}</div><button class="button" id="department-close">Înapoi la magazin →</button></div><div class="dialog-dropbar"><div data-drop="cart">🛒 Pune în cărucior <small>un ambalaj / pachet per mutare</small></div><span class="drop-count"></span><button class="button" data-undo ${undoSnapshot ? '' : 'disabled'}>Anulează</button></div>`
  detail.querySelector('#department-close')!.addEventListener('click', () => dialog.close())
  detail.querySelectorAll<HTMLButtonElement>('[data-catalog]').forEach(button => button.addEventListener('click', () => {
    const product = products.find(item => item.id === button.dataset.catalog)
    if (product) openProduct(product)
  }))
  showDialog()
  updateDropCounts()
}

const nutrientFields = [
  { key: 'calories', name: 'Energie', unit: 'kcal', max: 1000 },
  { key: 'protein', name: 'Proteine', unit: 'g', max: 100 },
  { key: 'fibre', name: 'Fibre', unit: 'g', max: 100 },
  { key: 'sugar', name: 'Zaharuri', unit: 'g', max: 100 },
] as const
function nutritionFields(prefix: string, values: Nutrition) {
  return nutrientFields.map(field => `<label for="${prefix}-${field.key}">${field.name} (${field.unit})<input id="${prefix}-${field.key}" type="number" min="0" max="${field.max}" step="0.1" value="${values[field.key] ?? ''}" placeholder="Necunoscut" inputmode="decimal" aria-describedby="${prefix}-error"></label>`).join('')
}
function openProduct(product: Product, snapshot?: ShoppingEntry) {
  if (!unlocked) return
  drag.cancel()
  activeProduct = product
  editingEntry = snapshot
  nutritionSources = { ...(snapshot?.nutritionSources ?? initialNutritionSources(product)) }
  amountSource = snapshot?.amountSource ?? (product.packageAmount === null ? 'unknown' : initialSource(product))
  const unit = product.packageUnit
  const amount = snapshot ? snapshot.packageAmount : product.packageAmount
  detail.innerHTML = `<div class="detail-layout"><div class="package-panel ${escapeHtml(product.color)}"><span class="eyebrow">${product.readiness === 'illustrative' ? 'ATELIER DEMO / FĂRĂ MAGAZIN CONFIRMAT' : `DEPARTAMENT ${product.department.toUpperCase()}`}</span><div id="package-front"><div class="concept-pack"><span>ATELIER<br>DE MESE</span><i aria-hidden="true">✳</i><strong>${escapeHtml(product.name)}</strong><small>REPREZENTARE CONCEPT</small></div><p>Față · reprezentare generică, nu fotografia unui ambalaj comercial.</p></div><div id="package-back" hidden><h3>Dincolo de ambalaj.</h3><span class="demo-pill">VALORI / 100 ${unit}</span><dl id="label-nutrition"></dl><p>Ingrediente și alergeni: informații indisponibile aici. Verifică eticheta reală înainte de consum. Nu pretindem că produsul este fără alergeni.</p></div><button class="button" id="flip-package" aria-pressed="false" aria-controls="package-front package-back">Întoarce pe verso ⟳</button><p class="hint">Cantitatea netă cumpărată și porția de consum sunt lucruri diferite. Nu convertim masa în volum.</p></div>
      <div class="detail-content"><span class="eyebrow">${escapeHtml(product.group)} / PLAN DE CUMPĂRĂTURI</span><h2 id="detail-title">${escapeHtml(product.name)}</h2><p class="notice">${escapeHtml(product.provenance.source)}. ${product.readiness === 'illustrative' ? 'Ambalajele și valorile sunt ipoteze de lucru, nu produse confirmate într-un magazin.' : 'Asocierea la retailer și cantitățile din denumire provin din cerere. Numele „Zero” sau „fara zahar” nu furnizează valori nutriționale. Variantele din denumire nu sunt selectate automat.'}</p>
        <fieldset class="nutrition-inputs"><legend>Valori / 100 ${unit} · ${product.readiness === 'illustrative' ? 'demo editabil' : 'etichetă de completat'}</legend>${nutritionFields('selected', snapshot?.nutrition ?? product.nutrition)}</fieldset>
        <p class="hint">Gol = necunoscut; 0 = zero introdus explicit. Valorile introduse de tine sunt neverificate, nu o etichetă aprobată.</p><p id="nutrition-source" class="hint"></p>
        <p id="selected-error" class="input-error" role="alert" hidden>Folosește energie 0–1.000 kcal, proteine, fibre și zaharuri 0–100 g (maximum o zecimală), sau lasă gol.</p>
        <fieldset class="purchase-inputs"><legend>Ce pui pe lista pentru o săptămână?</legend><label for="package-grams">Cantitate netă / ${product.unitsPerPack > 1 ? 'doză individuală' : 'ambalaj'} (${unit})<input id="package-grams" type="number" min="0.1" max="10000" step="0.1" value="${amount ?? ''}" placeholder="Necunoscut" inputmode="decimal" aria-describedby="purchase-error purchase-help"></label><label for="purchase-quantity">Număr de ${product.unitsPerPack > 1 ? `pachete (${product.unitsPerPack} doze/pachet)` : 'ambalaje / unități'}<input id="purchase-quantity" type="number" min="1" max="99" step="1" value="${snapshot?.quantity ?? 1}" required inputmode="numeric" aria-describedby="purchase-error"></label></fieldset>
        <p id="purchase-help" class="hint">${product.unitsPerPack > 1 ? `Introdu ml pentru o singură doză, NU totalul pachetului. Numărul fix este ${product.unitsPerPack} doze/pachet; totalul net/pachet se recalculează.` : 'Introdu cantitatea netă a unui ambalaj; pentru vrac folosește o unitate.'} Poți lăsa cantitatea netă necunoscută și adăuga numai numele și numărul de ambalaje. Completează ulterior prin „Editează eticheta” din listă.</p>
        <p id="purchase-error" class="input-error" role="alert" hidden>Cantitate netă 0,1–10.000 ${unit}, maximum o zecimală, sau gol; număr întreg de ambalaje/pachete 1–99.</p>
        <div class="purchase-summary" id="purchase-summary" aria-live="polite"></div><button class="button primary" id="add-to-cart">${snapshot ? 'Salvează modificările acestei poziții' : 'Adaugă cumpărăturile în listă ＋'}</button><p id="add-status" role="status"></p>
        <section class="portion-estimator" aria-labelledby="portion-heading"><h3 id="portion-heading">Separat: explorează o porție</h3><p class="hint">Porție ilustrativă, nu recomandare. Nu schimbă cantitatea cumpărată sau lista. Aceeași unitate este folosită în ambele exemple.</p><label for="portion">Porție de consum simulată (${unit})<input id="portion" type="number" min="5" max="500" step="5" value="${product.portion}" required inputmode="numeric" aria-describedby="portion-error"></label><p id="portion-error" class="input-error" role="alert" hidden>Porție 5–500 ${unit}, în pași de 5 ${unit}.</p><div class="portion-summary" id="portion-summary" aria-live="polite"></div></section>
        <details class="comparison"><summary>Compară aceeași porție</summary><p>Introdu alte valori / 100 ${unit}, în aceeași unitate ca primul produs. Comparăm cantități egale, nu ambalaje. Diferențele nu clasifică alimentele ca „bune” sau „rele”.</p><fieldset class="nutrition-inputs"><legend>Al doilea exemplu · introdus de utilizator / neverificat / 100 ${unit}</legend>${nutritionFields('comparison', { calories: null, protein: null, fibre: null, sugar: null })}</fieldset><p id="comparison-error" class="input-error" role="alert" hidden>Folosește energie 0–1.000 kcal, proteine, fibre și zaharuri 0–100 g, cu maximum o zecimală, sau lasă gol.</p><div id="comparison-results" class="comparison-results" aria-live="polite"></div></details>
        <p class="hint">Datele și porțiile pot diferi între variante crude, fierte și preparate. Aceste exemple nu înlocuiesc eticheta reală sau evaluarea unui dietetician.</p><button class="text-button" id="continue-exploring">← Înapoi la magazin</button>
      </div></div>`
  detail.querySelector('#flip-package')!.addEventListener('click', () => {
    completeMission('inspect')
    const front = detail.querySelector<HTMLElement>('#package-front')!
    front.hidden = !front.hidden
    detail.querySelector<HTMLElement>('#package-back')!.hidden = !front.hidden
    const button = detail.querySelector('#flip-package')!
    button.setAttribute('aria-pressed', String(front.hidden))
    button.textContent = front.hidden ? 'Întoarce pe față ⟳' : 'Întoarce pe verso ⟳'
  })
  detail.querySelector<HTMLElement>('.package-panel .eyebrow')!.textContent = product.readiness === 'illustrative' ? 'ATELIER DEMO / FĂRĂ MAGAZIN CONFIRMAT' : `RAFT ${product.departmentName ?? product.department}`
  if (product.imageUrl) {
    const photo = document.createElement('img')
    photo.src = product.imageUrl
    photo.alt = `Imagine catalog: ${product.name}`
    photo.className = 'product-photo'
    photo.referrerPolicy = 'no-referrer'
    detail.querySelector('.concept-pack')!.replaceWith(photo)
    detail.querySelector('#package-front > p')!.textContent = 'Fotografie din catalogul publicat. Verifică varianta și eticheta în magazin.'
  }
  detail.querySelector('#package-back > p')!.textContent = `Ingrediente: ${product.ingredients || 'indisponibile'}. Alergeni: ${product.allergens || 'indisponibili'}. Verifică eticheta reală înainte de consum; informația absentă nu înseamnă lipsa alergenilor.`
  if (product.readiness === 'approved') detail.querySelector('.detail-content > .notice')!.textContent = `${product.provenance.source}. Etichetă publicată ca verificată de administrator. Verifică întotdeauna varianta și ambalajul fizic; nu confirmăm stocul.`
  detail.querySelectorAll<HTMLInputElement>('input').forEach(field => field.addEventListener('input', () => {
    const nutrient = nutrientFields.find(item => field.id === `selected-${item.key}`)
    if (nutrient) nutritionSources[nutrient.key] = field.value === '' ? 'unknown' : 'manual'
    if (field.id === 'package-grams') amountSource = field.value === '' ? 'unknown' : 'manual'
    updateNutrition()
    if (field.id.startsWith('comparison-') && validFields([...selectedIds, 'portion', ...nutrientFields.map(item => `comparison-${item.key}`)]) && nutrientFields.some(item => readOptional(`selected-${item.key}`) !== null && readOptional(`comparison-${item.key}`) !== null)) completeMission('compare')
  }))
  detail.querySelector('#add-to-cart')!.addEventListener('click', addToCart)
  detail.querySelector('#continue-exploring')!.addEventListener('click', () => dialog.close())
  updateNutrition()
  showDialog()
}
const input = (id: string) => detail.querySelector<HTMLInputElement>(`#${id}`)!
function validFields(ids: string[]) {
  return ids.map(id => {
    const field = input(id)
    const valid = field.checkValidity() && (field.value === '' ? !field.required : Number.isFinite(field.valueAsNumber))
    field.setAttribute('aria-invalid', String(!valid))
    return valid
  }).every(Boolean)
}
const selectedIds = nutrientFields.map(field => `selected-${field.key}`)
const purchaseIds = ['package-grams', 'purchase-quantity']
function readNutrition(prefix: string): Nutrition {
  return Object.fromEntries(nutrientFields.map(field => [field.key, readOptional(`${prefix}-${field.key}`)])) as Nutrition
}
function readOptional(id: string) {
  return input(id).value === '' ? null : input(id).valueAsNumber
}
function currentSnapshot(): ShoppingEntry {
  const product = structuredClone(activeProduct!)
  const entry = {
    product, packageAmount: readOptional('package-grams'), packageUnit: product.packageUnit,
    unitsPerPack: product.unitsPerPack, amountSource, nutrition: readNutrition('selected'),
    nutritionSources: { ...nutritionSources }, quantity: input('purchase-quantity').valueAsNumber,
  }
  return { ...entry, key: shoppingKey(entry) }
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
  const entry = currentSnapshot()
  const unit = entry.packageUnit
  const packNet = entry.packageAmount === null ? null : entry.packageAmount * entry.unitsPerPack
  detail.querySelector('#purchase-summary')!.textContent = valid && purchaseValid ? `${amountText(entry)}. Net/pachet: ${valueText(packNet, unit)}. Sursa cantității nete: ${sourceLabels[amountSource]}. ${valueText(scaled(selected.calories, entryAmount(entry)), 'kcal')} în întreaga cantitate. Nu reprezintă o porție.` : 'Verifică cantitatea netă, numărul de ambalaje și valorile nutriționale.'
  detail.querySelector('#nutrition-source')!.textContent = nutrientFields.map(field => `${field.name}: ${sourceLabels[nutritionSources[field.key]]}`).join(' · ')
  detail.querySelector('#portion-summary')!.textContent = valid && portionValid ? `${format(portion)} ${unit} → ${nutrientFields.map(field => `${field.name}: ${valueText(scaled(selected[field.key], portion), field.unit)}`).join(' · ')}` : 'Verifică porția și valorile pentru acest calcul separat.'
  detail.querySelector('#label-nutrition')!.innerHTML = nutrientFields.map(field => `<div><dt>${field.name}</dt><dd>${valid ? valueText(selected[field.key], field.unit) : '—'} · ${sourceLabels[nutritionSources[field.key]]}</dd></div>`).join('')
  const results = detail.querySelector<HTMLElement>('#comparison-results')!
  results.hidden = !valid || !comparisonValid || !portionValid
  results.innerHTML = valid && comparisonValid && portionValid ? `<p>Ambele exemple: ${format(portion)} ${unit} / porție</p>${nutrientFields.map(field => {
    const first = scaled(selected[field.key], portion)
    const second = scaled(comparison[field.key], portion)
    if (first === null || second === null) return `<div><strong>${field.name}: ${valueText(first, field.unit)} vs ${valueText(second, field.unit)}</strong><span>Diferență necunoscută; lipsesc valori.</span></div>`
    const difference = first - second
    return `<div><strong>${field.name}: ${format(first)} vs ${format(second)} ${field.unit}</strong><span>Primul exemplu: ${Math.abs(difference) < 0.0001 ? 'fără diferență' : `${format(Math.abs(difference))} ${field.unit} ${difference > 0 ? 'mai mult' : 'mai puțin'}`}.</span></div>`
  }).join('')}` : ''
}
function addToCart() {
  if (!unlocked || !activeProduct || !validFields([...selectedIds, ...purchaseIds])) return
  const snapshot = currentSnapshot()
  const { quantity } = snapshot
  const existing = editingEntry ? undefined : cart.find(entry => entry.key === snapshot.key)
  const status = detail.querySelector('#add-status')!
  if ((existing?.quantity ?? 0) + quantity > 99 || shoppingTotals(cart).quantity - (editingEntry?.quantity ?? 0) + quantity > 999 || (!editingEntry && !existing && cart.length >= 30)) {
    status.textContent = 'Limită tehnică: 99 unități / variantă, 30 variante, 999 unități. Redu cantitatea sau elimină un articol.'
    return
  }
  if (editingEntry) {
    const index = cart.indexOf(editingEntry)
    if (index < 0) return
    rememberUndo()
    cart[index] = snapshot
    editingEntry = snapshot
  } else {
    rememberUndo()
    if (existing) existing.quantity += quantity
    else cart.push(snapshot)
  }
  invalidateList()
  renderCart()
  status.textContent = `${activeProduct.name}: ${amountText(snapshot)}. ${editingEntry ? 'Poziție actualizată.' : 'Adăugat în listă.'} Lista păstrează valorile și proveniența acestei variante; editările nesalvate și porția nu modifică lista.`
}
function renderCart() {
  const totals = shoppingTotals(cart)
  const count = totals.quantity
  updateDropCounts()
  const groups = [...new Set(cart.map(entry => entry.product.group))]
  document.querySelector('#cart-count')!.textContent = String(count)
  document.querySelector('#cart-count')!.setAttribute('aria-label', `${count} ambalaje sau unități de cumpărat`)
  document.querySelector('#cart-total')!.textContent = totals.calories.unknown && !totals.calories.knownCount ? '—' : `${format(totals.calories.known)} kcal`
  document.querySelector('#cart-total')!.setAttribute('aria-label', subtotalText(totals.calories, 'kcal'))
  document.querySelector('#cart-energy-status')!.textContent = totals.calories.unknown ? subtotalText(totals.calories, 'kcal') : ''
  const compact = (total: typeof totals.grams, unit: string) => `${total.unknown && !total.knownCount ? '—' : format(total.known)} ${unit}${total.unknown ? ' *' : ''}`
  document.querySelector('#cart-weight')!.innerHTML = `${compact(totals.grams, 'g')}<br>${compact(totals.millilitres, 'ml')}`
  document.querySelector('#cart-weight')!.setAttribute('aria-label', `Masă: ${subtotalText(totals.grams, 'g')}. Volum: ${subtotalText(totals.millilitres, 'ml')}`)
  for (const key of ['protein', 'fibre', 'sugar'] as const) {
    document.querySelector(`#cart-${key}`)!.textContent = compact(totals[key], 'g')
    document.querySelector(`#cart-${key}`)!.setAttribute('aria-label', subtotalText(totals[key], 'g'))
  }
  document.querySelector('#cart-partial-status')!.innerHTML = ([
    ['Masă', totals.grams, 'g'], ['Volum', totals.millilitres, 'ml'],
    ['Proteine', totals.protein, 'g'], ['Fibre', totals.fibre, 'g'], ['Zaharuri', totals.sugar, 'g'],
  ] as const).map(([label, total, unit]) => total.unknown ? `<p>* ${label}: ${subtotalText(total, unit)}</p>` : '').join('')
  document.querySelector('#cart-variety')!.textContent = String(groups.length)
  document.querySelector('#cart-groups')!.textContent = groups.length ? groups.join(' · ') : 'Grupele apar pe măsură ce adaugi exemple.'
  document.querySelector('#cart-reference')!.textContent = reference?.energy !== undefined ? `${reference.mode === 'fictional' ? 'Reper fictiv' : 'Reper orientativ'} din nivelul 1: ≈ ${format(reference.energy)} kcal/zi, strict educațional. Separat de cumpărături: nu îl multiplicăm cu 7 și nu îl folosim drept țintă pentru listă. Nu se tipărește și nu se exportă.` : 'Lista nu are țintă calorică. Nu presupunem câte persoane sau câte mese acoperă cumpărăturile.'
  document.querySelector<HTMLButtonElement>('#review-list')!.disabled = !unlocked || cart.length === 0
  document.querySelector('#list-state')!.textContent = cart.length ? finalized ? 'Listă finalizată. Orice modificare va necesita o nouă revizuire.' : 'Ciornă · verifică ambalajele, masa / volumul și etichetele înainte de finalizare.' : ''
  const container = document.querySelector<HTMLElement>('#cart-items')!
  container.innerHTML = cart.length ? shoppingGroups(cart).map(group => `<section class="retailer-list"><h3>${escapeHtml(group.name)}</h3>${group.id === 'atelier' ? '<p class="hint">Exemple generice; disponibilitate neconfirmată.</p>' : ''}<ul class="cart-list">${group.entries.map(entry => {
    const index = cart.indexOf(entry)
    const name = escapeHtml(entry.product.name)
    return `<li class="cart-item">${miniPack(entry.product)}<div><h3>${name}</h3><p>${escapeHtml(amountText(entry))} · ${escapeHtml(entry.product.group)}</p><small>${escapeHtml(nutritionText(entry))}</small><p>${valueText(scaled(entry.nutrition.calories, entryAmount(entry)), 'kcal')} în cantitatea cumpărată</p><p class="hint">Cantitate netă: ${sourceLabels[entry.amountSource]}. Proveniență produs: ${escapeHtml(entry.product.provenance.source)}.</p><button class="text-button" data-edit="${index}" aria-label="Editează eticheta ${name}, varianta ${index + 1}">Editează eticheta / cantitatea netă</button><div class="quantity-controls"><button data-quantity="${index}" data-change="-1" aria-label="Scade un ambalaj/pachet ${name}, varianta ${index + 1}">−</button><span aria-label="${entry.quantity} ambalaje/pachete">${entry.quantity}</span><button data-quantity="${index}" data-change="1" ${entry.quantity >= 99 || count >= 999 ? 'disabled' : ''} aria-label="Adaugă un ambalaj/pachet ${name}, varianta ${index + 1}">+</button><button class="text-button" data-remove="${index}" aria-label="Pune înapoi un pachet ${name}">Pune înapoi 1 pachet</button><button class="drag-handle" data-drag-entry="${index}" aria-label="Trage înapoi un pachet ${name}">⠿ Trage 1 pachet</button></div></div></li>`
  }).join('')}</ul></section>`).join('') : '<div class="cart-empty"><span aria-hidden="true">✳</span><h3>O săptămână de organizat.</h3><p>Alege un produs din departamente sau un exemplu separat din Atelier demo. Cantitatea netă și nutrienții pot rămâne necunoscuți.</p></div>'
  container.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(button => button.addEventListener('click', () => {
    const entry = cart[Number(button.dataset.edit)]!
    openProduct(entry.product, entry)
  }))
  container.querySelectorAll<HTMLButtonElement>('[data-quantity], [data-remove]').forEach(button => button.addEventListener('click', () => {
    if (!unlocked || !sessionAllowed || drag.active()) return
    const index = Number(button.dataset.quantity ?? button.dataset.remove)
    const entry = cart[index]!
    const change = Number(button.dataset.change ?? 0)
    if (change > 0 && (entry.quantity >= 99 || shoppingTotals(cart).quantity >= 999)) return
    rememberUndo()
    if (button.dataset.remove !== undefined) cart.splice(0, cart.length, ...returnPackage(cart, index)!)
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
  document.querySelector('#shopping-review-items')!.innerHTML = shoppingGroups(cart).map(group => `<section class="review-group"><h3>${escapeHtml(group.name)}</h3>${group.id === 'atelier' ? `<p class="notice">${demoNotice}</p>` : '<p class="hint">Asociere la cerere; disponibilitate și etichetă de verificat.</p>'}<ul>${group.entries.map(entry => `<li><span aria-hidden="true">□</span><div><strong>${escapeHtml(entry.product.name)}</strong><p>${escapeHtml(amountText(entry))}</p><small>${escapeHtml(nutritionText(entry))}</small><p>Cantitate netă: ${sourceLabels[entry.amountSource]}. Proveniență produs: ${escapeHtml(entry.product.provenance.source)}.</p><p>${valueText(scaled(entry.nutrition.calories, entryAmount(entry)), 'kcal')} în întreaga cantitate · ${escapeHtml(entry.product.group)}</p></div></li>`).join('')}</ul></section>`).join('') + `<p class="review-totals"><strong>Total cumpărături</strong> · ${escapeHtml(totalsText(cart))}</p><p class="hint">${partialNotice} Energie = kcal/100 g sau ml × cantitate netă în aceeași unitate ÷ 100. Nu calculăm un obiectiv de consum săptămânal.</p>`
  document.querySelector('#review-status')!.textContent = finalized ? 'Lista este pregătită pentru tipărire sau descărcare, inclusiv câmpurile necunoscute. Finalizarea nu verifică etichetele sau disponibilitatea.' : 'Verifică numărul de ambalaje/pachete, masa / volumul și magazinul fiecărui articol. Câmpurile necunoscute se păstrează. Aceasta nu este o comandă.'
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
  completeMission('review')
  renderReview()
  renderCart()
  document.querySelector<HTMLButtonElement>('#print-shopping')!.focus()
})
  function rememberUndo() { undoSnapshot = structuredClone(cart) }
  function updateDropCounts() {
    const count = shoppingTotals(cart).quantity
    document.querySelectorAll('#hud-count, #world-count, .drop-count').forEach(node => { node.textContent = `${count}${node.classList.contains('drop-count') ? ' pachete în listă' : ''}` })
    document.querySelectorAll<HTMLButtonElement>('[data-undo]').forEach(button => { button.disabled = !undoSnapshot || !unlocked })
  }
  function commitCart(next: ShoppingEntry[] | undefined) {
    if (!unlocked || !sessionAllowed) return
    if (!next) { announce('Limită: 99 pachete pe variantă, 30 variante, 999 pachete.'); return }
    rememberUndo()
    cart.splice(0, cart.length, ...next)
    invalidateList()
    renderCart()
    announce(`Listă actualizată: ${shoppingTotals(cart).quantity} pachete. Poți anula ultima modificare.`)
  }
  const drag = mountCartDrag({
    allowed: () => unlocked && sessionAllowed,
    freeze: () => game.clearMovement(), announce,
    commit: payload => {
      if (payload.kind === 'cart') commitCart(returnPackage(cart, payload.index))
      else {
        const product = currentProducts.find(item => item.id === payload.id)
        if (product) commitCart(addPackage(cart, product))
      }
    },
  })
  document.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLElement>('button')
    if (!target || !unlocked || !sessionAllowed) return
    if (target.hasAttribute('data-undo') && undoSnapshot) {
      drag.cancel()
      cart.splice(0, cart.length, ...structuredClone(undoSnapshot))
      undoSnapshot = undefined
      invalidateList()
      renderCart()
      announce('Ultima modificare a fost anulată.')
    }
    if (target.dataset.quickAdd && !drag.active()) {
      const product = currentProducts.find(item => item.id === target.dataset.quickAdd)
      if (product) commitCart(addPackage(cart, product))
    }
    const kind = target.dataset.hud ?? (target.id === 'world-cart' ? 'cart-dialog' : undefined)
    if (!kind) return
    drag.cancel()
    game.clearMovement()
    if (kind.endsWith('-dialog')) document.querySelector<HTMLDialogElement>(`#${kind}`)!.showModal()
    else if (kind === 'missions') showMissions()
    else if (onUtility && !guestEducational) onUtility(kind)
    else showOfflineUtility(kind)
  })
  function completeMission(id: string) {
    if (!unlocked || completed.includes(id)) return
    completed.push(id)
    announce('Descoperire educațională completată. Culorile avatarului se deblochează fără scor corporal.')
    if (!guestEducational) onProgress?.()
  }
  function showMissions() {
    utility.innerHTML = `<span class="eyebrow">DESCOPERIRI, NU CALORII</span><h2>Învață în <em>ritmul tău.</em></h2><p>Fără serii zilnice, clasamente corporale sau recompense pentru deficit. Nicio misiune nu este obligatorie.</p><ul class="mission-list">${[['inspect', 'Întoarce un ambalaj și citește eticheta'], ['compare', 'Compară două valori pentru aceeași porție'], ['review', 'Organizează și finalizează lista']].map(([id, label]) => `<li>${completed.includes(id!) ? '✓' : '○'} ${label}</li>`).join('')}</ul><h3>Culori pentru avatar</h3><div class="actions">${['clay', 'leaf', 'milk'].map((color, index) => `<button class="button ${color}" data-avatar="${color}" ${completed.length < index ? 'disabled' : ''} aria-pressed="${avatarColor === color}">${['Teracotă', 'Salvie', 'Perlat'][index]}${completed.length < index ? ` · ${index} descoperiri` : ''}</button>`).join('')}</div><p class="notice">Toate funcțiile de bază și listele reutilizabile sunt gratuite. În viitor: colecții cosmetice premium opționale. Nicio plată disponibilă acum, fără reclame bazate pe date personale.</p>`
    utility.querySelectorAll<HTMLButtonElement>('[data-avatar]').forEach(button => button.addEventListener('click', () => {
      avatarColor = button.dataset.avatar!
      game.setAvatarColor(avatarColor)
      if (!guestEducational) onProgress?.()
      showMissions()
    }))
    if (!utilityDialog.open) utilityDialog.showModal()
  }
  function showOfflineUtility(kind: string) {
    utility.innerHTML = kind === 'profile'
      ? `<h2>Profilul sesiunii</h2><p>${escapeHtml(document.querySelector('#session-summary')!.textContent ?? '')}</p><p>DEMO OFFLINE. Datele rămân în memoria acestei pagini.</p><button class="button" id="reset-profile">Schimbă profilul și golește sesiunea</button>`
      : '<h2>Liste salvate</h2><p>DEMO OFFLINE: nu există salvare în cloud. Lista curentă poate fi revizuită, tipărită și descărcată TXT din cărucior. Conturile și listele reutilizabile necesită configurarea serviciului.</p>'
    utility.querySelector('#reset-profile')?.addEventListener('click', () => { resetSession(); onboardingDialog.showModal() })
    utilityDialog.showModal()
  }
  renderCart()
  const entryDialog = document.querySelector<HTMLDialogElement>('#entry-dialog')!
  document.querySelector('#entry-content')!.innerHTML = `<span class="eyebrow">ATELIER DE MESE / MAGAZIN EDUCAȚIONAL</span><h1>La raft,<br><em>în ritmul tău.</em></h1><p>Descoperă etichetele. Umple căruciorul. Ia lista cu tine.</p><p class="notice">DEMO OFFLINE ONLY · cele 8 produse cerute sunt exemple neconfirmate. Fără conturi, plăți sau salvare cloud.</p><button class="button primary" id="enter-demo">Explorează demonstrația offline →</button>`
  document.querySelector('#enter-demo')!.addEventListener('click', () => { sessionAllowed = true; entryDialog.close(); onboardingDialog.showModal() })
  entryDialog.showModal()
  function applyCatalog(nextDepartments: Department[], products: Product[]) {
    drag.cancel()
    if (dialog.open) dialog.close()
    currentDepartments = nextDepartments
    currentProducts = products
    document.querySelector('#catalog-demo')!.replaceChildren()
    document.querySelector('#catalog-departments')!.innerHTML = `<div class="department-shortcuts">${nextDepartments.map(department => `<button class="department-card" data-live-department="${escapeHtml(department.id)}"><small>RAFT ${escapeHtml(department.number)}</small><strong>${escapeHtml(department.name)}</strong><span>${products.filter(product => product.department === department.id).length} produse</span></button>`).join('')}</div>`
    const world = document.querySelector('#store-world')!
    world.querySelectorAll('.shelf').forEach(node => node.remove())
    for (const department of nextDepartments) {
      const button = document.createElement('button')
      button.className = `shelf ${department.color}`
      button.dataset.liveDepartment = department.id
      button.style.left = `${department.x}px`
      button.style.top = `${department.y ?? 205}px`
      button.textContent = department.name
      button.setAttribute('aria-label', `Explorează raftul ${department.name}`)
      world.append(button)
    }
    document.querySelectorAll<HTMLElement>('[data-live-department]').forEach(button => button.addEventListener('click', () => {
      const department = currentDepartments.find(item => item.id === button.dataset.liveDepartment)
      if (unlocked && sessionAllowed && department) openDepartment(department)
    }))
    game.setCatalog(nextDepartments, products)
    game.setAvatarColor(avatarColor)
    renderCart()
  }
  if (cloud.configured || cloud.configurationError) {
    sessionAllowed = false
    document.querySelector('#connection-label')!.textContent = 'CONT REAL · conectare necesară'
    applyCatalog([], [])
    const connected = mountConnectedGame({
      reset: () => { guestEducational = false; sessionAllowed = false; resetSession() },
      allow: () => { sessionAllowed = true; resetOnboarding(); onboardingDialog.showModal() },
      catalog: applyCatalog,
      readCart: () => structuredClone(cart),
      loadCart: next => commitCart(next),
      body: () => ownBody,
      clearBody: () => {
        ownBody = undefined
        savedBody = undefined
        if (reference?.mode === 'own') {
          reference = { mode: 'educational', goal: 'explore' }
          document.querySelector('#session-summary')!.textContent = 'Explorare educațională · datele corporale au fost șterse.'
        }
        renderCart()
      },
      savedBody: next => { savedBody = next },
      readProgress: () => ({ completed: [...completed], color: avatarColor }),
      restoreProgress: (nextCompleted, color) => { completed = [...nextCompleted]; avatarColor = color; game.setAvatarColor(color) },
      utility, utilityDialog, entry: document.querySelector<HTMLElement>('#entry-content')!, entryDialog,
      educationalDemo: () => {
        resetSession()
        guestEducational = true
        sessionAllowed = true
        applyCatalog([...departments, { id: 'atelier', name: 'Atelier didactic', number: '04', x: 110, y: 475, color: 'milk' }], [...retailerCatalog, ...demoCatalog])
        document.querySelector('#connection-label')!.textContent = 'DEMO OFFLINE EDUCAȚIONAL · fără cont sau salvare'
        resetOnboarding()
        onboardingDialog.showModal()
      },
    })
    onUtility = connected.showUtility
    onProgress = connected.saveProgress
  }
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
  if (dialog.open) return
  game.clearMovement()
  const editedIndex = editingEntry ? cart.indexOf(editingEntry) : -1
  const returnTarget = editingEntry
    ? (editedIndex >= 0 ? document.querySelector<HTMLButtonElement>(`#cart-items [data-edit="${editedIndex}"]`) : null)
      ?? document.querySelector<HTMLElement>('#cart-title')
    : opener
  activeProduct = undefined
  editingEntry = undefined
  detail.querySelectorAll<HTMLInputElement>('input').forEach(field => field.value = '')
  detail.replaceChildren()
  document.body.classList.remove('modal-open')
  if (unlocked) {
    const target = returnTarget?.isConnected ? returnTarget : document.querySelector<HTMLElement>('#store-world')
    target?.focus({ preventScroll: true })
  }
})
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return
  const rect = dialog.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close()
})
renderCart()
