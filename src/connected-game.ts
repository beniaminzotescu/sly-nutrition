import { cloud, watchSession, getRole, getProfile, saveProfile, listPublishedCatalog, signedProductImage, listSavedLists, saveList, deleteList, isRecoverySession, signOut } from './cloud'
import { mountAuth } from './auth-ui'
import { mountAdmin } from './admin'
import type { CloudCatalog, ProfileRow } from './cloud-types'
import type { Department, Product } from './catalog'
import type { OnboardingBody } from './onboarding'
import type { ShoppingEntry } from './shopping-list'
import { validateShoppingEntries } from './snapshot-validation'
import { estimateAdult } from './nutrition'
import { shelfCoordinates } from './catalog-layout'

export type ConnectedBridge = {
  reset: () => void
  allow: () => void
  catalog: (departments: Department[], products: Product[]) => void
  readCart: () => ShoppingEntry[]
  loadCart: (entries: ShoppingEntry[]) => void
  body: () => OnboardingBody | undefined
  clearBody: () => void
  savedBody: (body: OnboardingBody | undefined) => void
  readProgress: () => { completed: string[]; color: string }
  restoreProgress: (completed: string[], color: string) => void
  utility: HTMLElement
  utilityDialog: HTMLDialogElement
  entry: HTMLElement
  entryDialog: HTMLDialogElement
  educationalDemo: () => void
}
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const message = (error: unknown) => error instanceof Error ? error.message : 'Conexiunea nu a confirmat operațiunea. Reîncearcă.'
const colors = ['clay', 'leaf', 'milk', 'grain']
const missions = ['inspect', 'compare', 'review']
function validBody(profile: ProfileRow | null): OnboardingBody | undefined {
  const body = profile?.body_profile
  return body && profile?.body_consent_at && estimateAdult(body, body.activity)?.deficitEligible ? { ...body } : undefined
}
function approvedImage(value: string) {
  const url = new URL(value), base = new URL(import.meta.env.VITE_SUPABASE_URL)
  if (url.origin !== base.origin || !url.pathname.startsWith('/storage/v1/object/sign/product-images/') || url.username || url.password || url.hash) throw Error('Imagine dintr-o sursă neaprobată.')
  return url.href
}
export function mountConnectedGame(bridge: ConnectedBridge) {
  bridge.entry.innerHTML = '<h2>Conectare…</h2><p>Se verifică sesiunea. Magazinul rămâne blocat până la confirmarea contului și profilului.</p>'
  let generation = 0, utilityGeneration = 0
  let userId: string | undefined
  let admin = false, admitted = false
  let catalog: CloudCatalog = { stores: [], shelves: [], products: [] }
  let selectedStore = ''
  let cleanupAuth: (() => void) | undefined
  let cleanupUtility: (() => void) | undefined
  let profile: ProfileRow | null = null
  let profileHydrated = false
  let progressQueue = Promise.resolve()
  const adminButton = document.querySelector<HTMLButtonElement>('#admin-open')!
  function status(text: string) {
    const node = bridge.utility.querySelector<HTMLElement>('[data-cloud-status]')
    if (node) node.textContent = text
  }
  function cleanup() {
    cleanupAuth?.(); cleanupAuth = undefined
    cleanupUtility?.(); cleanupUtility = undefined
    utilityGeneration++
  }
  bridge.utilityDialog.addEventListener('close', () => {
    if (bridge.utilityDialog.open) return
    cleanupUtility?.(); cleanupUtility = undefined
    utilityGeneration++
  })
  async function reloadCatalog() {
    const version = generation
    const statusNode = document.querySelector<HTMLElement>('#catalog-status')!
    statusNode.textContent = 'Se încarcă magazinele publicate…'
    try {
      const next = await listPublishedCatalog()
      if (version !== generation || !admitted) return
      catalog = next
      if (!catalog.stores.some(store => store.id === selectedStore)) selectedStore = catalog.stores[0]?.id ?? ''
      await renderStore(version)
      if (version === generation) statusNode.textContent = catalog.stores.length ? 'Catalog publicat · disponibilitatea fizică se verifică în magazin.' : 'Nu există magazine publicate. Nu afișăm date demo în locul catalogului conectat.'
    } catch (error) {
      if (version !== generation) return
      bridge.catalog([], [])
      statusNode.textContent = `Catalog indisponibil: ${message(error)} Nu folosim un catalog demo ca substitut.`
      const retry = document.createElement('button')
      retry.className = 'button'; retry.textContent = 'Reîncearcă'
      retry.addEventListener('click', () => { void reloadCatalog() })
      statusNode.append(retry)
    }
  }
  let storeGeneration = 0
  async function renderStore(version: number) {
    const request = ++storeGeneration
    const selector = document.querySelector<HTMLElement>('#store-selector')!
    selector.innerHTML = `<label>Magazin<select id="choose-store">${catalog.stores.map(store => `<option value="${escape(store.id)}" ${selectedStore === store.id ? 'selected' : ''}>${escape(store.name)}</option>`).join('')}</select></label>`
    selector.querySelector('select')!.addEventListener('change', event => {
      selectedStore = (event.target as HTMLSelectElement).value
      void renderStore(generation).catch(error => {
        if (version !== generation) return
        bridge.catalog([], [])
        document.querySelector('#catalog-status')!.textContent = message(error)
      })
    })
    const store = catalog.stores.find(item => item.id === selectedStore)
    const shelves = catalog.shelves.filter(item => item.store_id === selectedStore).sort((a, b) => a.slot - b.slot)
    const occupied = new Set<number>()
    for (const shelf of shelves) {
      if (!Number.isInteger(shelf.slot) || shelf.slot < 0 || shelf.slot > 8 || occupied.has(shelf.slot)) throw Error('Configurație de rafturi invalidă sau poziții suprapuse.')
      occupied.add(shelf.slot)
    }
    const departments: Department[] = shelves.map(shelf => ({ id: shelf.id, name: shelf.name, number: String(shelf.slot + 1).padStart(2, '0'), ...shelfCoordinates(shelf.slot), color: ['grain', 'leaf', 'clay'][shelf.slot % 3]! }))
    const products: Product[] = await Promise.all(catalog.products.filter(product => shelves.some(shelf => shelf.id === product.shelf_id)).map(async product => {
      const shelf = shelves.find(item => item.id === product.shelf_id)!
      let imageUrl: string | undefined
      if (product.image_path) {
        try { imageUrl = approvedImage(await signedProductImage(product.image_path)) } catch { /* The placeholder is honest when an approved image cannot be loaded. */ }
      }
      return {
        id: product.id, department: product.shelf_id, departmentName: `${store?.name ?? 'Magazin'} / ${shelf.name}`,
        name: product.name, group: product.group_name, color: ['grain', 'leaf', 'clay', 'milk'].includes(product.color) ? product.color : 'grain',
        shape: product.shape, portion: product.portion, packageAmount: product.package_amount, packageUnit: product.package_unit,
        unitsPerPack: product.units_per_pack, nutrition: { ...product.nutrition }, imageUrl,
        ...(product.image_path ? { imagePath: product.image_path } : {}),
        ingredients: product.ingredients, allergens: product.allergens,
        readiness: product.label_verified ? 'approved' as const : 'requested' as const,
        provenance: { status: product.label_verified ? 'verified-label' as const : 'pending-label' as const, source: product.source },
      } as Product
    }))
    if (version !== generation || request !== storeGeneration || !admitted) return
    bridge.catalog(departments, products)
    document.querySelector('#connection-label')!.textContent = `CONECTAT · ${store?.name ?? 'niciun magazin publicat'}`
  }
  async function hydrateProfile(version: number) {
    try {
      const loaded = await getProfile()
      if (version !== generation || !admitted) return false
      profile = loaded
      profileHydrated = true
      const remoteCompleted = loaded?.progress?.completed?.filter(item => missions.includes(item)) ?? []
      const completed = [...new Set([...remoteCompleted, ...bridge.readProgress().completed.filter(item => missions.includes(item))])]
      const color = colors.includes(loaded?.avatar_color ?? '') ? loaded!.avatar_color : 'clay'
      bridge.restoreProgress(completed, color)
      bridge.savedBody(validBody(loaded))
      return true
    } catch {
      if (version === generation) profileHydrated = false
      return false
    }
  }
  async function admit() {
    const version = generation
    admitted = true
    bridge.entry.innerHTML = '<h2>Pregătim profilul…</h2><p>Încărcăm numai datele salvate în cont. Măsurătorile rămân opționale.</p>'
    void reloadCatalog()
    try {
      const [loaded, role] = await Promise.all([hydrateProfile(version), getRole().catch(() => null)])
      if (version !== generation || !admitted) return
      admin = role === 'admin'
      adminButton.hidden = !admin
      if (!loaded) document.querySelector('#connection-label')!.textContent = 'Profil indisponibil · progresul cloud este protejat; reîncearcă din Profil'
    } catch {
      if (version === generation) {
        adminButton.hidden = true
        document.querySelector('#connection-label')!.textContent = 'CONECTAT · profil indisponibil'
      }
    } finally {
      if (version === generation && admitted) {
        bridge.entryDialog.close()
        bridge.allow()
      }
    }
  }
  function gate(hasSession: boolean) {
    cleanupAuth?.()
    bridge.entry.innerHTML = `<span class="eyebrow">ATELIER / CONT REAL</span><h2>${hasSession ? 'Bine ai revenit.' : 'Intră în atelier.'}</h2><p>Conturile personale sunt pentru adulți. Poți învăța despre etichete fără date corporale.</p><label><input type="checkbox" id="adult-confirm">Confirm că am cel puțin 18 ani</label><button class="button primary" id="adult-continue" disabled>${hasSession ? 'Continuă la profil' : 'Continuă la autentificare'}</button><p class="hint">Nu solicităm data nașterii. Autentificarea nu autorizează automat estimări personale.</p><div id="auth-mount"></div>`
    const check = bridge.entry.querySelector<HTMLInputElement>('#adult-confirm')!
    const button = bridge.entry.querySelector<HTMLButtonElement>('#adult-continue')!
    check.addEventListener('change', () => { button.disabled = !check.checked })
    button.addEventListener('click', () => {
      if (!check.checked) return
      if (hasSession && !isRecoverySession()) void admit()
      else {
        button.hidden = true
        check.disabled = true
        cleanupAuth = mountAuth(bridge.entry.querySelector<HTMLElement>('#auth-mount')!)
        if (hasSession) {
          const continueButton = document.createElement('button')
          continueButton.className = 'button'
          continueButton.textContent = 'Continuă după schimbarea parolei'
          continueButton.addEventListener('click', () => {
            if (!isRecoverySession()) void admit()
          })
          bridge.entry.append(continueButton)
        }
      }
    })
    if (!hasSession) {
      const demoButton = document.createElement('button')
      demoButton.className = 'text-button'
      demoButton.textContent = 'Sub 18 ani / fără cont → demonstrație OFFLINE, numai educație'
      demoButton.addEventListener('click', () => {
        cleanupAuth?.(); cleanupAuth = undefined
        admitted = false
        bridge.educationalDemo()
      })
      bridge.entry.append(demoButton)
    } else {
      const logout = document.createElement('button')
      logout.className = 'text-button'
      logout.textContent = 'Deconectează acest cont'
      logout.addEventListener('click', () => { void signOut().catch(() => { logout.textContent = 'Deconectarea nu a fost confirmată. Reîncearcă.' }) })
      bridge.entry.append(logout)
    }
    if (!bridge.entryDialog.open) bridge.entryDialog.showModal()
  }
  function showUtility(kind: string) {
    if (!admitted || !userId) return
    cleanupUtility?.(); cleanupUtility = undefined
    utilityGeneration++
    if (kind === 'profile') showProfile()
    else void showSaved()
    if (!bridge.utilityDialog.open) bridge.utilityDialog.showModal()
  }
  function showProfile() {
    bridge.utility.innerHTML = `<div id="account-auth"></div><section class="notice"><h3>Măsurători opționale</h3><p>Estimările și IMC nu se salvează. Numai măsurătorile proprii confirmate în profil pot fi salvate, exclusiv cu acordul de mai jos.</p><label><input type="checkbox" id="body-consent">Sunt de acord să salvez măsurătorile mele în cont</label><button class="button" id="save-body" disabled>Salvează măsurătorile</button><p data-cloud-status role="status"></p></section><button class="button" id="redo-onboarding">Schimbă profilul educațional (golește lista locală)</button>`
    const root = bridge.utility.querySelector<HTMLElement>('#account-auth')!
    cleanupUtility = mountAuth(root)
    if (!profileHydrated) {
      const notice = document.createElement('p')
      notice.className = 'notice'
      notice.textContent = 'Profilul nu a putut fi încărcat. Descoperirile rămân în sesiune; nu suprascriem progresul sau culoarea din cont.'
      const retry = document.createElement('button')
      retry.className = 'button'
      retry.dataset.retryProfile = ''
      retry.textContent = 'Reîncearcă încărcarea profilului'
      retry.addEventListener('click', async () => {
        retry.disabled = true
        const version = generation, view = utilityGeneration
        const loaded = await hydrateProfile(version)
        if (version !== generation || view !== utilityGeneration) return
        if (loaded) {
          saveProgress()
          showUtility('profile')
        } else {
          retry.disabled = false
          notice.textContent = 'Profilul este încă indisponibil. Progresul din cont nu a fost modificat; poți reîncerca.'
        }
      })
      notice.append(retry)
      bridge.utility.prepend(notice)
    }
    let bodyGeneration = 0
    let bodySaving = false
    const checkbox = bridge.utility.querySelector<HTMLInputElement>('#body-consent')!
    const button = bridge.utility.querySelector<HTMLButtonElement>('#save-body')!
    const cleared = () => {
      bodyGeneration++
      profile = profile ? { ...profile, body_profile: null, body_consent_at: null } : null
      bridge.savedBody(undefined)
      bridge.clearBody()
      checkbox.checked = false
      button.disabled = true
      status('Datele corporale au fost șterse din cont și din sesiunea curentă.')
    }
    root.addEventListener('body-profile-cleared', cleared)
    root.addEventListener('click', event => {
      if ((event.target as Element).closest('[data-forget]')) {
        checkbox.disabled = true
        button.disabled = true
      }
    }, true)
    checkbox.addEventListener('change', () => { button.disabled = bodySaving || !checkbox.checked || !bridge.body() })
    if (!bridge.body()) status('Alege opțional Date proprii în profil înainte de salvare. Modul educațional nu salvează măsurători.')
    button.addEventListener('click', () => {
      const body = bridge.body(), version = generation, view = utilityGeneration, bodyVersion = bodyGeneration
      if (!body || !checkbox.checked || bodySaving) return
      bodySaving = true
      checkbox.disabled = true
      const forget = root.querySelector<HTMLButtonElement>('[data-forget]')
      if (forget) forget.disabled = true
      button.disabled = true
      status('Se salvează…')
      void saveProfile({ body_profile: body, body_consent_at: new Date().toISOString() }).then(saved => {
        if (version !== generation || view !== utilityGeneration || bodyVersion !== bodyGeneration) return
        profile = saved
        bridge.savedBody(validBody(saved))
        checkbox.checked = false
        status('Măsurătorile au fost salvate cu acordul tău. Le poți șterge oricând.')
      }).catch(error => { if (version === generation && view === utilityGeneration && bodyVersion === bodyGeneration) { status(message(error)); button.disabled = false } })
        .finally(() => {
          if (version !== generation || view !== utilityGeneration || bodyVersion !== bodyGeneration) return
          bodySaving = false
          checkbox.disabled = false
          if (forget?.isConnected) forget.disabled = false
        })
    })
    bridge.utility.querySelector('#redo-onboarding')!.addEventListener('click', () => {
      bridge.reset()
      bridge.allow()
      bridge.restoreProgress(profile?.progress.completed.filter(item => missions.includes(item)) ?? [], profile?.avatar_color ?? 'clay')
    })
  }
  async function showSaved() {
    const version = generation, view = ++utilityGeneration
    bridge.utility.innerHTML = '<h2>Liste reutilizabile</h2><p data-cloud-status role="status">Se încarcă listele…</p>'
    try {
      const lists = await listSavedLists()
      if (version !== generation || view !== utilityGeneration) return
      bridge.utility.innerHTML = `<h2>Liste reutilizabile</h2><p>Salvăm o copie a etichetelor și cantităților, nu un meniu. Actualizările catalogului nu schimbă listele deja salvate.</p><form id="save-list"><label>Numele listei<input name="name" maxlength="80" required placeholder="Cumpărăturile săptămânii"></label><button class="button primary" type="submit" ${bridge.readCart().length ? '' : 'disabled'}>Salvează lista curentă</button></form><p data-cloud-status role="status"></p><div id="saved-rows"></div>`
      const rows = bridge.utility.querySelector('#saved-rows')!
      let snapshotLoad = 0
      async function run(action: () => Promise<unknown>, done: string) {
        bridge.utility.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = true })
        status('Se procesează…')
        try {
          await action()
          if (version !== generation || view !== utilityGeneration) return
          await showSaved()
          if (version === generation && admitted) status(done)
        } catch (error) {
          if (version !== generation || view !== utilityGeneration) return
          status(message(error))
          bridge.utility.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = false })
        }
      }
      bridge.utility.querySelector('form')!.addEventListener('submit', event => {
        event.preventDefault()
        const name = bridge.utility.querySelector<HTMLInputElement>('[name=name]')!.value.trim()
        if (!name || name.length > 80 || !bridge.readCart().length) { status('Adaugă produse și un nume de maximum 80 caractere.'); return }
        void run(() => saveList(name, validateShoppingEntries(bridge.readCart())), 'Lista a fost salvată în cont.')
      })
      if (!lists.length) rows.textContent = 'Nu ai încă liste salvate.'
      for (const list of lists) {
        const article = document.createElement('article')
        article.className = 'notice'
        const title = document.createElement('h3')
        title.textContent = list.name
        article.append(title)
        function action(label: string, callback: () => void) {
          const button = document.createElement('button')
          button.className = 'button'; button.textContent = label
          button.addEventListener('click', callback); article.append(button)
        }
        action('Încarcă (înlocuiește căruciorul)', () => {
          const request = ++snapshotLoad
          status('Se încarcă lista și imaginile aprobate…')
          void (async () => {
            const entries = validateShoppingEntries(list.entries)
            await Promise.all(entries.map(async entry => {
              if (!entry.product.imagePath) return
              try {
                entry.product.imageUrl = approvedImage(await signedProductImage(entry.product.imagePath))
              } catch { /* Archived or unavailable images remain honest placeholders. */ }
            }))
            if (version !== generation || view !== utilityGeneration || request !== snapshotLoad || !admitted) return
            bridge.loadCart(entries)
            status('Snapshot încărcat. Poți anula înlocuirea din cărucior.')
          })().catch(error => { if (version === generation && view === utilityGeneration) status(message(error)) })
        })
        action('Duplică', () => { void run(() => saveList(`${list.name.slice(0, 70)} · copie`, validateShoppingEntries(list.entries)), 'Copia a fost salvată.') })
        action('Șterge', () => {
          const confirm = document.createElement('button')
          confirm.className = 'button'; confirm.textContent = 'Confirmă ștergerea definitivă a acestei liste'
          confirm.addEventListener('click', () => { void run(() => deleteList(list.id), 'Lista a fost ștearsă.') })
          article.append(confirm)
        })
        rows.append(article)
      }
    } catch (error) { if (version === generation && view === utilityGeneration) status(message(error)) }
  }
  adminButton.addEventListener('click', async () => {
    if (!admin || !admitted) return
    const version = generation
    try {
      const role = await getRole()
      if (version !== generation) return
      if (role !== 'admin') { admin = false; adminButton.hidden = true; return }
      cleanupUtility?.()
      bridge.utility.replaceChildren()
      cleanupUtility = mountAdmin(bridge.utility, () => { /* Reload after closing the editor, keeping existing list snapshots untouched. */ })
      bridge.utilityDialog.showModal()
      bridge.utilityDialog.addEventListener('close', () => { if (version === generation && admitted) void reloadCatalog() }, { once: true })
    } catch { adminButton.hidden = true }
  })
  function saveProgress() {
    if (!admitted) return
    if (!profileHydrated) {
      document.querySelector('#connection-label')!.textContent = 'Progres numai în sesiune · reîncarcă profilul înainte de salvare'
      return
    }
    const version = generation
    const progress = bridge.readProgress()
    progressQueue = progressQueue.catch(() => {}).then(async () => {
      if (version !== generation || !admitted || !profileHydrated) return
      try {
        const saved = await saveProfile({ avatar_color: progress.color, progress: { level: progress.completed.length + 1, completed: progress.completed } })
        if (version === generation) profile = saved
      } catch {
        if (version === generation) document.querySelector('#connection-label')!.textContent = 'Progres păstrat în sesiune · salvarea cloud nu a fost confirmată'
      }
    })
  }
  if (cloud.configurationError) {
    bridge.entry.innerHTML = `<h2>Conexiune neconfigurată corect</h2><p>${escape(cloud.configurationError)}</p><p>Nu deschidem automat demonstrația în locul serviciului configurat.</p>`
    return { showUtility, saveProgress }
  }
  watchSession((session, event) => {
    if (session?.user.id === userId && event !== 'INITIAL_SESSION' && event !== 'SIGNED_OUT' && event !== 'PASSWORD_RECOVERY') return
    generation++; storeGeneration++
    cleanup()
    admitted = false; admin = false; profile = null; profileHydrated = false
    catalog = { stores: [], shelves: [], products: [] }
    selectedStore = ''
    document.querySelector('#store-selector')!.replaceChildren()
    document.querySelector('#catalog-status')!.textContent = ''
    userId = session?.user.id
    adminButton.hidden = true
    bridge.reset()
    bridge.catalog([], [])
    bridge.savedBody(undefined)
    bridge.utility.replaceChildren()
    gate(Boolean(session))
  })
  return { showUtility, saveProgress }
}
