import { StoreScene } from './store-scene'
import { departments, demoCatalog, retailerCatalog, type Department, type Product } from './catalog'

export function createGame(inspect: (department: Department) => void, isModalOpen: () => boolean) {
  const world = document.querySelector<HTMLDivElement>('#store-world')!
  const player = document.querySelector<HTMLDivElement>('#player')!
  const nearbyButton = document.querySelector<HTMLButtonElement>('#inspect-nearby')!
  const location = document.querySelector<HTMLElement>('#location')!
  const heldKeys = new Set<string>()
  const pointerDirections = new Map<number, string>()
  const keyDirections: Record<string, string> = { w: 'up', arrowup: 'up', a: 'left', arrowleft: 'left', s: 'down', arrowdown: 'down', d: 'right', arrowright: 'right' }
  let entered = false
  let nearby: Department | undefined
  let x = 470
  let y = 525
  let lastTime = 0
  let accumulator = 0
  let storeScene: StoreScene | undefined
  let threeAvailable = false

  function clearMovement() {
    heldKeys.clear()
    pointerDirections.clear()
    accumulator = 0
    player.classList.remove('walking')
  }
  function setControls() {
    document.querySelectorAll<HTMLButtonElement>('[data-department], [data-demo], [data-direction]').forEach(button => button.disabled = !entered)
    document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(button => button.disabled = !entered || !threeAvailable)
    nearbyButton.disabled = !entered || !nearby
    world.tabIndex = entered ? 0 : -1
  }
  try {
    storeScene = new StoreScene({
      mount: document.querySelector<HTMLElement>('#scene-mount')!,
      departments,
      products: [...demoCatalog, ...retailerCatalog],
      inspect: id => {
        if (!entered || isModalOpen()) return
        const department = departments.find(item => item.id === id)
        world.focus({ preventScroll: true })
        clearMovement()
        if (department) inspect(department)
      },
      availability: available => {
        threeAvailable = available
        document.querySelector('.scene-viewport')!.classList.toggle('has-webgl', available)
        document.querySelector<HTMLElement>('#scene-mount')!.hidden = !available
        document.querySelector<HTMLElement>('#webgl-notice')!.hidden = available
        setControls()
        clearMovement()
      },
    })
  } catch {
    document.querySelector<HTMLElement>('#scene-mount')!.hidden = true
    document.querySelector<HTMLElement>('#webgl-notice')!.hidden = false
  }
  document.querySelector('#scene-mount')!.addEventListener('pointerdown', () => {
    if (entered && !isModalOpen()) world.focus({ preventScroll: true })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(button => button.addEventListener('click', () => {
    if (!entered || isModalOpen()) return
    clearMovement()
    storeScene?.rotate(Number(button.dataset.camera))
    world.focus({ preventScroll: true })
  }))
  if (import.meta.hot) import.meta.hot.dispose(() => storeScene?.dispose())
  function resizeWorld() {
    world.style.transform = `scale(${document.querySelector<HTMLElement>('.scene-viewport')!.clientWidth / 960})`
  }
  new ResizeObserver(resizeWorld).observe(document.querySelector('.scene-viewport')!)
  resizeWorld()

  function renderPlayer() {
    player.style.left = `${x}px`
    player.style.top = `${y}px`
    player.style.zIndex = y < 355 ? '2' : '4'
    nearby = departments.find(department => {
      const dx = Math.max(department.x - x, 0, x - (department.x + 165))
      const dy = Math.max(205 - y, 0, y - 365)
      return Math.hypot(dx, dy) < 105
    })
    const available = retailerCatalog.some(product => product.department === nearby?.id)
    const message = nearby ? `Departament ${nearby.name} · ${available ? 'explorează selecția' : 'produse în curând'}.` : 'În ritmul tău. Alege un departament.'
    if (location.textContent !== message) location.textContent = message
    nearbyButton.disabled = !nearby || !entered
    nearbyButton.textContent = nearby ? `Explorează ${nearby.name} ↗` : 'Apropie-te de un raft'
    document.querySelectorAll<HTMLElement>('.shelf').forEach(shelf => shelf.classList.toggle('nearby', shelf.dataset.department === nearby?.id))
  }
  // The footprint includes avatar and trolley, regardless of their heading.
  function canMove(nextX: number, nextY: number) {
    if (nextX < 45 || nextX > 915 || nextY < 132 || nextY > 568) return false
    return !departments.some(department => nextX + 53 > department.x && nextX - 53 < department.x + 165 && nextY + 53 > 205 && nextY - 53 < 365)
  }
  function tick(time: number) {
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0
    lastTime = time
    const directions = new Set([...heldKeys].map(key => keyDirections[key]).concat([...pointerDirections.values()]))
    let dx = Number(directions.has('right')) - Number(directions.has('left'))
    let dy = Number(directions.has('down')) - Number(directions.has('up'))
    if (threeAvailable && storeScene) ({ dx, dy } = storeScene.movement(dx, dy))
    const moving = entered && !isModalOpen() && !document.hidden && (dx !== 0 || dy !== 0)
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
    } else accumulator = 0
    if (!document.hidden) storeScene?.update(x, y, moving, dx, dy, time, entered ? nearby?.id : undefined)
    requestAnimationFrame(tick)
  }
  renderPlayer()
  requestAnimationFrame(tick)
  function isInteractive(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest('input, textarea, select, button, a, summary, [contenteditable], [role="button"], [role="slider"]'))
  }
  window.addEventListener('keydown', event => {
    if (!entered || isModalOpen() || event.altKey || event.ctrlKey || event.metaKey || isInteractive(event.target)) return
    const key = event.key.toLowerCase()
    if (keyDirections[key]) {
      event.preventDefault()
      heldKeys.add(key)
    } else if (key === 'e' && nearby && !event.repeat) {
      event.preventDefault()
      clearMovement()
      inspect(nearby)
    }
  })
  window.addEventListener('keyup', event => heldKeys.delete(event.key.toLowerCase()))
  window.addEventListener('blur', clearMovement)
  document.addEventListener('visibilitychange', () => { clearMovement(); lastTime = 0 })
  document.addEventListener('focusin', event => { if (isInteractive(event.target)) clearMovement() })
  document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button => {
    button.addEventListener('pointerdown', event => {
      if (!entered || isModalOpen()) return
      event.preventDefault()
      world.focus({ preventScroll: true })
      button.setPointerCapture(event.pointerId)
      pointerDirections.set(event.pointerId, button.dataset.direction!)
    })
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(name, event => pointerDirections.delete((event as PointerEvent).pointerId))
    }
    button.addEventListener('click', event => {
      if (event.detail !== 0 || !entered || isModalOpen()) return
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
  nearbyButton.addEventListener('click', () => {
    if (entered && nearby) { clearMovement(); inspect(nearby) }
  })
  return {
    enter() {
      entered = true
      setControls()
      resizeWorld()
      renderPlayer()
      world.focus({ preventScroll: true })
    },
    reset() {
      entered = false
      clearMovement()
      x = 470
      y = 525
      renderPlayer()
      setControls()
    },
    clearMovement,
    setCart(products: Product[], count: number) {
      storeScene?.setCart(products, count)
      document.querySelector('#trolley-packs')!.innerHTML = products.map(product => `<span class="mini-pack ${product.color}" aria-hidden="true">✳</span>`).join('')
      const counter = document.querySelector<HTMLElement>('#trolley-count')!
      counter.hidden = count === 0
      counter.textContent = count > 6 ? `+${count - 6}` : String(count)
      player.dataset.cartCount = String(count)
    },
  }
}
