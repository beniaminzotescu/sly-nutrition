import './style.css'
import { StoreScene } from './store-scene'

type Product = {
  id: string
  name: string
  flavor: string
  color: string
  number: string
  calories: number
  sugar: number
  x: number
}
type CartEntry = {
  key: string
  product: Product
  portion: number
  calories: number
  sugar: number
  quantity: number
}

const products: Product[] = [
  { id: 'cacao', name: 'Cacao', flavor: 'COCOA', color: 'cocoa', number: '01', calories: 460, sugar: 8, x: 110 },
  { id: 'vanilie', name: 'Vanilie', flavor: 'VANILLA', color: 'vanilla', number: '02', calories: 480, sugar: 10, x: 400 },
  { id: 'alune', name: 'Alune', flavor: 'HAZELNUT', color: 'hazelnut', number: '03', calories: 510, sugar: 12, x: 690 },
]
const format = (value: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 1 }).format(value)
const pack = (p: Product) => `
  <div class="pack ${p.color}" aria-hidden="true">
    <div class="pack-seal top"></div>
    <div class="pack-inner">
      <span class="pack-brand">sly<span>nutrition</span></span>
      <span class="pack-label">UN MOMENT.<br>DE CURIOSITATE.</span>
      <span class="pack-flavor">${p.flavor}</span>
      <span class="pack-type">NAPOLITANĂ · CONCEPT VIZUAL</span>
      <div class="wafer"></div>
      <span class="pack-bottom">AMBALAJ DEMO <b>20 g</b></span>
    </div><div class="pack-seal bottom"></div>
  </div>`
const miniPack = (p: Product) => `<span class="mini-pack ${p.color}" aria-hidden="true"><b>sly</b><i></i></span>`

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <a class="skip-link" href="#product-shortcuts">Sari la produse, fără deplasare</a>
  <header class="header">
    <a class="logo" href="./" aria-label="SLY Nutrition, reîncepe">sly<span>NUTRITION</span><i></i></a>
    <div class="header-divider"></div><span class="header-label">THE LITTLE STORE</span>
    <span class="session-badge"><i></i> Un joc de explorat, nu de cumpărat</span>
  </header>
  <main id="main">
    <section class="intro" aria-labelledby="store-title">
      <div><div class="eyebrow">SLY UNIVERSE / MAGAZIN VIRTUAL</div><h1 id="store-title">La raft, <em>în ritmul tău.</em></h1></div>
      <p>Plimbă-te. Întoarce ambalajul. Descoperă porția.<br>În cărucior aduni <strong>kcal, nu prețuri.</strong></p>
    </section>
    <div class="store-layout">
      <section class="store-panel" aria-label="Explorează magazinul">
        <div class="store-topline"><span><i class="status-dot"></i> LITTLE STORE — 01</span><span>MAGAZIN 3D · 3 GUSTURI</span></div>
        <div class="scene-viewport">
          <div class="scene-3d" id="scene-mount" aria-hidden="true"></div>
          <div id="store-world" class="store-world" tabindex="0" role="region" aria-label="Magazin. Deplasează-te cu săgețile sau WASD. Apasă E lângă un raft pentru a inspecta." aria-describedby="movement-help">
            <div class="back-wall" aria-hidden="true"><div class="wall-brand">sly<span>THE LITTLE STORE</span></div><div class="wall-message">O pauză mică.<br><em>O lume de descoperit.</em></div><span class="wall-star">✳</span></div>
            <div class="floor" aria-hidden="true"></div>
            <div class="floor-rug" aria-hidden="true">STAY CURIOUS <span>↗</span></div>
            <div class="plant plant-left" aria-hidden="true"><i></i><i></i><i></i><span></span></div>
            <div class="plant plant-right" aria-hidden="true"><i></i><i></i><i></i><span></span></div>
            ${products.map(p => `
              <button class="shelf ${p.color}" style="left:${p.x}px" data-product="${p.id}" disabled aria-label="Inspectează raftul ${p.name} — ambalaj și valori demo">
                <span class="shelf-sign"><span>${p.number} / NAPOLITANE</span><strong>${p.name}</strong><i>↗</i></span>
                <span class="shelf-top"></span>
                <span class="shelf-row row-back">${Array.from({ length: 4 }, () => miniPack(p)).join('')}</span>
                <span class="shelf-row row-front">${Array.from({ length: 4 }, () => miniPack(p)).join('')}</span>
                <span class="shelf-lip"><b>SLY / ${p.flavor}</b><span>DEMO</span></span>
                <span class="shelf-base"></span>
              </button>`).join('')}
            <div class="aisle-label aisle-one" aria-hidden="true">01 — EXPLOREAZĂ</div>
            <div class="aisle-label aisle-two" aria-hidden="true">02 — DESCOPERĂ</div>
            <div class="entrance-mat" aria-hidden="true"><span>↑</span> INTRARE <span>↑</span></div>
            <div id="player" class="player" aria-hidden="true">
              <div class="player-shadow"></div><div class="avatar"><div class="avatar-legs"><i></i><i></i></div><div class="avatar-body"></div><div class="avatar-head"></div><div class="avatar-hair"></div><div class="avatar-arm"></div></div>
              <div class="trolley"><span class="trolley-handle"></span><div id="trolley-packs"></div><span class="basket-grid"></span><i class="wheel wheel-one"></i><i class="wheel wheel-two"></i><b id="trolley-count" hidden>0</b></div>
              <span class="player-label">TU</span>
            </div>
          </div>
          <div class="entry-overlay" id="entry">
            <div class="entry-card"><span class="entry-icon" aria-hidden="true">↗</span><div class="eyebrow">UȘA E DESCHISĂ</div><h2>Un mic pas.<br><em>Direct în magazin.</em></h2><p>Tu, un cărucior și trei rafturi de explorat.<br>Fără grabă. Fără listă de cumpărături.</p><button class="button primary" id="enter-store">Intră în magazin <span aria-hidden="true">↗</span></button><small>Fără cont · Fără plată · Doar curiozitate</small></div>
          </div>
          <span class="scene-demo">AMBALAJE CONCEPT · VALORI DEMO</span>
          <div class="camera-controls" role="group" aria-label="Vedere 3D"><span>VEDERE 3D</span><button data-camera="-1" aria-label="Rotește vederea la stânga" disabled>↶</button><button data-camera="1" aria-label="Rotește vederea la dreapta" disabled>↷</button></div>
        </div>
        <p class="webgl-notice" id="webgl-notice" role="status" hidden>Vederea 3D nu este disponibilă în acest browser. Poți explora varianta 2D sau folosi accesul direct la raft; etichetele și căruciorul funcționează în continuare.</p>
        <div class="game-controls">
          <div class="movement-copy"><strong id="location" role="status">Căruciorul te așteaptă.</strong><p id="movement-help"><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd> pentru mers · <kbd>E</kbd> la raft<br>Sau alege direct un produs de mai jos.</p></div>
          <button class="button inspect-button" id="inspect-nearby" disabled>Apropie-te de un raft <span aria-hidden="true">↗</span></button>
          <div class="direction-pad" role="group" aria-label="Deplasare cu atingere">
            <button data-direction="up" aria-label="Mergi înainte" disabled>↑</button>
            <button data-direction="left" aria-label="Mergi la stânga" disabled>←</button>
            <button data-direction="down" aria-label="Mergi înapoi" disabled>↓</button>
            <button data-direction="right" aria-label="Mergi la dreapta" disabled>→</button>
          </div>
        </div>
        <div class="shortcut-heading"><span>ACCES DIRECT LA RAFT</span><span>Fără deplasare, aceeași experiență ↘</span></div>
        <div class="product-shortcuts" id="product-shortcuts" tabindex="-1">
          ${products.map(p => `<button class="product-shortcut ${p.color}" data-product="${p.id}" disabled>${miniPack(p)}<span><small>RAFT ${p.number}</small><strong>${p.name}</strong><small>Inspectează ambalajul</small></span><span class="shortcut-arrow" aria-hidden="true">↗</span></button>`).join('')}
        </div>
      </section>
      <aside class="cart-panel" aria-labelledby="cart-title">
        <div class="cart-heading"><div><div class="eyebrow">ALEGERILE TALE</div><h2 id="cart-title">Căruciorul <em>tău.</em></h2></div><span id="cart-count" class="cart-count">0</span></div>
        <div class="cart-total"><span>TOTAL ÎN CĂRUCIOR</span><div><strong id="cart-total">0</strong> <span>kcal</span></div><p>Informație, nu un obiectiv.</p></div>
        <div id="cart-items"></div>
        <div class="cart-footnote"><span class="demo-pill">SIMULARE</span><p>Valori demo editabile, nu date nutriționale verificate. Fiecare adăugare păstrează porția și valorile alese atunci.</p></div>
        <div class="receipt-edge" aria-hidden="true"></div>
      </aside>
    </div>
    <section class="how-it-works" aria-label="Cum funcționează"><p><span>01</span> Plimbă-te printre rafturi.</p><p><span>02</span> Citește dincolo de ambalaj.</p><p><span>03</span> Explorează porțiile, fără judecată.</p></section>
  </main>
  <footer><span>SLY NUTRITION / CONCEPT INTERACTIV INDEPENDENT</span><p>Nimic de plătit. Datele rămân în memoria paginii și se resetează la reîncărcare.</p><a href="https://slynutrition.eu/" target="_blank" rel="noopener noreferrer">Site-ul oficial SLY ↗</a></footer>
  <dialog id="product-dialog" aria-labelledby="detail-title">
    <button class="close-button" aria-label="Închide detaliile produsului" autofocus>✕</button><div id="product-detail"></div>
  </dialog>
  <div id="announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
`

const world = document.querySelector<HTMLDivElement>('#store-world')!
const player = document.querySelector<HTMLDivElement>('#player')!
const dialog = document.querySelector<HTMLDialogElement>('#product-dialog')!
const nearbyButton = document.querySelector<HTMLButtonElement>('#inspect-nearby')!
const location = document.querySelector<HTMLElement>('#location')!
const cart: CartEntry[] = []
const heldKeys = new Set<string>()
const pointerDirections = new Map<number, string>()
let entered = false
let nearby: Product | undefined
let activeProduct: Product | undefined
let opener: HTMLElement | null = null
let x = 470
let y = 525
let lastTime = 0
let accumulator = 0
let storeScene: StoreScene | undefined
let threeAvailable = false

try {
  storeScene = new StoreScene({
    mount: document.querySelector<HTMLElement>('#scene-mount')!,
    products,
    inspect: id => {
      if (!entered || dialog.open) return
      const product = products.find(item => item.id === id)
      world.focus({ preventScroll: true })
      if (product) openProduct(product)
    },
    availability: available => {
      threeAvailable = available
      document.querySelector('.scene-viewport')!.classList.toggle('has-webgl', available)
      document.querySelector<HTMLElement>('#scene-mount')!.hidden = !available
      document.querySelector<HTMLElement>('#webgl-notice')!.hidden = available
      document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(button => button.disabled = !available || !entered)
      clearMovement()
    },
  })
} catch {
  document.querySelector<HTMLElement>('#scene-mount')!.hidden = true
  document.querySelector<HTMLElement>('#webgl-notice')!.hidden = false
}
document.querySelector('#scene-mount')!.addEventListener('pointerdown', () => {
  if (entered && !dialog.open) world.focus({ preventScroll: true })
})
document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(button => button.addEventListener('click', () => {
  clearMovement()
  storeScene?.rotate(Number(button.dataset.camera))
  world.focus({ preventScroll: true })
}))
if (import.meta.hot) import.meta.hot.dispose(() => storeScene?.dispose())

function announce(message: string) {
  document.querySelector('#announcement')!.textContent = message
}

function clearMovement() {
  heldKeys.clear()
  pointerDirections.clear()
  accumulator = 0
  player.classList.remove('walking')
}

function resizeWorld() {
  const viewport = document.querySelector<HTMLElement>('.scene-viewport')!
  world.style.transform = `scale(${viewport.clientWidth / 960})`
}
new ResizeObserver(resizeWorld).observe(document.querySelector('.scene-viewport')!)
resizeWorld()

function renderPlayer() {
  player.style.left = `${x}px`
  player.style.top = `${y}px`
  player.style.zIndex = y < 355 ? '2' : '4'
  const next = products.find(p => {
    const dx = Math.max(p.x - x, 0, x - (p.x + 165))
    const dy = Math.max(205 - y, 0, y - 365)
    return Math.hypot(dx, dy) < 105
  })
  if (next !== nearby || !location.dataset.ready) {
    nearby = next
    location.dataset.ready = 'true'
    location.textContent = next ? `Raft ${next.number} · ${next.name}. Curios ce scrie pe etichetă?` : 'În ritmul tău. Alege un raft.'
    nearbyButton.disabled = !next || !entered
    nearbyButton.innerHTML = next ? `Inspectează ${next.name} <span aria-hidden="true">↗</span>` : 'Apropie-te de un raft <span aria-hidden="true">↗</span>'
    document.querySelectorAll<HTMLElement>('.shelf').forEach(shelf => shelf.classList.toggle('nearby', shelf.dataset.product === next?.id))
  }
}

// A rotation-safe footprint contains the avatar and trolley in every heading.
function canMove(nextX: number, nextY: number) {
  if (nextX < 45 || nextX > 915 || nextY < 132 || nextY > 568) return false
  return !products.some(p => nextX + 53 > p.x && nextX - 53 < p.x + 165 && nextY + 53 > 205 && nextY - 53 < 365)
}

function tick(time: number) {
  const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0
  lastTime = time
  const directions = new Set([...heldKeys].map(key => keyDirections[key]).concat([...pointerDirections.values()]))
  let dx = Number(directions.has('right')) - Number(directions.has('left'))
  let dy = Number(directions.has('down')) - Number(directions.has('up'))
  if (threeAvailable && storeScene) ({ dx, dy } = storeScene.movement(dx, dy))
  const moving = entered && !dialog.open && !document.hidden && (dx !== 0 || dy !== 0)
  player.classList.toggle('walking', moving)
  if (moving) {
    const length = Math.hypot(dx, dy)
    dx /= length
    dy /= length
    accumulator += delta
    const step = 1 / 120
    while (accumulator >= step) {
      const nextX = x + dx * 175 * step
      if (canMove(nextX, y)) x = nextX
      const nextY = y + dy * 175 * step
      if (canMove(x, nextY)) y = nextY
      accumulator -= step
    }
    player.dataset.facing = dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down'
    renderPlayer()
  } else {
    accumulator = 0
  }
  if (!document.hidden) storeScene?.update(x, y, moving, dx, dy, time, entered ? nearby?.id : undefined)
  requestAnimationFrame(tick)
}
player.style.left = `${x}px`
player.style.top = `${y}px`
requestAnimationFrame(tick)

const keyDirections: Record<string, string> = { w: 'up', arrowup: 'up', a: 'left', arrowleft: 'left', s: 'down', arrowdown: 'down', d: 'right', arrowright: 'right' }
function isInteractive(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, button, a, summary, [contenteditable], [role="button"], [role="slider"]'))
}
window.addEventListener('keydown', event => {
  if (!entered || dialog.open || event.altKey || event.ctrlKey || event.metaKey || isInteractive(event.target)) return
  const key = event.key.toLowerCase()
  if (keyDirections[key]) {
    event.preventDefault()
    heldKeys.add(key)
  } else if (key === 'e' && nearby && !event.repeat) {
    event.preventDefault()
    openProduct(nearby)
  }
})
window.addEventListener('keyup', event => {
  heldKeys.delete(event.key.toLowerCase())
})
window.addEventListener('blur', clearMovement)
document.addEventListener('visibilitychange', () => {
  clearMovement()
  lastTime = 0
})
document.addEventListener('focusin', event => {
  if (isInteractive(event.target)) clearMovement()
})
document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (!entered || dialog.open) return
    event.preventDefault()
    world.focus({ preventScroll: true })
    button.setPointerCapture(event.pointerId)
    pointerDirections.set(event.pointerId, button.dataset.direction!)
  })
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(name, event => pointerDirections.delete((event as PointerEvent).pointerId))
  }
  button.addEventListener('click', event => {
    if (event.detail !== 0 || !entered || dialog.open) return
    const direction = button.dataset.direction
    let dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0
    let dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0
    if (threeAvailable && storeScene) ({ dx, dy } = storeScene.movement(dx, dy))
    for (let i = 0; i < 12; i++) {
      if (canMove(x + dx * 2, y)) x += dx * 2
      if (canMove(x, y + dy * 2)) y += dy * 2
    }
    renderPlayer()
  })
})
document.querySelector('#enter-store')!.addEventListener('click', () => {
  entered = true
  document.querySelector<HTMLElement>('#entry')!.hidden = true
  document.querySelectorAll<HTMLButtonElement>('[data-product], [data-direction]').forEach(button => button.disabled = false)
  document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(button => button.disabled = !threeAvailable)
  world.focus({ preventScroll: true })
  renderPlayer()
  announce('Ai intrat în magazin. Folosește săgețile sau WASD, ori butoanele de acces direct la raft.')
})
nearbyButton.addEventListener('click', () => {
  if (nearby) openProduct(nearby)
})
document.querySelectorAll<HTMLButtonElement>('[data-product]').forEach(button => button.addEventListener('click', () => {
  const product = products.find(p => p.id === button.dataset.product)
  if (product && entered) openProduct(product)
}))

function openProduct(product: Product) {
  clearMovement()
  activeProduct = product
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : world
  document.querySelector('#product-detail')!.innerHTML = `
    <div class="detail-layout">
      <div class="package-panel ${product.color}">
        <div class="eyebrow">RAFT ${product.number} / AMBALAJ CONCEPT</div>
        <div class="package-display">
          <div id="package-front">${pack(product)}<span class="package-caption">FAȚĂ · CONCEPT VIZUAL, NU ETICHETĂ REALĂ</span></div>
          <div id="package-back" class="package-back" hidden>
            <span class="back-brand">sly / ${product.flavor}</span><h3>Dincolo de ambalaj.</h3><span class="demo-pill">ETICHETĂ DEMO</span>
            <dl><div><dt>Valori introduse</dt><dd>/ 100 g</dd></div><div><dt>Energie</dt><dd id="label-calories"></dd></div><div><dt>Zaharuri</dt><dd id="label-sugar"></dd></div></dl>
            <p><strong>Ingrediente și alergeni:</strong><br>informații indisponibile în acest prototip. Verifică ambalajul real înainte de consum.</p><p>Nu sunt date nutriționale verificate ale produsului SLY.</p>
            <div class="barcode" aria-hidden="true"></div>
          </div>
        </div>
        <button class="button flip-button" id="flip-package" aria-pressed="false" aria-controls="package-front package-back">Întoarce pe verso <span aria-hidden="true">⟳</span></button>
        <p class="package-note">Ambalajul ilustrează 20 g.<br>Porția din simulare se alege separat.</p>
      </div>
      <div class="detail-content">
        <div class="eyebrow">NAPOLITANE / ${product.flavor}</div><h2 id="detail-title">Un moment cu <em>${product.name.toLowerCase()}.</em></h2>
        <p class="demo-notice"><strong>Simulare, nu valori verificate.</strong> Exemple editabile, nu informații nutriționale ale produsului SLY.</p>
        <div class="portion-control"><label for="portion">Porția ta <small>Aceeași pentru ambele produse</small></label><output for="portion" id="portion-value">20 g</output><input id="portion" type="range" min="10" max="100" step="5" value="20"></div>
        <fieldset class="nutrition-inputs"><legend>Valorile alese <span>/ 100 g · demo editabil</span></legend><label for="sly-calories">Energie (kcal)<input id="sly-calories" type="number" min="0" max="1000" step="0.1" value="${product.calories}" inputmode="decimal" required aria-describedby="input-error"></label><label for="sly-sugar">Zaharuri (g)<input id="sly-sugar" type="number" min="0" max="100" step="0.1" value="${product.sugar}" inputmode="decimal" required aria-describedby="input-error"></label></fieldset>
        <p id="input-error" class="input-error" role="alert" hidden>Completează valori valide: 0–1.000 kcal și 0–100 g zaharuri, cu cel mult o zecimală.</p>
        <div class="portion-summary" aria-live="polite" aria-atomic="true"><div><span>ÎN PORȚIA TA</span><strong id="portion-calories"></strong></div><p id="portion-sugar"></p></div>
        <button class="button primary add-button" id="add-to-cart">Adaugă în cărucior <span aria-hidden="true">＋</span></button>
        <p id="add-status" class="add-status" role="status"></p>
        <details class="comparison"><summary>Compară cu altă gustare <span aria-hidden="true">＋</span></summary>
          <p>Introdu valorile de pe două etichete pentru a compara aceeași porție. Mai puțin zahăr nu înseamnă automat mai puține calorii.</p>
          <fieldset class="nutrition-inputs"><legend>Gustarea de comparat <span>/ 100 g · demo</span></legend><label for="regular-calories">Energie (kcal)<input id="regular-calories" type="number" min="0" max="1000" step="0.1" value="500" inputmode="decimal" required aria-describedby="comparison-error"></label><label for="regular-sugar">Zaharuri (g)<input id="regular-sugar" type="number" min="0" max="100" step="0.1" value="30" inputmode="decimal" required aria-describedby="comparison-error"></label></fieldset>
          <p id="comparison-error" class="input-error" role="alert" hidden>Completează comparația: 0–1.000 kcal și 0–100 g zaharuri, cu cel mult o zecimală.</p>
          <div class="comparison-results" aria-live="polite" aria-atomic="true"><div><span id="calorie-label"></span><strong id="calorie-result"></strong><small id="calorie-detail"></small></div><div><span id="sugar-label"></span><strong id="sugar-result"></strong><small id="sugar-detail"></small></div></div>
        </details>
        <p class="label-note">Ingrediente și alergeni: <strong>indisponibile.</strong> Verifică eticheta reală. Caloriile sunt informație, nu un scor „bun” sau „rău”.</p>
        <button class="text-button" id="continue-exploring">← Înapoi printre rafturi</button>
      </div>
    </div>`
  document.querySelector('#flip-package')!.addEventListener('click', () => {
    const front = document.querySelector<HTMLElement>('#package-front')!
    front.hidden = !front.hidden
    document.querySelector<HTMLElement>('#package-back')!.hidden = !front.hidden
    const button = document.querySelector('#flip-package')!
    button.setAttribute('aria-pressed', String(front.hidden))
    button.innerHTML = `${front.hidden ? 'Întoarce pe față' : 'Întoarce pe verso'} <span aria-hidden="true">⟳</span>`
  })
  document.querySelectorAll<HTMLInputElement>('#product-detail input').forEach(input => input.addEventListener('input', updateNutrition))
  document.querySelector('#add-to-cart')!.addEventListener('click', addToCart)
  document.querySelector('#continue-exploring')!.addEventListener('click', () => dialog.close())
  updateNutrition()
  dialog.showModal()
  document.body.classList.add('modal-open')
}
dialog.querySelector('.close-button')!.addEventListener('click', () => dialog.close())
dialog.addEventListener('close', () => {
  if (dialog.open) return
  clearMovement()
  document.body.classList.remove('modal-open')
  if (document.activeElement === document.body || dialog.contains(document.activeElement)) {
    opener?.focus({ preventScroll: true })
  }
})
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return
  const rect = dialog.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close()
})

const input = (id: string) => document.querySelector<HTMLInputElement>(`#${id}`)!
function validInputs(ids: string[]) {
  return ids.every(id => {
    const field = input(id)
    const valid = field.value !== '' && Number.isFinite(field.valueAsNumber) && field.checkValidity()
    field.setAttribute('aria-invalid', String(!valid))
    return valid
  })
}
function updateNutrition() {
  const portion = input('portion').valueAsNumber
  const selectedValid = validInputs(['sly-calories', 'sly-sugar', 'portion'])
  const comparisonValid = validInputs(['regular-calories', 'regular-sugar'])
  document.querySelector('#portion-value')!.textContent = `${portion} g`
  document.querySelector<HTMLElement>('#input-error')!.hidden = selectedValid
  document.querySelector<HTMLElement>('#comparison-error')!.hidden = comparisonValid
  document.querySelector<HTMLElement>('.comparison-results')!.hidden = !selectedValid || !comparisonValid
  document.querySelector<HTMLButtonElement>('#add-to-cart')!.disabled = !selectedValid
  document.querySelector('#add-status')!.textContent = ''
  document.querySelector('#portion-calories')!.textContent = selectedValid ? `${format(input('sly-calories').valueAsNumber * portion / 100)} kcal` : '— kcal'
  document.querySelector('#portion-sugar')!.textContent = selectedValid ? `${format(input('sly-sugar').valueAsNumber * portion / 100)} g zaharuri / ${portion} g` : 'Verifică valorile introduse.'
  document.querySelector('#label-calories')!.textContent = selectedValid ? `${format(input('sly-calories').valueAsNumber)} kcal` : '—'
  document.querySelector('#label-sugar')!.textContent = selectedValid ? `${format(input('sly-sugar').valueAsNumber)} g` : '—'
  if (!selectedValid || !comparisonValid) return
  for (const [key, field, unit, noun] of [['calorie', 'calories', 'kcal', 'calorii'], ['sugar', 'sugar', 'g', 'zaharuri']] as const) {
    const before = input(`regular-${field}`).valueAsNumber * portion / 100
    const after = input(`sly-${field}`).valueAsNumber * portion / 100
    const difference = before - after
    document.querySelector(`#${key}-label`)!.textContent = Math.abs(difference) < 0.0001 ? `${noun === 'calorii' ? 'Calorii' : 'Zaharuri'}: fără diferență` : `${difference > 0 ? 'Mai puține' : 'Mai multe'} ${noun}`
    document.querySelector(`#${key}-result`)!.textContent = `${format(Math.abs(difference))} ${unit}`
    document.querySelector(`#${key}-detail`)!.textContent = `${format(before)} → ${format(after)} ${unit} / ${portion} g`
  }
}

function addToCart() {
  if (!activeProduct || !validInputs(['sly-calories', 'sly-sugar', 'portion'])) return
  const portion = input('portion').valueAsNumber
  const calories = input('sly-calories').valueAsNumber
  const sugar = input('sly-sugar').valueAsNumber
  const key = `${activeProduct.id}:${portion}:${calories}:${sugar}`
  const existing = cart.find(entry => entry.key === key)
  const status = document.querySelector('#add-status')!
  if ((existing?.quantity ?? 0) >= 99 || cart.reduce((sum, entry) => sum + entry.quantity, 0) >= 999 || (!existing && cart.length >= 30)) {
    status.textContent = 'Căruciorul este plin pentru această simulare (99 / variantă, 30 variante, 999 porții). Scoate o porție pentru a continua.'
    return
  }
  if (existing) existing.quantity++
  else cart.push({ key, product: activeProduct, portion, calories, sugar, quantity: 1 })
  renderCart()
  status.textContent = `${activeProduct.name} · ${portion} g adăugat. Porția și valorile au fost păstrate în cărucior.`
}

function renderCart() {
  const count = cart.reduce((sum, entry) => sum + entry.quantity, 0)
  const total = cart.reduce((sum, entry) => sum + entry.calories * entry.portion / 100 * entry.quantity, 0)
  document.querySelector('#cart-count')!.textContent = String(count)
  document.querySelector('#cart-count')!.setAttribute('aria-label', `${count} porții în cărucior`)
  document.querySelector('#cart-total')!.textContent = format(total)
  const container = document.querySelector('#cart-items')!
  container.innerHTML = cart.length ? `<ul class="cart-list">${cart.map((entry, index) => `
    <li class="cart-item">${miniPack(entry.product)}<div><h3>${entry.product.name} <span>× ${entry.quantity}</span></h3><p>${entry.portion} g / porție · ${format(entry.calories * entry.portion / 100)} kcal</p><small>${format(entry.calories)} kcal · ${format(entry.sugar)} g zaharuri / 100 g</small><div class="cart-item-bottom"><strong>${format(entry.calories * entry.portion / 100 * entry.quantity)} kcal</strong><button data-remove="${index}" aria-label="Scoate o porție ${entry.product.name}, ${entry.portion} g, ${format(entry.calories)} kcal și ${format(entry.sugar)} g zaharuri per 100 g">− Scoate una</button></div></div></li>`).join('')}</ul>` : `
    <div class="cart-empty"><div class="empty-cart-art" aria-hidden="true"><span>✳</span><i></i></div><h3>Loc pentru curiozitate.</h3><p>Inspectează un produs și alege<br>o porție. O vei vedea aici<br>și în căruciorul din magazin.</p></div>`
  container.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.remove)
    const entry = cart[index]!
    entry.quantity--
    if (!entry.quantity) cart.splice(index, 1)
    renderCart()
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-remove]')
    if (buttons.length) buttons[Math.min(index, buttons.length - 1)]!.focus({ preventScroll: true })
    else {
      const title = document.querySelector<HTMLElement>('#cart-title')!
      title.tabIndex = -1
      title.focus({ preventScroll: true })
    }
    announce(`O porție ${entry.product.name} scoasă. ${cart.reduce((sum, item) => sum + item.quantity, 0)} porții în cărucior. Total ${document.querySelector('#cart-total')!.textContent} kcal.`)
  }))
  const visiblePacks = cart.flatMap(entry => Array.from({ length: Math.min(entry.quantity, 6) }, () => entry.product)).slice(0, 6)
  storeScene?.setCart(visiblePacks, count)
  document.querySelector('#trolley-packs')!.innerHTML = visiblePacks.map(miniPack).join('')
  const trolleyCount = document.querySelector<HTMLElement>('#trolley-count')!
  trolleyCount.hidden = count === 0
  trolleyCount.textContent = count > 6 ? `+${count - 6}` : String(count)
  player.setAttribute('data-cart-count', String(count))
}
renderCart()
