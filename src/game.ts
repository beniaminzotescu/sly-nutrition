import { StoreScene } from './store-scene'
import { departments, demoCatalog, retailerCatalog, type Department, type Product } from './catalog'
import { canTraverse, roomBottom as layoutBottom } from './catalog-layout'

export function createGame(inspect: (department: Department) => void, isModalOpen: () => boolean) {
  let activeDepartments = [...departments]
  let activeProducts: Product[] = [...demoCatalog, ...retailerCatalog]
  const roomBottom = () => layoutBottom(activeDepartments)
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
  let overview = false
  const viewButton = document.createElement('button')
  viewButton.type = 'button'
  viewButton.disabled = true
  viewButton.className = 'view-toggle'
  viewButton.dataset.viewToggle = ''
  viewButton.textContent = 'Hartă de ansamblu'
  viewButton.setAttribute('aria-label', 'Hartă de ansamblu: schimbă din camera de urmărire')
  viewButton.setAttribute('aria-pressed', 'false')
  document.querySelector('.camera-controls')!.prepend(viewButton)
  document.querySelector('#movement-help')!.innerHTML = '<kbd>W A S D</kbd> / săgeți: mers relativ la cameră · <kbd>E</kbd>: raft<br><kbd>V</kbd>: urmărire / ansamblu · <kbd>Q</kbd> / <kbd>R</kbd>: rotește. Sau acces direct mai jos.'
  world.setAttribute('aria-label', 'Magazin 3D. Mers relativ la cameră cu WASD sau săgeți. V schimbă vederea; Q și R rotesc; E explorează raftul apropiat.')
  function updateViewButton() {
    viewButton.textContent = overview ? 'Înapoi la urmărire' : 'Hartă de ansamblu'
    viewButton.setAttribute('aria-label', overview ? 'Înapoi la camera de urmărire' : 'Hartă de ansamblu: schimbă din camera de urmărire')
    viewButton.setAttribute('aria-pressed', String(overview))
  }
  function toggleView() {
    if (!entered || isModalOpen() || !threeAvailable) return
    clearMovement()
    overview = !overview
    storeScene?.setOverview(overview)
    updateViewButton()
  }
  viewButton.addEventListener('click', toggleView)

  function clearMovement() {
    heldKeys.clear()
    pointerDirections.clear()
    accumulator = 0
    player.classList.remove('walking')
  }
  function setControls() {
    document.querySelectorAll<HTMLButtonElement>('[data-department], [data-demo], [data-direction]').forEach(button => button.disabled = !entered)
    document.querySelectorAll<HTMLButtonElement>('[data-camera], [data-view-toggle]').forEach(button => button.disabled = !entered || !threeAvailable)
    nearbyButton.disabled = !entered || !nearby
    world.tabIndex = entered ? 0 : -1
  }
  function buildScene() {
  try {
    storeScene = new StoreScene({
      mount: document.querySelector<HTMLElement>('#scene-mount')!,
      departments: activeDepartments,
      products: activeProducts,
      inspect: id => {
        if (!entered || isModalOpen() || !threeAvailable) return
        const department = activeDepartments.find(item => item.id === id)
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
  }
  buildScene()
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
    const viewport = document.querySelector<HTMLElement>('.scene-viewport')!
    world.style.height = `${roomBottom() + 52}px`
    world.style.transform = `scale(${Math.min(viewport.clientWidth / 960, viewport.clientHeight / (roomBottom() + 52))})`
  }
  new ResizeObserver(resizeWorld).observe(document.querySelector('.scene-viewport')!)
  resizeWorld()

  function renderPlayer() {
    player.style.left = `${x}px`
    player.style.top = `${y}px`
    player.style.zIndex = y < 355 ? '2' : '4'
    nearby = activeDepartments.find(department => {
      const dx = Math.max(department.x - x, 0, x - (department.x + 165))
      const dy = Math.max((department.y ?? 205) - y, 0, y - ((department.y ?? 205) + 160))
      return Math.hypot(dx, dy) < 105
    })
    const available = activeProducts.some(product => product.department === nearby?.id)
    const message = nearby ? `Departament ${nearby.name} · ${available ? 'explorează selecția' : 'produse în curând'}.` : 'În ritmul tău. Alege un departament.'
    if (location.textContent !== message) location.textContent = message
    nearbyButton.disabled = !nearby || !entered
    nearbyButton.textContent = nearby ? `Explorează ${nearby.name} ↗` : 'Apropie-te de un raft'
    document.querySelectorAll<HTMLElement>('.shelf').forEach(shelf => shelf.classList.toggle('nearby', shelf.dataset.department === nearby?.id))
  }
  function canMove(nextX: number, nextY: number) {
    return canTraverse(activeDepartments, nextX, nextY)
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
    if (!document.hidden) storeScene?.update(x, y, moving, dx, dy, time, entered ? nearby?.id : undefined, !entered || isModalOpen())
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
    } else if (key === 'v' && !event.repeat) {
      event.preventDefault()
      toggleView()
    } else if ((key === 'q' || key === 'r') && !event.repeat && threeAvailable) {
      event.preventDefault()
      clearMovement()
      storeScene?.rotate(key === 'q' ? -1 : 1)
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
    if (entered && nearby && !isModalOpen()) { clearMovement(); inspect(nearby) }
  })
  return {
    setCatalog(nextDepartments: Department[], nextProducts: Product[]) {
      clearMovement()
      activeDepartments = nextDepartments
      activeProducts = nextProducts
      storeScene?.dispose()
      storeScene = undefined
      threeAvailable = false
      overview = false
      x = 470
      y = roomBottom() - 43
      buildScene()
      updateViewButton()
      renderPlayer()
      setControls()
      resizeWorld()
    },
    setAvatarColor(color: string) {
      storeScene?.setAvatarColor(color)
      document.querySelector<HTMLElement>('.avatar-body')!.style.backgroundColor = ({ clay: '#db8c51', leaf: '#83a36a', milk: '#cfdfed', grain: '#cdb071' } as Record<string, string>)[color] ?? '#db8c51'
    },
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
      y = roomBottom() - 43
      overview = false
      storeScene?.resetCamera()
      updateViewButton()
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
