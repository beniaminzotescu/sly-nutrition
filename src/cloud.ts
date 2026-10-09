import { createClient, type AuthChangeEvent, type Session } from '@supabase/supabase-js'
import type { ShoppingEntry } from './shopping-list'
import { validateShoppingEntries } from './snapshot-validation'
import type { AuditRow, CatalogRows, CatalogTable, CloudCatalog, ProfileRow, Role, SavedListRow } from './cloud-types'

const env = import.meta.env
function configuration() {
  const url = String(env.VITE_SUPABASE_URL || '').trim()
  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!url && !key) return { error: '', url: '', key: '' }
  try {
    const parsed = new URL(url)
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/' ||
        !(parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)))) throw new Error()
    if (!key) throw new Error()
    for (const suppliedKey of [env.VITE_SUPABASE_PUBLISHABLE_KEY, env.VITE_SUPABASE_ANON_KEY]) {
      if (!suppliedKey) continue
      const publicKey = String(suppliedKey).trim()
      if (publicKey.startsWith('sb_secret_')) throw new Error()
      if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicKey)) {
        const parts = publicKey.split('.')
        if (parts.length !== 3) throw new Error()
        const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }
        if (payload.role !== 'anon') throw new Error()
      }
    }
    try {
      const probe = 'sly-auth-storage-check'
      window.localStorage.setItem(probe, '1')
      window.localStorage.removeItem(probe)
    } catch {
      return { url: '', key: '', error: 'Stocarea browserului este blocată. Permite stocarea locală pentru autentificare și recuperarea contului; datele corporale și listele nu sunt salvate automat în browser.' }
    }
    return { url, key, error: '' }
  } catch {
    return { url: '', key: '', error: 'Configurație cloud invalidă. Folosește URL-ul proiectului și numai cheia publică anon/publishable, niciodată service_role/secret.' }
  }
}
const config = configuration()
export const cloud = {
  configured: Boolean(config.url && config.key),
  configurationError: config.error,
  googleEnabled: env.VITE_GOOGLE_AUTH_ENABLED === 'true',
  client: config.url && config.key ? createClient(config.url, config.key, {
    auth: { flowType: 'pkce', persistSession: true, storage: window.localStorage, detectSessionInUrl: true },
  }) : null,
}
let activeSession: Session | null = null
let generation = 0
let recoveryUser: string | null = null
const listeners = new Set<(session: Session | null, event: AuthChangeEvent) => void>()
let readyResolve: () => void
const ready = new Promise<void>(resolve => { readyResolve = resolve })
if (cloud.client) {
  cloud.client.auth.onAuthStateChange((event, session) => {
    if (activeSession?.user.id !== session?.user.id || event === 'SIGNED_OUT') generation++
    activeSession = session
    if (event === 'PASSWORD_RECOVERY') recoveryUser = session?.user.id ?? null
    else if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || recoveryUser !== session?.user.id) recoveryUser = null
    readyResolve()
    for (const listener of listeners) listener(session, event)
  })
} else readyResolve!()

export function watchSession(callback: (session: Session | null, event: AuthChangeEvent) => void) {
  listeners.add(callback)
  void ready.then(() => { if (listeners.has(callback)) callback(activeSession, 'INITIAL_SESSION') })
  return () => { listeners.delete(callback) }
}
function client() {
  if (!cloud.client) throw new Error('Mod demo: serviciul de cont nu este configurat.')
  return cloud.client
}
async function account() {
  await ready
  const user = activeSession?.user
  if (!user) throw new Error('Autentifică-te pentru această acțiune.')
  const version = generation
  const check = () => {
    if (version !== generation || activeSession?.user.id !== user.id) throw new Error('Contul s-a schimbat. Reîncearcă.')
  }
  const { data, error } = await client().auth.getSession()
  check()
  if (error || !data.session?.access_token || data.session.user.id !== user.id) throw new Error('Sesiunea contului s-a schimbat. Reconectează-te înainte de a continua.')
  return { id: user.id, accessToken: data.session.access_token, check }
}
function unwrap<T extends { data?: unknown; error: { message: string } | null }>(result: T): NonNullable<T['data']> {
  if (result.error) throw new Error(result.error.message)
  return result.data as NonNullable<T['data']>
}
export function authRedirect() {
  // No next/returnTo parameters are accepted from the URL.
  const target = new URL(import.meta.env.BASE_URL, window.location.origin)
  if (target.origin !== window.location.origin) throw new Error('Adresa de autentificare trebuie să fie din aceeași origine.')
  target.search = ''
  target.hash = ''
  return target.href
}
export async function signIn(email: string, password: string) {
  unwrap(await client().auth.signInWithPassword({ email, password }))
}
export async function signUp(email: string, password: string) {
  unwrap(await client().auth.signUp({ email, password, options: { emailRedirectTo: authRedirect() } }))
}
export async function requestPasswordReset(email: string) {
  unwrap(await client().auth.resetPasswordForEmail(email, { redirectTo: authRedirect() }))
}
export async function signInGoogle() {
  if (!cloud.googleEnabled) throw new Error('Google nu este activat.')
  unwrap(await client().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: authRedirect() } }))
}
export function isRecoverySession() { return Boolean(recoveryUser && recoveryUser === activeSession?.user.id) }
export async function updateRecoveredPassword(password: string) {
  const current = await account()
  if (!isRecoverySession()) throw new Error('Deschide linkul de recuperare din email în acest browser.')
  unwrap(await client().auth.updateUser({ password }))
  current.check()
  recoveryUser = null
}
export async function signOut() { unwrap(await client().auth.signOut({ scope: 'local' })) }
export async function getRole(): Promise<Role> {
  const current = await account()
  const admin = unwrap(await client().rpc('is_admin'))
  current.check()
  return admin === true ? 'admin' : 'player'
}
async function catalog(published: boolean): Promise<CloudCatalog> {
  await ready
  const version = generation
  const tables = ['stores', 'shelves', 'products'] as const
  const results = await Promise.all(tables.map(table => {
    const query = client().from(table).select('*')
    return published ? query.eq('status', 'published') : query
  }))
  if (version !== generation) throw new Error('Contul s-a schimbat. Reîncarcă selecția.')
  const stores = unwrap(results[0]!) as unknown as CloudCatalog['stores']
  const storeIds = new Set(stores.map(row => row.id))
  const shelves = (unwrap(results[1]!) as unknown as CloudCatalog['shelves']).filter(row => storeIds.has(row.store_id))
  const shelfIds = new Set(shelves.map(row => row.id))
  const products = (unwrap(results[2]!) as unknown as CloudCatalog['products']).filter(row => shelfIds.has(row.shelf_id))
  return { stores, shelves, products }
}
export const listPublishedCatalog = () => catalog(true)
export const loadAdminCatalog = () => catalog(false)
export async function saveCatalogRow<T extends CatalogTable>(table: T, row: Partial<CatalogRows[T]>): Promise<CatalogRows[T]> {
  const current = await account()
  const result = unwrap(await client().from(table).upsert({ ...row } as Record<string, unknown>).select().single())
  current.check()
  return result as unknown as CatalogRows[T]
}
export async function archiveCatalogRow(table: CatalogTable, id: string) {
  const current = await account()
  unwrap(await client().from(table).update({ status: 'archived' }).eq('id', id).select('id').single())
  current.check()
}
export async function deleteCatalogRow(table: CatalogTable, id: string) {
  const current = await account()
  unwrap(await client().from(table).delete().eq('id', id).select('id').single())
  current.check()
}
export async function listAudit(table?: CatalogTable, id?: string): Promise<AuditRow[]> {
  const current = await account()
  let query = client().from('catalog_audit').select('*')
  if (table) query = query.eq('table_name', table)
  if (id) query = query.eq('record_id', id)
  const data = unwrap(await query.order('created_at', { ascending: false }).limit(100))
  current.check()
  return data as unknown as AuditRow[]
}
export async function getProfile(): Promise<ProfileRow | null> {
  const current = await account()
  const data = unwrap(await client().from('profiles').select('*').eq('user_id', current.id).maybeSingle())
  current.check()
  return data as unknown as ProfileRow | null
}
export async function saveProfile(fields: Partial<Omit<ProfileRow, 'user_id'>>): Promise<ProfileRow> {
  const current = await account()
  const allowed: Partial<ProfileRow> = {}
  for (const key of ['display_name', 'avatar_color', 'progress', 'body_profile', 'body_consent_at'] as const) {
    if (fields[key] !== undefined) Object.assign(allowed, { [key]: fields[key] })
  }
  if (allowed.body_consent_at === null || allowed.body_profile === null) {
    allowed.body_profile = null
    allowed.body_consent_at = null
  }
  const data = unwrap(await client().from('profiles').upsert({ ...allowed, user_id: current.id }, { onConflict: 'user_id', defaultToNull: false }).select().single())
  current.check()
  return data as unknown as ProfileRow
}
export async function listSavedLists(): Promise<SavedListRow[]> {
  const current = await account()
  const data = unwrap(await client().from('saved_lists').select('*').eq('user_id', current.id).order('updated_at', { ascending: false }))
  current.check()
  return (data as unknown as SavedListRow[]).map(row => ({ ...row, entries: validateShoppingEntries(row.entries) }))
}
export async function saveList(name: string, entries: ShoppingEntry[], id?: string): Promise<SavedListRow> {
  const current = await account()
  const snapshot = validateShoppingEntries(entries)
  const data = unwrap(await client().from('saved_lists').upsert({ ...(id ? { id } : {}), user_id: current.id, name, entries: snapshot }).select().single())
  current.check()
  return data as unknown as SavedListRow
}
export async function deleteList(id: string) {
  const current = await account()
  unwrap(await client().from('saved_lists').delete().eq('id', id).eq('user_id', current.id).select('id').single())
  current.check()
}
export async function exportAccount() {
  const current = await account()
  const [profile, lists] = await Promise.all([getProfile(), listSavedLists()])
  current.check()
  return { profile, lists }
}
export async function deleteAccount(expectedUserId: string) {
  const current = await account()
  if (current.id !== expectedUserId) throw new Error('Contul confirmat s-a schimbat. Redeschide confirmarea de ștergere.')
  const verification = await client().auth.getUser(current.accessToken)
  current.check()
  if (verification.error || verification.data.user?.id !== expectedUserId) throw new Error('Identitatea contului nu a putut fi verificată. Reconectează-te.')
  const { error } = await client().functions.invoke('delete-account', {
    body: {}, headers: { Authorization: ['Bearer', current.accessToken].join(' ') },
  })
  current.check()
  if (error) {
    throw new Error('Contul nu a putut fi șters. Reconectează-te și reîncearcă. Dacă problema persistă, administratorul trebuie să verifice funcția delete-account și obiectele Storage deținute în alte colecții. Datele nu sunt confirmate ca șterse.')
  }
  const latest = await client().auth.getSession()
  current.check()
  if (latest.data.session?.user.id !== current.id) throw new Error('Contul confirmat a fost șters; sesiunea curentă s-a schimbat și nu a fost deconectată.')
  await signOut()
}
export async function signedProductImage(path: string): Promise<string> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpg|jpeg)$/.test(path)) throw new Error('Calea imaginii este invalidă.')
  await ready
  const version = generation
  const data = unwrap(await client().storage.from('product-images').createSignedUrl(path, 900))
  if (version !== generation) throw new Error('Contul s-a schimbat.')
  const url = new URL(data.signedUrl)
  if (url.origin !== new URL(config.url).origin || url.pathname !== `/storage/v1/object/sign/product-images/${path}` || url.username || url.password || url.hash) throw new Error('Adresa imaginii este invalidă.')
  return url.href
}
export async function removeProductImage(path: string): Promise<void> {
  const current = await account()
  unwrap(await client().storage.from('product-images').remove([path]))
  current.check()
}
function imageDimensions(bytes: Uint8Array, kind: 'png' | 'jpeg' | 'webp'): [number, number] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ascii = (offset: number, count: number) => String.fromCharCode(...bytes.slice(offset, offset + count))
  if (kind === 'png' && bytes.length >= 24 && view.getUint32(8) === 13 && ascii(12, 4) === 'IHDR') {
    return [view.getUint32(16), view.getUint32(20)]
  }
  if (kind === 'webp' && bytes.length >= 30) {
    if (ascii(12, 4) === 'VP8X') return [1 + bytes[24]! + (bytes[25]! << 8) + (bytes[26]! << 16), 1 + bytes[27]! + (bytes[28]! << 8) + (bytes[29]! << 16)]
    if (ascii(12, 4) === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) return [view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff]
    if (ascii(12, 4) === 'VP8L' && bytes[20] === 0x2f) return [1 + bytes[21]! + ((bytes[22]! & 0x3f) << 8), 1 + (bytes[22]! >> 6) + (bytes[23]! << 2) + ((bytes[24]! & 15) << 10)]
  }
  if (kind === 'jpeg') {
    let offset = 2
    while (offset + 3 < bytes.length) {
      if (bytes[offset++] !== 0xff) break
      while (bytes[offset] === 0xff) offset++
      const marker = bytes[offset++]
      if (marker === undefined || marker === 0xda || marker === 0xd9) break
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue
      if (offset + 2 > bytes.length) break
      const length = view.getUint16(offset)
      if (length < 2 || offset + length > bytes.length) break
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 8) {
        return [view.getUint16(offset + 5), view.getUint16(offset + 3)]
      }
      offset += length
    }
  }
  throw new Error('Antetul sau dimensiunile imaginii sunt invalide.')
}
async function validatedProductBitmap(file: File): Promise<ImageBitmap> {
  if (file.size > 5 * 1024 * 1024 || file.size === 0) throw new Error('Imaginea trebuie să aibă maximum 5 MB.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  if (!((png && file.type === 'image/png') || (jpeg && file.type === 'image/jpeg') || (webp && file.type === 'image/webp'))) throw new Error('Alege o imagine JPEG, PNG sau WebP validă; SVG nu este acceptat.')
  const [width, height] = imageDimensions(bytes, png ? 'png' : jpeg ? 'jpeg' : 'webp')
  if (width < 32 || height < 32 || width > 4096 || height > 4096) throw new Error('Dimensiuni acceptate: 32–4096 pixeli pe fiecare latură.')
  const bitmap = await createImageBitmap(file)
  if (bitmap.width < 32 || bitmap.height < 32 || bitmap.width > 4096 || bitmap.height > 4096) {
    bitmap.close()
    throw new Error('Dimensiuni acceptate: 32–4096 pixeli pe fiecare latură.')
  }
  return bitmap
}
export async function validateProductImage(file: File): Promise<void> {
  const bitmap = await validatedProductBitmap(file)
  bitmap.close()
}
export async function uploadProductImage(file: File): Promise<string> {
  const current = await account()
  const bitmap = await validatedProductBitmap(file)
  try {
    current.check()
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width; canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Procesarea imaginii nu este disponibilă.')
    context.drawImage(bitmap, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Imagine invalidă.')), 'image/webp', 0.85))
    if (blob.size > 5 * 1024 * 1024) throw new Error('Imaginea procesată depășește 5 MB.')
    current.check()
    const path = `${crypto.randomUUID()}.${blob.type === 'image/webp' ? 'webp' : 'png'}`
    unwrap(await client().storage.from('product-images').upload(path, blob, { contentType: blob.type, upsert: false }))
    current.check()
    return path
  } finally { bitmap.close() }
}
