import { activities, estimateAdult, format, moderateReference, type AdultProfile, type Estimate, type Reference } from './nutrition'

export type OnboardingBody = AdultProfile & { activity: number }
export function mountOnboarding(root: HTMLElement, unlock: (reference: Reference, body?: OnboardingBody) => void, options?: { savedBody?: () => OnboardingBody | undefined; educationOnly?: () => boolean }) {
  let mode: 'fictional' | 'own' = 'fictional'
  let profile: AdultProfile | undefined
  let estimate: Estimate | undefined
  let activity = 1.2
  let stage = 1
  let educational = false
  let reason = ''

  function clear() {
    root.querySelectorAll<HTMLInputElement>('input').forEach(field => field.value = '')
    root.querySelectorAll<HTMLSelectElement>('select').forEach(field => field.selectedIndex = 0)
    profile = undefined
    estimate = undefined
    activity = 1.2
    educational = false
    reason = ''
  }
  function focusTitle() { root.querySelector<HTMLElement>('h2')?.focus() }
  function frame(content: string) {
    root.innerHTML = `<div class="level-heading"><span class="eyebrow">NIVELUL 1 / ÎNAINTE DE RAFT</span><span>Pasul ${stage} din 3</span></div>
      <ol class="steps" aria-label="Progres">${['Profil', 'Energie & activitate', 'Intenție'].map((label, i) => `<li ${stage === i + 1 ? 'aria-current="step"' : ''}>${i + 1}. ${label}</li>`).join('')}</ol>${content}
      <p class="privacy-note">Măsurătorile rămân în memoria paginii, dacă nu alegi explicit salvarea în cont din Profil. Salvarea datelor corporale este opțională și separată de liste, avatar și progres. Poți explora fără măsurători. Lista tipărită sau TXT nu include profilul ori estimările personale.</p>`
    focusTitle()
  }
  function education(message: string) {
    clear()
    educational = true
    reason = message
    stage = 2
    showEnergy()
  }
  function showProfile() {
    if (options?.educationOnly?.()) {
      education('Demonstrație educațională fără cont, măsurători sau estimări personale. Nicio informație nu se salvează în cloud.')
      return
    }
    stage = 1
    frame(`<h2 tabindex="-1">Începe cu <em>un exemplu.</em></h2>
      <p class="lead">Înțelege energia de repaus, apoi pregătește cumpărăturile pentru o săptămână. Poți sări peste estimări. Nu este o dietă și nu este un calculator medical.</p>
      <div class="choice-row" role="group" aria-label="Tipul profilului">
        <button type="button" data-mode="fictional" aria-pressed="${mode === 'fictional'}">Profil fictiv adult <small>Recomandat pentru explorare</small></button>
        <button type="button" data-mode="own" aria-pressed="${mode === 'own'}">Date proprii <small>Opțional · doar pentru adulți</small></button>
      </div>
      <form id="profile-form" novalidate autocomplete="off">
        ${mode === 'own' ? `<label for="eligibility">Alege contextul, fără detalii medicale
          <select id="eligibility" required><option value="">Selectează o opțiune</option><option value="eligible">Adult, fără sarcină/alăptare sau context medical care afectează nutriția</option><option value="education">Sub 18 ani, sarcină/alăptare, context medical sau prefer doar educație</option></select></label>
          <p class="hint">În contexte medicale (inclusiv dificultăți legate de alimentație), sarcină sau alăptare, continuăm fără estimări personale. Nu cerem diagnostice.</p>` : '<p class="notice">Personaj fictiv: 30 ani, 170 cm, 70 kg. Acestea nu sunt datele tale și nu reprezintă un model corporal de urmat.</p>'}
        <div class="profile-fields" ${mode === 'own' ? 'hidden' : ''}>
          <div class="field-grid">
            <label for="age">Vârstă (ani)<input id="age" type="number" min="18" max="100" step="1" required value="${mode === 'fictional' ? '30' : ''}" inputmode="numeric" aria-describedby="profile-error"></label>
            <label for="height">Înălțime (cm)<input id="height" type="number" min="120" max="230" step="0.1" required value="${mode === 'fictional' ? '170' : ''}" inputmode="decimal" aria-describedby="profile-error"></label>
            <label for="weight">Greutate (kg)<input id="weight" type="number" min="35" max="300" step="0.1" required value="${mode === 'fictional' ? '70' : ''}" inputmode="decimal" aria-describedby="profile-error"></label>
          </div>
          <label for="coefficient">Coeficientul fiziologic al ecuației
            <select id="coefficient" required aria-describedby="coefficient-help profile-error"><option value="">Selectează sau continuă educațional</option><option value="5" ${mode === 'fictional' ? 'selected' : ''}>+5 · varianta masculină a ecuației</option><option value="-161">−161 · varianta feminină a ecuației</option><option value="education">Prefer să nu răspund / doar educație</option></select>
          </label>
          <p class="hint" id="coefficient-help">Mifflin–St Jeor folosește două constante legate de sexul fiziologic în populația studiată, nu de identitatea de gen. Nu surprinde toate particularitățile individuale. Dacă nu știi ce variantă este relevantă, alege educație.</p>
        </div>
        <p id="profile-error" class="input-error" role="alert" hidden></p>
        <div class="actions"><button class="button primary" type="submit">Continuă la energie →</button><button class="text-button" type="button" id="skip-profile">Fără date · doar educație</button></div>
      </form>`)
    const saved = mode === 'own' ? options?.savedBody?.() : undefined
    if (saved && estimateAdult(saved, saved.activity)) {
      for (const key of ['age', 'height', 'weight', 'coefficient'] as const) root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${key}`)!.value = String(saved[key])
      activity = saved.activity
    }
    root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.addEventListener('click', () => {
      clear()
      mode = button.dataset.mode as typeof mode
      showProfile()
    }))
    const form = root.querySelector<HTMLFormElement>('form')!
    root.querySelector<HTMLSelectElement>('#eligibility')?.addEventListener('change', event => {
      const value = (event.target as HTMLSelectElement).value
      if (value === 'education') {
        education('Pentru minori, sarcină/alăptare, contexte medicale sau la alegerea ta, nu calculăm energie ori deficit personalizat.')
        return
      }
      root.querySelector<HTMLElement>('.profile-fields')!.hidden = value !== 'eligible'
      if (value !== 'eligible') {
        form.querySelectorAll<HTMLInputElement>('input').forEach(field => field.value = '')
        form.querySelector<HTMLSelectElement>('#coefficient')!.value = ''
      }
    })
    root.querySelector('#skip-profile')!.addEventListener('click', () => education('Ai ales explorarea fără date personale. Nu este nevoie de o estimare pentru a pregăti lista de cumpărături.'))
    root.querySelector<HTMLSelectElement>('#coefficient')!.addEventListener('change', event => {
      if ((event.target as HTMLSelectElement).value === 'education') education('Continuăm fără coeficient și fără estimări personale.')
    })
    form.addEventListener('submit', event => {
      event.preventDefault()
      const error = root.querySelector<HTMLElement>('#profile-error')!
      function fail(message: string, field: HTMLElement) {
        error.textContent = message
        error.hidden = false
        field.setAttribute('aria-invalid', 'true')
        field.focus()
      }
      const eligibility = root.querySelector<HTMLSelectElement>('#eligibility')
      if (mode === 'own' && eligibility?.value !== 'eligible') {
        fail('Selectează contextul sau continuă fără date.', eligibility!)
        return
      }
      const fields = ['age', 'height', 'weight'].map(id => root.querySelector<HTMLInputElement>(`#${id}`)!)
      const [age, height, weight] = fields.map(field => field.valueAsNumber) as [number, number, number]
      if (mode === 'own' && Number.isFinite(age) && age > 0 && age < 18) {
        education('Ecuația pentru adulți nu se aplică minorilor. Datele introduse au fost șterse; continuăm fără estimări personale.')
        return
      }
      for (const field of fields) {
        field.removeAttribute('aria-invalid')
        if (!field.checkValidity() || !Number.isFinite(field.valueAsNumber)) {
          fail('Folosește: vârstă 18–100 ani întregi, înălțime 120–230 cm, greutate 35–300 kg (maximum o zecimală). Limite tehnice, nu intervale „ideale”.', field)
          return
        }
      }
      const coefficient = root.querySelector<HTMLSelectElement>('#coefficient')!
      if (!['5', '-161'].includes(coefficient.value)) {
        fail('Alege un coeficient sau continuă fără date.', coefficient)
        return
      }
      const candidate = { age, height, weight, coefficient: Number(coefficient.value) as 5 | -161 }
      const result = estimateAdult(candidate, activity)
      if (!result) { fail('Verifică valorile introduse.', fields[0]!); return }
      if (!result.deficitEligible) {
        education('În acest prototip, vârsta peste 65 de ani sau IMC sub 18,5 duc la explorare educațională fără estimări personale. IMC este un indicator limitat, nu un diagnostic. Un dietetician poate evalua situația individuală.')
        return
      }
      profile = candidate
      estimate = result
      stage = 2
      showEnergy()
    })
  }
  function showEnergy() {
    frame(`<h2 tabindex="-1">${educational ? 'Energia, <em>fără cifre personale.</em>' : 'Energia de repaus, <em>un punct de pornire.</em>'}</h2>
      ${educational ? `<p class="notice">${reason}</p><div class="education-grid"><article><span class="eyebrow">BMR / REPAUS</span><h3>Funcțiile de bază</h3><p>Respirația, circulația și alte funcții ale corpului consumă energie chiar și în repaus.</p></article><article><span class="eyebrow">TDEE / ZIUA ÎNTREAGĂ</span><h3>Mai mult decât repaus</h3><p>Activitatea și digestia contribuie la consumul zilnic. Necesarul individual nu se poate deduce exact dintr-o formulă.</p></article></div>` : `
      <span class="demo-pill">${mode === 'fictional' ? 'EXEMPLU FICTIV ADULT' : 'ESTIMARE PERSONALĂ · NU RECOMANDARE'}</span>
      <div class="energy-card"><span>BMR estimat · aproximare a energiei de repaus</span><strong>${format(estimate!.bmr)} <small>kcal/zi</small></strong><p>Nu este o măsurare a metabolismului bazal și nici o țintă alimentară.</p></div>
      <details class="formula"><summary>Cum am calculat? Formula și limitele</summary><p>Mifflin–St Jeor: 10 × kg + 6,25 × cm − 5 × ani + coeficient (+5 sau −161).</p><p>${10} × ${format(profile!.weight)} + 6,25 × ${format(profile!.height)} − 5 × ${profile!.age} ${profile!.coefficient === 5 ? '+ 5' : '− 161'} = ${format(estimate!.bmr)} kcal/zi.</p><p>Ecuația estimează consumul energetic de repaus (REE/RMR), numit simplificat BMR aici. Nu îl măsoară și poate diferi de nevoile reale.</p><p>Referință: Mifflin et al. (1990), „A new predictive equation for resting energy expenditure in healthy individuals”. DOI: 10.1093/ajcn/51.2.241 · PubMed: 2305711.</p></details>
      <label for="activity">Cum arată activitatea zilnică ${mode === 'fictional' ? 'a personajului' : 'pentru tine'}?<select id="activity">${activities.map(item => `<option value="${item.value}" ${activity === item.value ? 'selected' : ''}>× ${item.value} · ${item.label}</option>`).join('')}</select></label>
      <p class="hint">Multiplicatorii sunt convenții ilustrative, nu măsurători sau predicții individuale validate. Categoriile se suprapun; activitatea, digestia și particularitățile corpului variază.</p>
      <div class="tdee-result" aria-live="polite"><span>TDEE ≈ BMR × activitate</span><strong id="tdee">${format(estimate!.tdee)} kcal/zi</strong><p>Consum zilnic aproximativ, nu aport prescris.</p></div>`}
      <p class="notice">BMR nu este un prag care garantează siguranța unei diete. Filtrele acestui prototip sunt conservatoare, nu limite medicale universale. Pentru adecvare individuală, cere ajutorul unui dietetician sau medic; acest joc nu tratează afecțiuni.</p>
      <div class="actions"><button class="button primary" id="to-goal">Continuă la intenție →</button><button class="text-button" id="back-profile">← Schimbă profilul (șterge datele)</button>${!educational ? '<button class="text-button" id="energy-education">Continuă fără estimări</button>' : ''}</div>`)
    root.querySelector('#back-profile')!.addEventListener('click', reset)
    root.querySelector('#energy-education')?.addEventListener('click', () => education('Estimările și datele au fost șterse. Continuăm doar educațional.'))
    root.querySelector<HTMLSelectElement>('#activity')?.addEventListener('change', event => {
      activity = Number((event.target as HTMLSelectElement).value)
      estimate = estimateAdult(profile!, activity)
      root.querySelector('#tdee')!.textContent = estimate ? `${format(estimate.tdee)} kcal/zi` : 'Alege o activitate validă.'
    })
    root.querySelector('#to-goal')!.addEventListener('click', () => {
      if (!educational && !estimate) return
      stage = 3
      showGoal()
    })
  }
  function showGoal() {
    frame(`<h2 tabindex="-1">Cu ce intenție <em>explorăm?</em></h2><p class="lead">Nicio alegere nu aduce puncte. Nu premiem mâncatul mai puțin. Reperul zilnic este doar educațional: nu devine o țintă pentru cumpărăturile săptămânale.</p>
      <form id="goal-form">
        <fieldset class="goal-options"><legend>Alege o direcție</legend>
          <label><input type="radio" name="goal" value="explore" checked> <span><strong>Explorare liberă</strong><small>Listă de cumpărături și varietate, fără reper energetic.</small></span></label>
          <label><input type="radio" name="goal" value="maintenance"> <span><strong>Menținere</strong><small>${educational ? 'Discutăm echilibrul energetic, fără țintă personală.' : 'TDEE ca reper aproximativ, nu obiectiv de atins exact.'}</small></span></label>
          ${!educational && estimate?.deficitEligible ? '<label><input type="radio" name="goal" value="moderate"> <span><strong>Deficit moderat · simulare</strong><small>Un exemplu aritmetic opțional, nu o recomandare de slăbire.</small></span></label>' : ''}
        </fieldset>
        ${!educational && estimate?.deficitEligible ? '<div id="deficit-options" hidden><label for="deficit">Reducere ilustrativă din TDEE<select id="deficit"><option value="5">5%</option><option value="10" selected>10%</option><option value="15">15%</option></select></label><p class="hint">Procente prestabilite pentru demonstrație, fără garanție de siguranță. Filtrul conservator al prototipului nu stabilește o dietă personalizată. Nu există recompense pentru o reducere mai mare.</p></div>' : ''}
        <p id="goal-reference" class="notice" aria-live="polite">Fără reper numeric. Energia nu este un scor.</p>
        <p id="goal-error" class="input-error" role="alert" hidden></p>
        <div class="actions"><button class="button primary" type="submit" id="confirm-goal">Confirmă și intră în magazin →</button><button class="text-button" type="button" id="back-energy">← Înapoi la energie</button></div>
      </form>`)
    const form = root.querySelector<HTMLFormElement>('form')!
    function selection(): Reference | undefined {
      const goal = form.querySelector<HTMLInputElement>('input[name="goal"]:checked')!.value as Reference['goal']
      const base: Reference = { mode: educational ? 'educational' : mode, goal }
      if (educational || goal === 'explore') return base
      if (!estimate) return
      const energy = goal === 'maintenance' ? estimate.tdee : moderateReference(estimate, Number(form.querySelector<HTMLSelectElement>('#deficit')!.value))
      if (energy === undefined) return
      return { ...base, energy, bmr: estimate.bmr, tdee: estimate.tdee }
    }
    function update() {
      const goal = form.querySelector<HTMLInputElement>('input[name="goal"]:checked')!.value
      const options = root.querySelector<HTMLElement>('#deficit-options')
      if (options) options.hidden = goal !== 'moderate'
      const reference = selection()
      root.querySelector('#goal-reference')!.textContent = reference?.energy !== undefined
        ? `${mode === 'fictional' ? 'Exemplu fictiv' : 'Reper orientativ'}: ${format(reference.energy)} kcal/zi. Nu este aport prescris sau țintă pentru lista săptămânală și nu trebuie „completat” cu produse.`
        : educational && goal === 'maintenance' ? 'Menținerea descrie echilibrul dintre aport și consum în timp, nu o cifră fixă. Fără calcul personalizat.' : 'Fără reper numeric. Energia nu este un scor.'
      const error = root.querySelector<HTMLElement>('#goal-error')!
      error.hidden = Boolean(reference)
      error.textContent = 'Acest calcul ar coborî sub BMR și nu este disponibil. Alege altă opțiune. Nici un rezultat peste BMR nu garantează siguranța.'
      root.querySelector<HTMLButtonElement>('#confirm-goal')!.disabled = !reference
    }
    form.addEventListener('change', update)
    root.querySelector('#back-energy')!.addEventListener('click', () => { stage = 2; showEnergy() })
    form.addEventListener('submit', event => {
      event.preventDefault()
      const reference = selection()
      if (!reference) { update(); return }
      const body = !educational && mode === 'own' && profile ? { ...profile, activity } : undefined
      clear()
      root.replaceChildren()
      root.hidden = true
      unlock(reference, body)
    })
    update()
  }
  function reset() {
    clear()
    mode = 'fictional'
    root.hidden = false
    showProfile()
  }
  showProfile()
  return reset
}
