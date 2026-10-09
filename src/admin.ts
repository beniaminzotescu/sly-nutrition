import './admin.css'
import {
  cloud, watchSession, getRole, loadAdminCatalog, saveCatalogRow, archiveCatalogRow,
  listAudit, signedProductImage, uploadProductImage, validateProductImage,
} from './cloud'
import type { AuditRow, CatalogStatus, CatalogTable, CloudCatalog, ProductRow, ShelfRow, StoreRow } from './cloud-types'

const statusNames: Record<CatalogStatus, string> = { draft: 'Ciornă', published: 'Publicat', archived: 'Arhivat' }
const tableNames: Record<CatalogTable, string> = { stores: 'Magazine', shelves: 'Rafturi', products: 'Produse' }
type CatalogRow = StoreRow | ShelfRow | ProductRow
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
  const node = document.createElement(tag)
  node.textContent = text
  if (className) node.className = className
  return node
}
function button(text: string, action: () => void, className = '') {
  const node = el('button', text, className)
  node.type = 'button'
  node.addEventListener('click', action)
  return node
}
function errorText(error: unknown) {
  // Database errors can include submitted data; show only controlled messages.
  if (error instanceof Error && error.name === 'AdminValidation') return error.message
  return 'Acțiunea nu a fost confirmată. Verifică sesiunea, conexiunea și regulile de publicare; reîncearcă.'
}
function invalid(message: string): never {
  const error = new Error(message)
  error.name = 'AdminValidation'
  throw error
}

/** Mount only in the connected application. RLS remains the authority for every operation. */
export function mountAdmin(root: HTMLElement, onCatalogChanged: () => void): () => void {
  const shell = el('section', '', 'catalog-admin')
  shell.setAttribute('aria-label', 'Administrare catalog')
  root.replaceChildren(shell)
  let disposed = false
  let epoch = 0
  let userId: string | null = null
  let authorized = false
  let busy = false
  let viewId = 0
  let imageVersion = 0
  let selected: string | null = null
  let table: CatalogTable = 'stores'
  let catalog: CloudCatalog = { stores: [], shelves: [], products: [] }
  let audit: AuditRow[] = []
  let message = el('p')
  let localImage: string | null = null
  const current = (version: number) => !disposed && epoch === version && authorized
  function revokeImage() {
    if (localImage) URL.revokeObjectURL(localImage)
    localImage = null
    imageVersion++
  }
  function notify(text: string, kind: 'error' | 'success' | 'info' = 'info') {
    message.textContent = text
    message.dataset.kind = kind
  }
  function changed() {
    try { onCatalogChanged() } catch { /* The persisted catalog is independent of the game view. */ }
  }
  function lock(value: boolean) {
    busy = value
    shell.querySelectorAll<HTMLButtonElement>('button[data-lock]').forEach(node => { node.disabled = value })
    shell.querySelectorAll<HTMLFieldSetElement>('fieldset').forEach(node => { node.disabled = value })
  }
  async function refresh(version: number) {
    const data = await loadAdminCatalog()
    if (!current(version)) return false
    catalog = data
    return true
  }
  async function permit(version: number) {
    const role = await getRole()
    if (!current(version)) return false
    if (role !== 'admin') {
      authorized = false
      epoch++
      revokeImage()
      shell.replaceChildren(el('p', 'Acces refuzat. Este necesar un rol administrator acordat pe server.'))
      return false
    }
    return true
  }
  function makeField(
    fields: HTMLElement, controls: Map<string, Control>, name: string, label: string, value: string,
    options?: { type?: string; choices?: [string, string][]; required?: boolean; min?: string; max?: string; step?: string; wide?: boolean; maxLength?: number },
  ) {
    const wrapper = el('label', label, `admin-field${options?.wide ? ' admin-wide' : ''}`)
    let input: Control
    if (options?.choices) {
      input = el('select')
      for (const [key, title] of options.choices) {
        const option = el('option', title)
        option.value = key
        input.append(option)
      }
    } else if (options?.type === 'textarea') {
      input = el('textarea')
      input.maxLength = options?.maxLength ?? 4000
    } else {
      input = el('input')
      input.type = options?.type ?? 'text'
      input.maxLength = options?.maxLength ?? 500
      if (options?.min) input.min = options.min
      if (options?.max) input.max = options.max
      if (options?.step) input.step = options.step
    }
    input.name = name
    input.value = value
    input.required = options?.required ?? false
    wrapper.append(input)
    fields.append(wrapper)
    controls.set(name, input)
    return input
  }
  function render() {
    if (!authorized || disposed) return
    revokeImage()
    const view = ++viewId
    const version = epoch
    shell.replaceChildren(el('h2', 'Administrare catalog'), el('p', 'Magazine → rafturi → produse. Numai înregistrările publicate în părinți publicați apar în joc.', 'admin-hint'))
    message = el('p', '', 'admin-message')
    message.setAttribute('role', 'status')
    message.setAttribute('aria-live', 'polite')
    const nav = el('nav', '', 'admin-nav')
    nav.setAttribute('aria-label', 'Tip de înregistrare')
    for (const key of ['stores', 'shelves', 'products'] as const) {
      const tab = button(tableNames[key], () => { if (!busy) { table = key; selected = null; render() } })
      tab.setAttribute('aria-pressed', String(table === key))
      tab.dataset.lock = ''
      nav.append(tab)
    }
    const reload = button('Reîncarcă', () => {
      if (busy) return
      lock(true)
      void (async () => {
        try {
          if (!await permit(version) || !await refresh(version)) return
          render()
          notify('Catalog reîncărcat.')
        } catch (error) { if (current(version)) notify(errorText(error), 'error') }
        finally { if (current(version)) lock(false) }
      })()
    })
    reload.dataset.lock = ''
    nav.append(reload)
    shell.append(nav, message)
    const layout = el('div', '', 'admin-layout')
    const sidebar = el('aside')
    const add = button(`Adaugă: ${tableNames[table].toLowerCase()}`, () => { if (!busy) { selected = null; render() } }, 'admin-primary')
    add.dataset.lock = ''
    sidebar.append(add)
    const list = el('div', '', 'admin-list')
    list.setAttribute('aria-label', tableNames[table])
    for (const row of catalog[table]) {
      const item = button(row.name, () => { if (!busy) { selected = row.id; render() } })
      item.dataset.lock = ''
      item.setAttribute('aria-pressed', String(row.id === selected))
      let parent = ''
      if ('store_id' in row) parent = catalog.stores.find(store => store.id === row.store_id)?.name ?? ''
      if ('shelf_id' in row) {
        const shelf = catalog.shelves.find(shelfRow => shelfRow.id === row.shelf_id)
        parent = `${catalog.stores.find(store => store.id === shelf?.store_id)?.name ?? ''} / ${shelf?.name ?? ''}`
      }
      item.append(el('small', `${statusNames[row.status]}${parent ? ` · ${parent}` : ''}`))
      list.append(item)
    }
    if (!catalog[table].length) list.append(el('p', 'Nicio înregistrare. Creează prima ciornă.'))
    sidebar.append(list)
    const editor = el('div', '', 'admin-editor')
    layout.append(sidebar, editor)
    shell.append(layout)
    const existing = catalog[table].find(row => row.id === selected)
    editor.append(el('h3', existing ? `Editează: ${existing.name}` : 'Înregistrare nouă'))
    const form = el('form')
    const fieldset = el('fieldset')
    const fields = el('div', '', 'admin-fields')
    const controls = new Map<string, Control>()
    const field = (name: string, label: string, value: string, options?: Parameters<typeof makeField>[5]) =>
      makeField(fields, controls, name, label, value, options)
    field('name', 'Nume', existing?.name ?? '', { required: true, maxLength: table === 'products' ? 200 : 120 })
    field('status', 'Stare editorială', existing?.status ?? 'draft', {
      choices: Object.entries(statusNames) as [string, string][],
    })
    let slot = (existing as ShelfRow | undefined)?.slot ?? 0
    let imagePath = (existing as ProductRow | undefined)?.image_path ?? null
    let imageFile: File | null = null
    let previewImageUrl: string | null = null
    let storedImageUrl: string | null = null
    const preview = el('section', '', 'admin-preview')
    preview.setAttribute('aria-label', 'Previzualizare produs')
    if (table === 'shelves') {
      const row = existing as ShelfRow | undefined
      const storeControl = field('store_id', 'Magazin', row?.store_id ?? catalog.stores[0]?.id ?? '', {
        choices: catalog.stores.map(store => [store.id, `${store.name} · ${statusNames[store.status]}`]), required: true,
      })
      if (!row) slot = Array.from({ length: 9 }, (_, index) => index).find(index => !catalog.shelves.some(shelf => shelf.store_id === storeControl.value && shelf.slot === index && shelf.status !== 'archived')) ?? 0
      const gridWrap = el('div', '', 'admin-wide')
      gridWrap.append(el('p', 'Plan magazin: rânduri de sus în jos; coloane de la stânga la dreapta. Fiecare celulă corespunde unei poziții din joc.', 'admin-hint'))
      const grid = el('div', '', 'admin-slot-grid')
      grid.setAttribute('role', 'group')
      grid.setAttribute('aria-label', 'Plan magazin: nouă poziții pentru rafturi')
      function drawSlots() {
        grid.replaceChildren()
        for (let index = 0; index < 9; index++) {
          const occupied = catalog.shelves.find(shelf => shelf.store_id === storeControl.value && shelf.slot === index && shelf.id !== existing?.id && shelf.status !== 'archived')
          const slotButton = button(`${index + 1}${occupied ? ` · ${occupied.name}` : ' · liber'}`, () => { slot = index; drawSlots() })
          slotButton.disabled = Boolean(occupied)
          slotButton.setAttribute('aria-pressed', String(slot === index))
          slotButton.setAttribute('aria-label', `Rând ${Math.floor(index / 3) + 1}, coloană ${index % 3 + 1}, poziția ${index}${occupied ? `, ocupată de ${occupied.name}` : ', disponibilă'}`)
          grid.append(slotButton)
        }
      }
      storeControl.addEventListener('change', () => {
        slot = Array.from({ length: 9 }, (_, index) => index).find(index => !catalog.shelves.some(shelf => shelf.store_id === storeControl.value && shelf.slot === index && shelf.id !== existing?.id && shelf.status !== 'archived')) ?? 0
        drawSlots()
      })
      drawSlots()
      gridWrap.append(grid)
      fields.append(gridWrap)
    }
    if (table === 'products') {
      const row = existing as ProductRow | undefined
      field('shelf_id', 'Magazin / raft', row?.shelf_id ?? catalog.shelves[0]?.id ?? '', {
        choices: catalog.shelves.map(shelf => [shelf.id, `${catalog.stores.find(store => store.id === shelf.store_id)?.name ?? 'Magazin necunoscut'} / ${shelf.name} · ${statusNames[shelf.status]}`]), required: true, wide: true,
      })
      field('group_name', 'Categorie', row?.group_name ?? '', { required: true, maxLength: 80 })
      field('package_unit', 'Unitate pentru ambalaj, porție și etichetă', row?.package_unit ?? 'g', { choices: [['g', 'g'], ['ml', 'ml']] })
      field('package_amount', 'Cantitate pe unitate (gol = necunoscut)', row?.package_amount?.toString() ?? '', { type: 'number', min: '0.1', max: '10000', step: '0.1' })
      field('units_per_pack', 'Unități în multipachet', String(row?.units_per_pack ?? 1), { type: 'number', min: '1', max: '100', step: '1', required: true })
      field('portion', 'Porție orientativă (multiplu de 5)', row?.portion?.toString() ?? '', { type: 'number', min: '5', max: '500', step: '5', required: true })
      field('label_verified', 'Starea sursei', row?.label_verified ? 'true' : 'false', {
        choices: [['false', 'În așteptare — etichetă neverificată'], ['true', 'Verificată manual pe eticheta sursă']],
      })
      fields.append(el('p', 'Valori per 100 g / 100 ml. Lasă gol orice valoare necunoscută; zero înseamnă zero declarat. „Verificată” este o confirmare editorială, nu o aprobare medicală.', 'admin-hint admin-wide'))
      for (const [key, label] of [['calories', 'Energie (kcal)'], ['protein', 'Proteine (g)'], ['fibre', 'Fibre (g)'], ['sugar', 'Zaharuri (g)']] as const) {
        field(key, label, row?.nutrition[key]?.toString() ?? '', { type: 'number', min: '0', max: key === 'calories' ? '1000' : '100', step: '0.1' })
      }
      field('ingredients', 'Ingrediente (gol = necunoscute)', row?.ingredients ?? '', { type: 'textarea', wide: true })
      field('allergens', 'Alergeni (gol = necunoscuți, nu „fără alergeni”)', row?.allergens ?? '', { type: 'textarea', wide: true, maxLength: 2000 })
      field('source', 'Sursă: titlu / referință etichetă / data consultării (necesară la publicare)', row?.source ?? '', { type: 'textarea', wide: true, maxLength: 1000 })
      field('shape', 'Formă în joc', row?.shape ?? 'box', { choices: [['box', 'Cutie'], ['can', 'Doză'], ['bottle', 'Sticlă'], ['tray', 'Tavă'], ['wafer', 'Napolitană'], ['pasta', 'Pachet paste']] })
      field('color', 'Culoare în joc', row?.color ?? 'grain', { choices: [['grain', 'Cereale'], ['leaf', 'Verde'], ['clay', 'Teracotă'], ['milk', 'Crem']] })
      const imageInput = field('image', 'Fotografie JPEG, PNG sau WebP · maximum 5 MB · 32–4096 px', '', { type: 'file', wide: true }) as HTMLInputElement
      imageInput.accept = 'image/jpeg,image/png,image/webp'
      imageInput.addEventListener('change', () => {
        const file = imageInput.files?.[0] ?? null
        imageFile = null
        revokeImage()
        previewImageUrl = storedImageUrl
        drawPreview()
        const imageRequest = imageVersion
        if (!file) return
        lock(true)
        notify('Se verifică fotografia…')
        void validateProductImage(file).then(() => {
          if (!current(version) || viewId !== view || imageVersion !== imageRequest) return
          imageFile = file
          localImage = URL.createObjectURL(file)
          previewImageUrl = localImage
          drawPreview()
          notify('Fotografie validată local. Va fi încărcată numai la salvare.')
        }).catch(() => {
          if (!current(version) || viewId !== view || imageVersion !== imageRequest) return
          imageInput.value = ''
          notify('Alege un JPEG, PNG sau WebP valid, maximum 5 MB și 32–4096 pixeli pe fiecare latură. SVG nu este acceptat.', 'error')
        }).finally(() => {
          if (current(version) && viewId === view && imageVersion === imageRequest) lock(false)
        })
      })
      if (imagePath) {
        void signedProductImage(imagePath).then(url => {
          if (current(version) && viewId === view) {
            storedImageUrl = url
            if (!imageFile) { previewImageUrl = url; drawPreview() }
          }
        }).catch(() => { if (current(version) && viewId === view) notify('Fotografia existentă nu poate fi afișată. Datele produsului sunt păstrate.', 'error') })
      }
    }
    const text = (name: string) => controls.get(name)?.value.trim() ?? ''
    function number(name: string, nullable = false) {
      const value = text(name)
      if (!value && nullable) return null
      const parsed = Number(value)
      if (!value || !Number.isFinite(parsed)) invalid('Completează numere valide; lasă goale numai câmpurile marcate necunoscute.')
      return parsed
    }
    function productData(): Omit<ProductRow, 'id'> {
      return {
        name: text('name'), status: text('status') as CatalogStatus, shelf_id: text('shelf_id'),
        group_name: text('group_name'), color: text('color'), shape: text('shape') as ProductRow['shape'],
        package_unit: text('package_unit') as ProductRow['package_unit'], package_amount: number('package_amount', true),
        units_per_pack: number('units_per_pack')!, portion: number('portion')!,
        nutrition: { calories: number('calories', true), protein: number('protein', true), fibre: number('fibre', true), sugar: number('sugar', true) },
        ingredients: text('ingredients') || null, allergens: text('allergens') || null,
        source: text('source'), image_path: imagePath, label_verified: text('label_verified') === 'true',
      }
    }
    function drawPreview() {
      if (table !== 'products' || !current(version) || viewId !== view) return
      preview.replaceChildren(el('h3', 'Previzualizare — nesalvată'))
      if (previewImageUrl) {
        const image = document.createElement('img')
        image.src = previewImageUrl
        image.alt = `Fotografie: ${text('name') || 'produs'}`
        image.referrerPolicy = 'no-referrer'
        preview.append(image)
      } else preview.append(el('p', 'Fotografie indisponibilă', 'admin-hint'))
      preview.append(el('h3', text('name') || 'Nume produs'), el('span', statusNames[text('status') as CatalogStatus], 'admin-badge'))
      preview.append(el('p', text('label_verified') === 'true' ? 'Etichetă marcată verificată de editor; fără aprobare medicală.' : 'ÎN AȘTEPTARE — etichetă neverificată. Datele lipsă nu reprezintă zero.', 'admin-hint'))
      const dl = el('dl')
      const value = (name: string, suffix = '') => text(name) ? `${text(name)}${suffix}` : 'Necunoscut'
      const unit = text('package_unit')
      for (const [title, content] of [
        ['Categorie', value('group_name')], ['Ambalaj', `${value('units_per_pack')} × ${value('package_amount', ` ${unit}`)}`],
        ['Porție', value('portion', ` ${unit}`)], [`Energie / 100 ${unit}`, value('calories', ' kcal')],
        [`Proteine / 100 ${unit}`, value('protein', ' g')], [`Fibre / 100 ${unit}`, value('fibre', ' g')],
        [`Zaharuri / 100 ${unit}`, value('sugar', ' g')], ['Ingrediente', text('ingredients') || 'Necunoscute'],
        ['Alergeni', text('allergens') || 'Necunoscuți — nu presupune absența alergenilor'], ['Sursă', value('source')],
      ]) dl.append(el('dt', title), el('dd', content))
      preview.append(dl)
    }
    fieldset.append(fields)
    const actions = el('div', '', 'admin-actions')
    const save = el('button', 'Salvează în cloud', 'admin-primary')
    save.type = 'submit'
    actions.append(save)
    if (existing && existing.status !== 'archived') {
      actions.append(button('Arhivează', () => {
        if (busy || !window.confirm(`Arhivezi „${existing.name}”? Înregistrarea și descendenții ei nu vor mai fi vizibili în joc. Nu se șterg datele sau istoricul.`)) return
        lock(true)
        void (async () => {
          try {
            if (!await permit(version)) return
            await archiveCatalogRow(table, existing.id)
            if (!current(version)) return
            changed()
            if (!await refresh(version)) return
            render()
            notify('Arhivare confirmată în cloud.', 'success')
          } catch (error) { if (current(version)) notify(errorText(error), 'error') }
          finally { if (current(version)) lock(false) }
        })()
      }))
    }
    fieldset.append(actions)
    form.append(fieldset)
    editor.append(form)
    if (table === 'products') {
      form.addEventListener('input', drawPreview)
      editor.append(preview)
      drawPreview()
    }
    form.addEventListener('submit', event => {
      event.preventDefault()
      if (busy || !form.reportValidity()) return
      const mutationTable = table
      let payload: Partial<CatalogRow>
      try {
        const name = text('name')
        if (!name) invalid('Numele nu poate conține numai spații.')
        const status = text('status') as CatalogStatus
        payload = { ...(existing ? { id: existing.id } : {}), name, status }
        if (table === 'shelves') {
          const store = catalog.stores.find(row => row.id === text('store_id'))
          if (!store) invalid('Creează și selectează un magazin mai întâi.')
          if (status !== 'archived' && catalog.shelves.some(row => row.store_id === store.id && row.slot === slot && row.id !== existing?.id && row.status !== 'archived')) invalid('Poziția este ocupată. Selectează o poziție liberă.')
          if (status === 'published' && store.status !== 'published') invalid('Publică magazinul înaintea raftului.')
          payload = { ...payload, store_id: store.id, slot }
        }
        if (table === 'products') {
          const data = productData()
          const shelf = catalog.shelves.find(row => row.id === data.shelf_id)
          if (!shelf) invalid('Creează și selectează un raft mai întâi.')
          if (!data.group_name) invalid('Completează categoria.')
          if (data.source.length > 1000) invalid('Referința sursei poate avea maximum 1000 de caractere.')
          if ((status === 'published' || data.label_verified) && !data.source) invalid('Publicarea și verificarea etichetei necesită o referință de sursă reală.')
          if (data.portion < 5 || data.portion > 500 || data.portion % 5 !== 0 ||
              data.units_per_pack < 1 || data.units_per_pack > 100 || !Number.isInteger(data.units_per_pack) ||
              (data.package_amount !== null && (data.package_amount < 0.1 || data.package_amount > 10000 ||
                Math.abs(data.package_amount * 10 - Math.round(data.package_amount * 10)) > 1e-7))) invalid('Ambalaj: 0,1–10000 în pași de 0,1; porție: 5–500 în pași de 5; multipachet: 1–100 unități întregi.')
          if (Object.values(data.nutrition).some(value => value !== null && Math.abs(value * 10 - Math.round(value * 10)) > 1e-7)) invalid('Valorile nutriționale acceptă pași de 0,1. Lasă gol ce nu este cunoscut.')
          if (status === 'published' && (shelf.status !== 'published' || catalog.stores.find(row => row.id === shelf.store_id)?.status !== 'published')) invalid('Publică magazinul și raftul înaintea produsului.')
          if (data.label_verified && (data.package_amount === null || !data.ingredients || !data.allergens || Object.values(data.nutrition).some(value => value === null))) invalid('Eticheta verificată necesită cantitatea, ingredientele, alergenii și toate valorile nutriționale. Altfel păstrează „În așteptare”.')
          payload = { ...payload, ...data }
        }
      } catch (error) { notify(errorText(error), 'error'); return }
      lock(true)
      notify('Se salvează…')
      void (async () => {
        try {
          if (!await permit(version)) return
          if (mutationTable === 'products' && imageFile) {
            const uploaded = await uploadProductImage(imageFile)
            if (!current(version)) return
            imagePath = uploaded
            imageFile = null
            ;(payload as Partial<ProductRow>).image_path = uploaded
          }
          if (!current(version)) return
          const saved = await saveCatalogRow(mutationTable, payload)
          if (!current(version)) return
          selected = saved.id
          changed()
          if (!await refresh(version)) return
          render()
          notify('Salvare confirmată în cloud.', 'success')
        } catch (error) {
          if (current(version)) notify(`${errorText(error)} Datele introduse și fotografia existentă nu au fost șterse.`, 'error')
        } finally { if (current(version)) lock(false) }
      })()
    })
    if (existing) {
      const history = el('section', '', 'admin-history')
      history.append(el('h3', 'Istoric editorial — numai citire'))
      const historyBody = el('div')
      const loadHistory = button('Încarcă istoricul înregistrării', () => {
        if (busy) return
        lock(true)
        void listAudit(table, existing.id).then(rows => {
          if (!current(version) || viewId !== view) return
          audit = rows.filter(row => row.table_name === table && row.record_id === existing.id)
          historyBody.replaceChildren()
          if (!audit.length) historyBody.append(el('p', 'Nicio modificare accesibilă pentru această înregistrare.'))
          for (const row of audit) {
            const details = el('details')
            details.append(el('summary', `${new Date(row.created_at).toLocaleString('ro-RO')} · ${row.action}`))
            for (const [label, data] of [['Înainte', row.old_data], ['După', row.new_data]] as const) {
              details.append(el('h4', label), el('pre', auditJSON(table, data)))
            }
            historyBody.append(details)
          }
        }).catch(error => { if (current(version) && viewId === view) notify(errorText(error), 'error') })
          .finally(() => { if (current(version)) lock(false) })
      })
      loadHistory.dataset.lock = ''
      history.append(loadHistory, el('p', 'Ultimele 100 de evenimente ale acestei înregistrări; fără profiluri sau date de sănătate. Istoricul nu poate fi editat aici.', 'admin-hint'), historyBody)
      editor.append(history)
    }
    lock(busy)
  }
  shell.append(el('p', 'Se verifică sesiunea și drepturile de administrator…'))
  let unsubscribe = () => {}
  if (!cloud.configured) shell.replaceChildren(el('p', 'Administrarea nu este disponibilă în demo offline. Configurează serviciul cloud real.'))
  else unsubscribe = watchSession(session => {
    const nextUser = session?.user.id ?? null
    if (nextUser === userId && authorized) return
    userId = nextUser
    const version = ++epoch
    authorized = false
    busy = false
    selected = null
    catalog = { stores: [], shelves: [], products: [] }
    audit = []
    revokeImage()
    shell.replaceChildren(el('p', nextUser ? 'Se verifică drepturile de administrator…' : 'Autentifică-te cu un cont administrator.'))
    if (!nextUser) return
    void (async () => {
      try {
        const role = await getRole()
        if (disposed || version !== epoch) return
        if (role !== 'admin') {
          shell.replaceChildren(el('p', 'Acces refuzat. Este necesar un rol administrator acordat pe server.'))
          return
        }
        authorized = true
        if (await refresh(version)) render()
      } catch {
        if (!disposed && version === epoch) {
          authorized = false
          shell.replaceChildren(el('p', 'Nu se pot verifica drepturile sau încărca datele. Închide și redeschide administrarea după verificarea conexiunii.'))
        }
      }
    })()
  })
  return () => {
    disposed = true
    epoch++
    authorized = false
    unsubscribe()
    revokeImage()
    shell.remove()
  }
}

function auditJSON(table: CatalogTable, data: unknown): string {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return '—'
  const common = ['id', 'name', 'status']
  const fields = table === 'stores' ? common : table === 'shelves'
    ? [...common, 'store_id', 'slot']
    : [...common, 'shelf_id', 'group_name', 'package_amount', 'package_unit', 'units_per_pack', 'portion', 'nutrition', 'ingredients', 'allergens', 'source', 'label_verified', 'image_path', 'shape', 'color']
  const safe: Record<string, unknown> = {}
  for (const key of fields) {
    const value = (data as Record<string, unknown>)[key]
    if (key === 'nutrition' && value && typeof value === 'object') {
      safe[key] = Object.fromEntries(['calories', 'protein', 'fibre', 'sugar'].map(nutrient => {
        const amount = (value as Record<string, unknown>)[nutrient]
        return [nutrient, typeof amount === 'number' && Number.isFinite(amount) ? amount : null]
      }))
    } else if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      safe[key] = typeof value === 'string' ? value.slice(0, 10000) : value
    }
  }
  return JSON.stringify(safe, null, 2)
}
