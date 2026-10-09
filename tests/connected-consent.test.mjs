import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

// Uses installed Chromium and Vite only. Cloud operations are explicit test doubles,
// while admission, onboarding, auth-ui and the connected frontend run unchanged.
const profileDirectory = resolve('consent-run')
await mkdir(profileDirectory)
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5196', '--strictPort'], { stdio: 'ignore' })
const browser = spawn(process.env.CHROMIUM_PATH || '/usr/bin/chromium', [
  '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=9236', `--user-data-dir=${profileDirectory}`, 'about:blank',
], { stdio: 'ignore', env: { ...process.env, TMPDIR: profileDirectory } })
let startupError
server.on('error', error => { startupError = error })
browser.on('error', error => { startupError = error })
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
async function ready(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (startupError) throw startupError
    try { const response = await fetch(url); if (response.ok) return response } catch {}
    await wait(100)
  }
  throw Error(`Service unavailable: ${url}`)
}
const mock = `
export const cloud={configured:true,configurationError:'',googleEnabled:false,client:{}};
const session={user:{id:'test-adult',email:'adult@example.test'}};
const scenario=window.consentScenario;
let profile=scenario==='new-profile'?null:{user_id:session.user.id,display_name:'Explorator',avatar_color:scenario?.endsWith('grain')?'grain':scenario?'milk':'clay',progress:scenario?{level:3,completed:['inspect','compare']}:{level:1,completed:[]},body_profile:null,body_consent_at:null};
export function watchSession(fn){let active=true;queueMicrotask(()=>{if(active)fn(session,'INITIAL_SESSION')});return()=>{active=false}}
export async function getProfile(){if(window.consentMock.failProfile)throw Error('Mock profile unavailable');return structuredClone(profile)}
export async function saveProfile(fields){window.consentMock.writes.push(structuredClone(fields));profile={...profile,...fields};if(fields.body_profile===null||fields.body_consent_at===null){profile.body_profile=null;profile.body_consent_at=null}return structuredClone(profile)}
window.consentMock={getProfile,writes:[],failProfile:scenario?.startsWith('profile-failure'),failRole:scenario==='role-failure'};
export async function getRole(){if(window.consentMock.failRole)throw Error('Mock role unavailable');return 'player'}
export async function listPublishedCatalog(){return {stores:[],shelves:[],products:[]}}
export const loadAdminCatalog=listPublishedCatalog;
export async function listSavedLists(){return []}
export async function listAudit(){return []}
export function isRecoverySession(){return false}
export async function signIn(){}
export async function signUp(){}
export async function signOut(){}
export async function requestPasswordReset(){}
export async function signInGoogle(){}
export async function updateRecoveredPassword(){}
export async function exportAccount(){return {profile,lists:[]}}
export async function deleteAccount(){}
export async function saveList(){throw Error('Not used by consent test')}
export async function deleteList(){throw Error('Not used by consent test')}
export async function signedProductImage(){throw Error('Not used by consent test')}
export async function uploadProductImage(){throw Error('Not used by consent test')}
export async function validateProductImage(){}
export async function saveCatalogRow(){throw Error('Not used by consent test')}
export async function archiveCatalogRow(){throw Error('Not used by consent test')}
`
let socket
let cdp
try {
  await ready('http://127.0.0.1:5196')
  const pages = await (await ready('http://127.0.0.1:9236/json')).json()
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl)
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
  let sequence = 0
  const pending = new Map(), exceptions = []
  cdp = async (method, params = {}) => {
    const id = ++sequence
    const response = await new Promise(resolve => { pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })) })
    if (response.error) throw Error(JSON.stringify(response.error))
    return response.result
  }
  socket.addEventListener('message', ({ data }) => {
    const result = JSON.parse(data)
    if (result.id) { pending.get(result.id)?.(result); pending.delete(result.id) }
    if (result.method === 'Runtime.exceptionThrown') exceptions.push(result.params.exceptionDetails)
    if (result.method === 'Fetch.requestPaused') {
      void cdp('Fetch.fulfillRequest', { requestId: result.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }], body: Buffer.from(mock).toString('base64') })
    }
  })
  async function evaluate(expression) {
    const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  async function until(expression) {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return
      await wait(50)
    }
    throw Error(`UI condition not reached: ${expression}`)
  }
  await cdp('Runtime.enable')
  await cdp('Page.enable')
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*://127.0.0.1:5196/src/cloud.ts*' }] })
  await cdp('Page.navigate', { url: 'http://127.0.0.1:5196' })
  await until(`!!document.querySelector('#adult-confirm')`)
  assert.equal(await evaluate(`document.querySelector('#world-cart').disabled`), true)
  await click('#adult-confirm')
  await click('#adult-continue')
  await until(`document.querySelector('#onboarding-dialog').open`)
  await click('[data-mode="own"]')
  await evaluate(`document.querySelector('#eligibility').value='eligible';document.querySelector('#eligibility').dispatchEvent(new Event('change'));for(const [id,value] of Object.entries({age:42,height:170,weight:70,coefficient:5}))document.getElementById(id).value=value;document.querySelector('#profile-form').requestSubmit()`)
  await click('#to-goal')
  await evaluate(`document.querySelector('[name=goal][value=maintenance]').checked=true;document.querySelector('#goal-form').requestSubmit()`)
  await click('[data-hud="profile"]')
  await until(`!!document.querySelector('[data-forget]')`)
  assert.equal(await evaluate(`document.querySelector('#body-consent').checked`), false)
  assert.equal(await evaluate(`consentMock.writes.some(write=>write.body_profile)`), false)
  await click('#body-consent')
  await click('#save-body')
  await until(`!document.querySelector('[data-forget]').disabled`)
  assert.deepEqual(await evaluate(`consentMock.getProfile().then(profile=>profile.body_profile)`), { age: 42, height: 170, weight: 70, coefficient: 5, activity: 1.2 })
  await click('#redo-onboarding')
  await click('[data-mode="own"]')
  assert.equal(await evaluate(`document.querySelector('#age').value`), '42')
  await evaluate(`document.querySelector('#eligibility').value='eligible';document.querySelector('#eligibility').dispatchEvent(new Event('change'));document.querySelector('#profile-form').requestSubmit()`)
  await click('#to-goal')
  await evaluate(`document.querySelector('[name=goal][value=maintenance]').checked=true;document.querySelector('#goal-form').requestSubmit()`)
  await click('[data-hud="profile"]')
  await until(`!!document.querySelector('[data-forget]')`)
  await click('[data-forget]')
  await until(`document.querySelector('[data-cloud-status]').textContent.includes('șterse din cont')`)
  assert.equal(await evaluate(`consentMock.getProfile().then(profile=>profile.body_profile)`), null)
  assert.equal(await evaluate(`consentMock.getProfile().then(profile=>profile.body_consent_at)`), null)
  assert.equal(await evaluate(`document.querySelector('#save-body').disabled`), true)
  assert.equal(await evaluate(`document.querySelector('#body-consent').checked`), false)
  assert.doesNotMatch(await evaluate(`document.querySelector('#cart-reference').textContent`), /Reper orientativ|kcal\/zi/)
  await click('#redo-onboarding')
  await click('[data-mode="own"]')
  for (const id of ['age', 'height', 'weight']) assert.equal(await evaluate(`document.getElementById('${id}').value`), '')
  for (const scenario of ['profile-failure', 'profile-failure-grain', 'role-failure', 'new-profile']) {
    const injection = await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.consentScenario=${JSON.stringify(scenario)}` })
    await cdp('Page.navigate', { url: 'http://127.0.0.1:5196' })
    await until(`!!document.querySelector('#adult-confirm')`)
    await click('#adult-confirm')
    await click('#adult-continue')
    await until(`document.querySelector('#onboarding-dialog').open`)
    await click('#skip-profile')
    await click('#to-goal')
    await evaluate(`document.querySelector('#goal-form').requestSubmit()`)
    await click('[data-hud="missions"]')
    if (scenario.startsWith('profile-failure')) {
      await click('[data-avatar="clay"]')
      assert.equal(await evaluate(`consentMock.writes.length`), 0)
      await click('#utility-dialog .close-button')
      await click('[data-hud="profile"]')
      await until(`!!document.querySelector('[data-retry-profile]')`)
      await evaluate(`consentMock.failProfile=false`)
      await click('[data-retry-profile]')
      await until(`consentMock.writes.length > 0 && !document.querySelector('[data-retry-profile]')`)
      assert.deepEqual(await evaluate(`consentMock.writes.at(-1).progress.completed`), ['inspect', 'compare'])
      assert.equal(await evaluate(`consentMock.writes.at(-1).avatar_color`), scenario.endsWith('grain') ? 'grain' : 'milk')
      if (scenario.endsWith('grain')) assert.equal(await evaluate(`document.querySelector('.avatar-body').style.backgroundColor`), 'rgb(205, 176, 113)')
    } else if (scenario === 'role-failure') {
      assert.equal(await evaluate(`document.querySelector('[data-avatar="milk"]').getAttribute('aria-pressed')`), 'true')
      assert.equal(await evaluate(`document.querySelector('#admin-open').hidden`), true)
      await click('[data-avatar="milk"]')
      await until(`consentMock.writes.length > 0`)
      assert.deepEqual(await evaluate(`consentMock.writes.at(-1).progress.completed`), ['inspect', 'compare'])
      assert.equal(await evaluate(`consentMock.writes.at(-1).avatar_color`), 'milk')
    } else {
      await click('[data-avatar="clay"]')
      await until(`consentMock.writes.length > 0`)
      assert.deepEqual(await evaluate(`consentMock.writes.at(-1).progress.completed`), [])
    }
    await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: injection.identifier })
  }
  assert.deepEqual(exceptions, [])
  console.log('Connected browser regressions passed (mocked cloud): adult/consent/revoke/prefill safeguards; failed hydration blocks progress writes; retry preserves achievements/color; independent role failure preserves loaded profile; null new profile permits writes.')
} finally {
  if (cdp && socket?.readyState === WebSocket.OPEN) {
    await Promise.race([cdp('Browser.close').catch(() => {}), wait(1000)])
    socket.close()
  }
  browser.kill('SIGTERM')
  server.kill('SIGTERM')
  await wait(500)
  await rm(profileDirectory, { recursive: true, force: true })
}
