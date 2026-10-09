// Native Node tests. Auth/HTTP responses are mocked; no live project is contacted.
// Run: node --test supabase/tests/auth-boundaries.mjs
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { createClient } from '@supabase/supabase-js'

const compiled = ts.transpileModule(
  readFileSync(new URL('../../src/cloud.ts', import.meta.url), 'utf8').replaceAll('import.meta.env', '__env'),
  { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS } },
).outputText
const publicKey = ['header', Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url'), 'signature'].join('.')
function storage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: key => { values.delete(key) },
    keys: () => [...values.keys()],
  }
}
function loadCloud(shared, factory) {
  const context = {
    exports: {}, URL, atob,
    window: { localStorage: shared, location: { origin: 'https://game.example' } },
    __env: { BASE_URL: '/', VITE_SUPABASE_URL: 'https://project.example', VITE_SUPABASE_ANON_KEY: publicKey },
    require: name => name === '@supabase/supabase-js' ? { createClient: factory } : { validateShoppingEntries: value => value },
  }
  vm.runInNewContext(compiled, context)
  return context.exports
}
const tick = () => new Promise(resolve => setImmediate(resolve))

test('two tabs share auth storage; stale events and stale confirmations cannot delete another identity', async () => {
  const shared = storage()
  const notifications = []
  const deleted = []
  let switchDuringVerification = false
  function session(id, tokenOwner = id) { return { user: { id }, access_token: `token-${tokenOwner}` } }
  function save(id, tokenOwner = id) { shared.setItem('mock-session', JSON.stringify(session(id, tokenOwner))) }
  function read() { return JSON.parse(shared.getItem('mock-session') || 'null') }
  function factory(_url, _key, options) {
    assert.equal(options.auth.storage, shared)
    return {
      auth: {
        onAuthStateChange(callback) {
          notifications.push(callback)
          queueMicrotask(() => callback('INITIAL_SESSION', read()))
        },
        getSession: async () => ({ data: { session: read() }, error: null }),
        getUser: async token => {
          if (switchDuringVerification) save('C')
          return { data: { user: { id: token.slice('token-'.length) } }, error: null }
        },
        signOut: async () => {
          shared.removeItem('mock-session')
          notifications.forEach(callback => callback('SIGNED_OUT', null))
          return { error: null }
        },
      },
      functions: {
        invoke: async (_name, options) => {
          assert.deepEqual(Object.keys(options.body), [])
          deleted.push(options.headers.Authorization)
          return { data: {}, error: null }
        },
      },
    }
  }
  save('A')
  const first = loadCloud(shared, factory)
  const second = loadCloud(shared, factory)
  await tick()
  // The original bug: B's event in a receiving tab whose stored token is A.
  notifications[0]('SIGNED_IN', session('B'))
  await assert.rejects(first.deleteAccount('B'), /Sesiunea contului/)
  assert.equal(deleted.length, 0)
  // Normal shared-storage switch; the old A confirmation must not delete B.
  save('B')
  notifications.forEach(callback => callback('SIGNED_IN', session('B')))
  await assert.rejects(first.deleteAccount('A'), /Contul confirmat/)
  // Never trust the local user object when it disagrees with verified JWT identity.
  save('B', 'A')
  await assert.rejects(second.deleteAccount('B'), /Identitatea/)
  assert.equal(deleted.length, 0)
  save('B')
  await second.deleteAccount('B')
  assert.deepEqual(deleted, [['Bearer', 'token-B'].join(' ')])
  // If storage changes after verification, pin B's verified token, never C's.
  save('B')
  notifications.forEach(callback => callback('SIGNED_IN', session('B')))
  switchDuringVerification = true
  await assert.rejects(first.deleteAccount('B'), /sesiunea curentă s-a schimbat/)
  assert.deepEqual(deleted, Array(2).fill(['Bearer', 'token-B'].join(' ')))
  assert.equal(read().user.id, 'C', 'do not sign out an unrelated newly active account')
})

test('real SDK PKCE verifier survives a new tab and yields PASSWORD_RECOVERY with mocked HTTP', async () => {
  const shared = storage()
  const userId = '00000000-0000-4000-8000-000000000001'
  const user = { id: userId, aud: 'authenticated', email: 'player@example.test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
  const accessToken = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
    'test-signature',
  ].join('.')
  let exchangedVerifier
  const requests = []
  const fetch = async (input, options) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    assert.equal(url.origin, 'https://project.example')
    requests.push(url.pathname)
    if (url.pathname.endsWith('/recover')) return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    if (url.pathname.endsWith('/token')) {
      const body = JSON.parse(options.body)
      assert.equal(body.auth_code, 'one-time-test-code')
      exchangedVerifier = body.code_verifier
      return new Response(JSON.stringify({ access_token: accessToken, token_type: 'bearer', refresh_token: 'test-refresh', expires_in: 3600, user }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    throw new Error(`Unexpected mocked endpoint: ${url.pathname}`)
  }
  const factory = (url, key, options) => createClient(url, key, {
    ...options, global: { fetch }, auth: { ...options.auth, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const requestingTab = loadCloud(shared, factory)
  await requestingTab.requestPasswordReset('player@example.test')
  assert(shared.keys().some(key => key.includes('code-verifier')), 'PKCE verifier persisted in shared auth storage')
  const freshTab = loadCloud(shared, factory)
  const result = await freshTab.cloud.client.auth.exchangeCodeForSession('one-time-test-code')
  assert.equal(result.error, null)
  assert.equal(result.data.user.id, userId)
  assert.equal(typeof exchangedVerifier, 'string')
  assert(exchangedVerifier.length >= 43)
  assert.equal(freshTab.isRecoverySession(), true)
  assert.equal((await freshTab.cloud.client.auth.getSession()).data.session.user.id, userId)
  assert.deepEqual(requests, ['/auth/v1/recover', '/auth/v1/token'])
  await requestingTab.cloud.client.auth.stopAutoRefresh()
  await freshTab.cloud.client.auth.stopAutoRefresh()
})

test('blocked persistent auth storage disables accounts rather than falling back to incoherent tab storage', () => {
  const blocked = { setItem() { throw new Error('Storage blocked') }, removeItem() {}, getItem() { return null } }
  const app = loadCloud(blocked, () => { throw new Error('Must not initialize SDK') })
  assert.equal(app.cloud.configured, false)
  assert.match(app.cloud.configurationError, /Stocarea browserului/)
})
