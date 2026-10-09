import type { Session } from '@supabase/supabase-js'
import {
  cloud, deleteAccount, exportAccount, getProfile, isRecoverySession, requestPasswordReset,
  saveProfile, signIn, signInGoogle, signOut, signUp, updateRecoveredPassword, watchSession,
} from './cloud'

export function mountAuth(root: HTMLElement, options: { onSession?: (session: Session | null) => void } = {}) {
  let session: Session | null = null
  let mode: 'signin' | 'signup' | 'reset' = 'signin'
  let generation = 0
  let disposed = false
  let lastUser: string | undefined
  function status(message: string) {
    const node = root.querySelector<HTMLElement>('[data-auth-status]')
    if (node) node.textContent = message
  }
  async function run(action: () => Promise<void>, success = '') {
    const version = generation
    const buttons = root.querySelectorAll<HTMLButtonElement>('button')
    buttons.forEach(button => { button.disabled = true })
    status('Se procesează…')
    try {
      await action()
      if (!disposed && version === generation) status(success)
    } catch (error) {
      if (!disposed && version === generation) status(error instanceof Error ? error.message : 'Acțiunea nu a reușit. Încearcă din nou.')
    } finally {
      if (!disposed && version === generation) buttons.forEach(button => { button.disabled = false })
    }
  }
  function render() {
    generation++
    root.replaceChildren()
    if (!cloud.configured) {
      const message = document.createElement('p')
      message.className = 'notice'
      message.textContent = cloud.configurationError || 'Mod demo offline — fără cont sau salvare în cloud. Nu simulăm autentificarea.'
      root.append(message)
      return
    }
    if (isRecoverySession()) {
      root.innerHTML = `<h2>Parolă nouă</h2><form data-recovery><label>Parolă nouă (minimum 12 caractere)<input name="password" type="password" minlength="12" maxlength="128" required autocomplete="new-password"></label><button type="submit">Salvează parola</button></form><p role="status" data-auth-status></p>`
      root.querySelector('form')!.addEventListener('submit', event => {
        event.preventDefault()
        const password = root.querySelector<HTMLInputElement>('input')!
        void run(async () => {
          const value = password.value
          password.value = ''
          await updateRecoveredPassword(value)
          render()
          status('Parola a fost schimbată.')
        })
      })
      return
    }
    if (session) {
      const renderedUserId = session.user.id
      root.innerHTML = `<h2>Contul meu</h2><p data-account-email></p>
        <p>Sesiunea de autentificare este păstrată în stocarea locală a browserului și sincronizată între file. Deconectează-te pe dispozitive partajate. Datele corporale și listele nu se salvează automat în browser.</p>
        <p>Conectarea nu înlocuiește alegerea modului educațional și verificarea eligibilității pentru date personale.</p>
        <form data-name><label>Nume afișat<input name="display_name" maxlength="80" required autocomplete="nickname"></label><button type="submit">Salvează numele</button></form>
        <p>Datele corporale sunt opționale. Nu se salvează prin autentificare. Poți retrage oricând acordul și șterge datele corporale salvate.</p>
        <div class="actions"><button type="button" data-forget>Retrage acordul / șterge datele corporale</button>
        <button type="button" data-export>Descarcă datele contului (JSON)</button><button type="button" data-logout>Deconectare</button></div>
        <details><summary>Șterge definitiv contul</summary><p>Șterge profilul, progresul și toate listele salvate. Acțiunea nu poate fi anulată.</p>
        <form data-delete><label>Scrie ȘTERGE pentru confirmare<input name="confirmation" required autocomplete="off"></label><button type="submit">Șterge definitiv contul</button></form></details>
        <p role="status" data-auth-status></p>`
      root.querySelector('[data-account-email]')!.textContent = session.user.email || 'Cont conectat'
      const version = generation
      void getProfile().then(profile => {
        if (!disposed && version === generation) root.querySelector<HTMLInputElement>('[name=display_name]')!.value = profile?.display_name || 'Explorator'
      }).catch(() => { if (!disposed && version === generation) status('Profilul nu a putut fi încărcat.') })
      root.querySelector('[data-name]')!.addEventListener('submit', event => {
        event.preventDefault()
        const name = root.querySelector<HTMLInputElement>('[name=display_name]')!.value.trim()
        void run(async () => { await saveProfile({ display_name: name }) }, 'Numele a fost salvat.')
      })
      root.querySelector('[data-forget]')!.addEventListener('click', () => {
        void run(async () => {
          await saveProfile({ body_profile: null, body_consent_at: null })
          root.dispatchEvent(new CustomEvent('body-profile-cleared', { bubbles: true }))
        }, 'Datele corporale salvate au fost șterse și acordul retras.')
      })
      root.querySelector('[data-logout]')!.addEventListener('click', () => { void run(signOut) })
      root.querySelector('[data-export]')!.addEventListener('click', () => {
        void run(async () => {
          const data = await exportAccount()
          if (disposed || version !== generation) return
          const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
          const link = document.createElement('a')
          link.href = url; link.download = 'datele-contului.json'
          root.append(link); link.click(); link.remove()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        }, 'Exportul include numai profilul și listele tale; nu include parole sau tokenuri.')
      })
      root.querySelector('[data-delete]')!.addEventListener('submit', event => {
        event.preventDefault()
        if (root.querySelector<HTMLInputElement>('[name=confirmation]')!.value !== 'ȘTERGE') { status('Scrie exact ȘTERGE pentru confirmare.'); return }
        void run(() => deleteAccount(renderedUserId))
      })
      return
    }
    root.innerHTML = `<h2>${mode === 'signin' ? 'Intră în cont' : mode === 'signup' ? 'Creează un cont' : 'Recuperează parola'}</h2>
      <p>Contul salvează liste și progres. Datele corporale rămân opționale și necesită acord separat. Nu introduce date medicale în nume sau liste.</p>
      <p>Autentificarea și verificatorul linkurilor email folosesc stocarea locală a browserului, comună filelor. Datele corporale și listele nu sunt salvate automat în browser. Deconectează-te pe dispozitive partajate.</p>
      <form data-auth><label>Email<input type="email" name="email" required maxlength="254" autocomplete="email"></label>
      ${mode !== 'reset' ? `<label>Parolă${mode === 'signup' ? ' (minimum 12 caractere)' : ''}<input type="password" name="password" required ${mode === 'signup' ? 'minlength="12"' : ''} maxlength="128" autocomplete="${mode === 'signin' ? 'current-password' : 'new-password'}"></label>` : ''}
      <button type="submit">${mode === 'signin' ? 'Conectare' : mode === 'signup' ? 'Trimite email de verificare' : 'Trimite link de recuperare'}</button></form>
      <div class="actions"><button type="button" data-mode="signin">Am cont</button><button type="button" data-mode="signup">Cont nou</button><button type="button" data-mode="reset">Am uitat parola</button>
      ${cloud.googleEnabled ? '<button type="button" data-google>Continuă cu Google</button>' : ''}</div>
      <p role="status" data-auth-status></p>`
    root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.addEventListener('click', () => {
      mode = button.dataset.mode as typeof mode
      render()
    }))
    root.querySelector('[data-google]')?.addEventListener('click', () => { void run(signInGoogle) })
    root.querySelector('form')!.addEventListener('submit', event => {
      event.preventDefault()
      const email = root.querySelector<HTMLInputElement>('[name=email]')!.value.trim()
      const field = root.querySelector<HTMLInputElement>('[name=password]')
      const password = field?.value || ''
      if (field) field.value = ''
      const operation = mode
      void run(async () => {
        if (operation === 'signin') await signIn(email, password)
        else if (operation === 'signup') await signUp(email, password)
        else await requestPasswordReset(email)
      }, operation === 'signin' ? '' : 'Dacă solicitarea este eligibilă, vei primi un email. Deschide linkul în același browser; verifică și Spam.')
    })
  }
  render()
  const unsubscribe = watchSession((next, event) => {
    session = next
    if (next?.user.id !== lastUser || event === 'INITIAL_SESSION' || event === 'PASSWORD_RECOVERY' || event === 'SIGNED_OUT') {
      lastUser = next?.user.id
      render()
      options.onSession?.(next)
    }
  })
  return () => { disposed = true; generation++; unsubscribe(); root.replaceChildren() }
}
