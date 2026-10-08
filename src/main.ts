import './style.css'

type Product = {
  id: string
  name: string
  flavor: string
  color: string
  number: string
  description: string
}

const products: Product[] = [
  { id: 'cacao', name: 'Cacao', flavor: 'COCOA', color: 'cocoa', number: '01', description: 'Cremă de cacao, foi crocante și un moment doar al tău.' },
  { id: 'vanilie', name: 'Vanilie', flavor: 'VANILLA', color: 'vanilla', number: '02', description: 'Gust delicat de vanilie, între straturi ușoare și crocante.' },
  { id: 'alune', name: 'Alune', flavor: 'HAZELNUT', color: 'hazelnut', number: '03', description: 'O pauză crocantă cu gustul bogat și familiar al alunelor.' },
]

const arrow = '<span aria-hidden="true">↗</span>'
const pack = (p: Product) => `
  <div class="pack ${p.color}" aria-hidden="true">
    <div class="pack-seal top"></div><div class="pack-inner">
      <span class="pack-brand">sly<span>nutrition</span></span>
      <span class="pack-label">LESS SUGAR.<br>MORE YOU.</span>
      <span class="pack-flavor">${p.flavor}</span>
      <span class="pack-type">NAPOLITANĂ CU CREMĂ</span>
      <div class="wafer"></div>
      <span class="pack-bottom">CONCEPT DE AMBALAJ <b>20 g</b></span>
    </div><div class="pack-seal bottom"></div>
  </div>`

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <a class="skip-link" href="#main">Sari la conținut</a>
  <header class="header">
    <a class="logo" href="#" aria-label="SLY Nutrition, acasă">sly<span>NUTRITION</span><i></i></a>
    <nav aria-label="Navigare principală">
      <a class="nav-active" href="#univers">Universul SLY</a>
      <a href="#produse">Produsele noastre</a>
      <a href="#filozofie">De ce SLY?</a>
    </nav>
    <button class="header-cta" data-journey>Începe cu tine ${arrow}</button>
  </header>
  <main id="main">
    <section class="hero" id="univers" aria-labelledby="hero-title">
      <div class="hero-copy">
        <div class="eyebrow"><span class="status-dot"></span> BUN VENIT ÎN VIITORUL TĂU DULCE</div>
        <h1 id="hero-title">Un mic pas.<br>Un alt fel<br>de <em>dulce.</em><span class="title-star" aria-hidden="true">✳</span></h1>
        <p>Nu trebuie să renunți la ce-ți place.<br>Doar să descoperi o altă variantă.<br>Intră în universul SLY și alege conștient.</p>
        <div class="hero-actions"><a class="button primary" href="#produse">Explorează universul ${arrow}</a><button class="text-button" data-journey><span class="play-icon" aria-hidden="true">▷</span> Cum funcționează</button></div>
        <div class="hero-note"><span class="tiny-orbit" aria-hidden="true">✧</span> Mai multă curiozitate. Mai puțin zahăr adăugat.</div>
      </div>
      <div class="universe" aria-label="Univers virtual cu trei concepte de ambalaj SLY">
        <div class="scene-grid"></div><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
        <div class="scene-top"><span><i class="status-dot"></i> SLY UNIVERSE</span><span>EST. ÎN ROMÂNIA ↗</span></div>
        <span class="scene-spark spark-one" aria-hidden="true">✳</span><span class="scene-spark spark-two" aria-hidden="true">+</span>
        <div class="portal"></div>
        <div class="floating-pack pack-left">${pack(products[2]!)}</div>
        <div class="floating-pack pack-right">${pack(products[1]!)}</div>
        <button class="floating-pack pack-center" data-product="cacao" aria-label="Descoperă napolitana cu cacao">${pack(products[0]!)}</button>
        <div class="scene-tag tag-top"><span>✧</span> Același ritual. O nouă alegere.</div>
        <div class="scene-tag tag-bottom"><span>↗</span><div>GUSTUL RĂMÂNE.<br><b>Alegerea se schimbă.</b></div></div>
        <div class="pedestal"><span>YOUR NEXT LITTLE STEP</span></div>
        <div class="scene-bottom"><span>01 — THE SWEET SPACE</span><span>INTERACTIV <span aria-hidden="true">⊕</span></span></div>
      </div>
      <div class="hero-bottom"><span>O SCHIMBARE MICĂ POATE ÎNCEPE CU CEVA BUN.</span><a href="#produse">SCROLL PENTRU A DESCOPERI <span aria-hidden="true">↓</span></a></div>
    </section>
    <div class="values-strip" aria-label="Valorile experienței"><span>Gust fără compromisuri <i>✳</i></span><span>Alegeri conștiente <i>✳</i></span><span>Pași mici, în ritmul tău <i>✳</i></span><span>Un brand românesc <i>✳</i></span></div>
    <section class="products-section section" id="produse" aria-labelledby="products-title">
      <div class="section-heading"><div><div class="eyebrow">01 / DESCOPERĂ-ȚI FAVORITUL</div><h2 id="products-title">Pofta ta. <em>O nouă perspectivă.</em></h2></div><p>Intră, explorează, compară.<br>Nu e un magazin. E un început.</p></div>
      <div class="product-toolbar"><div class="category-label"><span aria-hidden="true">▦</span> Colecția de napolitane <span class="count">03</span></div><span class="toolbar-note">UN CLICK. O ALEGERE MAI INFORMATĂ. ↘</span></div>
      <div class="product-grid">${products.map(p => `
        <button class="product-card ${p.color}" data-product="${p.id}" aria-label="Explorează napolitana cu ${p.name.toLowerCase()}">
          <div class="product-art"><span class="product-index">${p.number} / SLY COLLECTION</span><span class="product-badge">DE EXPLORAT</span><div class="product-halo"></div>${pack(p)}<span class="product-art-caption">CONCEPT DE AMBALAJ · 20 g</span></div>
          <div class="product-info"><div><span class="product-type">CROCANTĂ. CREMOASĂ. SLY.</span><h3>Napolitană cu ${p.name.toLowerCase()}</h3><p>${p.description}</p></div><span class="round-arrow" aria-hidden="true">↗</span></div>
        </button>`).join('')}</div>
      <p class="collection-note">O primă privire în universul SLY. Ambalajele sunt concepte vizuale, nu fotografii ale produselor comercializate.</p>
    </section>
    <section class="philosophy section" id="filozofie" aria-labelledby="philosophy-title">
      <div class="philosophy-intro"><div class="eyebrow">02 / SCHIMBAREA ÎNCEPE CU TINE</div><h2 id="philosophy-title">Nu un alt tu.<br><em>Tot tu, mai conștient.</em></h2><p>Fără reguli imposibile. Fără judecată. Doar spațiu să descoperi ce ți se potrivește, câte o alegere pe rând.</p><button class="button primary" data-journey>Alege primul tău pas ${arrow}</button></div>
      <div class="steps"><article><span>01</span><div><h3>Urmează-ți curiozitatea</h3><p>Alege un gust și descoperă ce se află dincolo de ambalaj.</p></div><i aria-hidden="true">↗</i></article><article><span>02</span><div><h3>Privește eticheta altfel</h3><p>Compară aceeași porție. Mai puțin zahăr nu înseamnă automat mai puține calorii.</p></div><i aria-hidden="true">↗</i></article><article><span>03</span><div><h3>Găsește-ți propriul ritm</h3><p>O gustare e doar o parte dintr-o alimentație variată și echilibrată.</p></div><i aria-hidden="true">↗</i></article></div>
    </section>
    <section class="closing"><span class="closing-star" aria-hidden="true">✳</span><div class="eyebrow">MAI MULT GUST. MAI MULTĂ CURIOZITATE.</div><h2>Viitorul începe cu<br><em>o alegere mică.</em></h2><a href="#produse" class="button light">Găsește-ți preferatul ${arrow}</a><span class="closing-coordinate">SLY UNIVERSE / RO — 01</span></section>
  </main>
  <footer><a class="logo" href="#" aria-label="SLY Nutrition, acasă">sly<span>NUTRITION</span><i></i></a><p>Un mic pas. Un alt fel de dulce.</p><a href="https://slynutrition.eu/" target="_blank" rel="noopener noreferrer">Site-ul oficial SLY ${arrow}</a><span>© ${new Date().getFullYear()} · Concept interactiv independent</span></footer>
  <dialog id="product-dialog" aria-labelledby="detail-title">
    <button class="close-button" aria-label="Închide detaliile produsului">✕</button>
    <div id="product-detail"></div>
  </dialog>
  <dialog id="journey-dialog" aria-labelledby="journey-title">
    <button class="close-button" aria-label="Închide experiența">✕</button>
    <div class="journey-content"><div class="eyebrow">PRIMUL PAS E AL TĂU</div><div class="journey-orbit" aria-hidden="true"><div class="explorer-avatar"><i></i><span></span></div></div><h2 id="journey-title">Cu ce vrei <em>să începi?</em></h2><p>Fără cântar, fără etichete. Alege ce te face curios.</p>
      <div class="goal-options"><button data-goal="zahăr">Să înțeleg zahărul din gustări <span>↗</span></button><button data-goal="porții">Să compar porțiile și caloriile <span>↗</span></button><button data-goal="gust">Să descopăr un gust nou <span>↗</span></button></div>
      <p class="journey-privacy">Alegerea rămâne doar în memoria paginii și se resetează la reîncărcare.</p>
    </div>
  </dialog>
  <div class="toast" role="status" aria-live="polite"></div>
`

const productDialog = document.querySelector<HTMLDialogElement>('#product-dialog')!
const journeyDialog = document.querySelector<HTMLDialogElement>('#journey-dialog')!
let goal = ''
let toastTimeout: ReturnType<typeof setTimeout>
const format = (value: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 1 }).format(value)

function showDialog(dialog: HTMLDialogElement) {
  dialog.showModal()
  document.body.classList.add('modal-open')
}

for (const dialog of [productDialog, journeyDialog]) {
  dialog.querySelector('.close-button')!.addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => document.body.classList.remove('modal-open'))
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const rect = dialog.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close()
  })
}

function openProduct(product: Product) {
  document.querySelector('#product-detail')!.innerHTML = `
    <div class="detail-top ${product.color}"><div class="detail-art">${pack(product)}</div><div><div class="eyebrow">SLY / COLECȚIA DE NAPOLITANE</div><h2 id="detail-title">Un moment<br>cu <em>${product.name.toLowerCase()}.</em></h2><p>${product.description}</p><span class="detail-chip">Concept de prezentare · porție de 20 g</span></div></div>
    <div class="comparison"><div class="eyebrow">LABORATORUL ALEGERILOR TALE</div><h3>Ce se schimbă în porția ta?</h3><p class="demo-notice"><strong>Simulare, nu valori nutriționale verificate.</strong> Cifrele de mai jos sunt exemple editabile, nu date ale produsului SLY sau promisiuni de economisire. Introdu valorile de pe cele două etichete pentru o comparație reală.</p>
    ${goal ? `<p class="goal-note">Pasul tău: ${goal === 'zahăr' ? 'înțelegerea zahărului din gustări' : goal === 'porții' ? 'compararea porțiilor și caloriilor' : 'descoperirea unui gust nou'}.</p>` : ''}
    <div class="portion-control"><label for="portion">Aceeași porție pentru ambele produse</label><output for="portion" id="portion-value">20 g</output><input id="portion" type="range" min="10" max="100" step="5" value="20"></div>
    <div class="nutrition-inputs"><fieldset><legend>Gustarea de comparat <span>/ 100 g</span></legend><label>Calorii (kcal)<input id="regular-calories" type="number" min="0" max="1000" step="0.1" value="500" inputmode="decimal"></label><label>Zaharuri (g)<input id="regular-sugar" type="number" min="0" max="100" step="0.1" value="30" inputmode="decimal"></label></fieldset><fieldset><legend>Alternativa aleasă <span>/ 100 g</span></legend><label>Calorii (kcal)<input id="sly-calories" type="number" min="0" max="1000" step="0.1" value="460" inputmode="decimal"></label><label>Zaharuri (g)<input id="sly-sugar" type="number" min="0" max="100" step="0.1" value="8" inputmode="decimal"></label></fieldset></div>
    <p id="input-error" class="input-error" role="alert" hidden>Completează toate valorile: 0–1.000 kcal și 0–100 g zaharuri, cu cel mult o zecimală.</p>
    <div class="comparison-results" aria-live="polite" aria-atomic="true"><div><span id="calorie-label">Mai puține calorii</span><strong id="calorie-result"></strong><small id="calorie-detail"></small></div><div><span id="sugar-label">Mai puține zaharuri</span><strong id="sugar-result"></strong><small id="sugar-detail"></small></div></div>
    <details><summary>Ce merită să știi înainte să alegi <span>+</span></summary><p>„Fără zaharuri adăugate” nu înseamnă neapărat „fără zahăr” sau un produs cu mai puține calorii. Verifică întotdeauna eticheta actuală, ingredientele și alergenii. Produsele cu polioli pot avea efect laxativ dacă sunt consumate în exces.</p><p>Gama de napolitane SLY include cacao, vanilie și alune. Acest prototip nu confirmă formula, disponibilitatea sau beneficiile de sănătate ale fiecărui produs.</p><a href="https://slynutrition.eu/" target="_blank" rel="noopener noreferrer">Verifică informațiile la SLY Nutrition ↗</a></details>
    <button class="button primary continue-button">Continuă explorarea ${arrow}</button></div>`
  document.querySelector('.continue-button')!.addEventListener('click', () => productDialog.close())
  document.querySelectorAll<HTMLInputElement>('#product-detail input').forEach(input => input.addEventListener('input', updateComparison))
  updateComparison()
  showDialog(productDialog)
}

function updateComparison() {
  const input = (id: string) => document.querySelector<HTMLInputElement>(`#${id}`)!
  const portion = input('portion').valueAsNumber
  document.querySelector('#portion-value')!.textContent = `${portion} g`
  const valid = ['regular-calories', 'regular-sugar', 'sly-calories', 'sly-sugar'].every(id => input(id).value !== '' && input(id).checkValidity())
  document.querySelector<HTMLElement>('#input-error')!.hidden = valid
  document.querySelector<HTMLElement>('.comparison-results')!.hidden = !valid
  if (!valid) return
  for (const [key, field, unit, noun] of [['calorie', 'calories', 'kcal', 'calorii'], ['sugar', 'sugar', 'g', 'zaharuri']] as const) {
    const before = input(`regular-${field}`).valueAsNumber * portion / 100
    const after = input(`sly-${field}`).valueAsNumber * portion / 100
    const difference = before - after
    document.querySelector(`#${key}-label`)!.textContent = Math.abs(difference) < 0.0001 ? `${noun === 'calorii' ? 'Calorii' : 'Zaharuri'}: fără diferență` : `${difference > 0 ? 'Mai puține' : 'Mai multe'} ${noun}`
    document.querySelector(`#${key}-result`)!.textContent = `${format(Math.abs(difference))} ${unit}`
    document.querySelector(`#${key}-detail`)!.textContent = `${format(before)} → ${format(after)} ${unit} / ${portion} g`
  }
}

document.querySelectorAll<HTMLButtonElement>('[data-product]').forEach(button => {
  button.addEventListener('click', () => {
    const product = products.find(p => p.id === button.dataset.product)
    if (product) openProduct(product)
  })
})

document.querySelectorAll('[data-journey]').forEach(button => button.addEventListener('click', () => showDialog(journeyDialog)))
document.querySelectorAll<HTMLButtonElement>('[data-goal]').forEach(button => button.addEventListener('click', () => {
  goal = button.dataset.goal!
  journeyDialog.close()
  document.querySelector('#produse')!.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  document.querySelector<HTMLButtonElement>('.product-card')!.focus({ preventScroll: true })
  const toast = document.querySelector<HTMLElement>('.toast')!
  toast.textContent = 'Primul pas e făcut. Alege o napolitană și explorează în ritmul tău.'
  toast.classList.add('visible')
  clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 5000)
}))
