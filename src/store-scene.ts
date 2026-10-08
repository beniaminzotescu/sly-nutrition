import * as THREE from 'three'

type SceneProduct = { id: string; name: string; color: string; number: string; x: number }
type SceneOptions = {
  mount: HTMLElement
  products: SceneProduct[]
  inspect: (id: string) => void
  availability: (available: boolean) => void
}

const palettes: Record<string, { background: string; ink: string }> = {
  cocoa: { background: '#eee1cc', ink: '#68402f' },
  vanilla: { background: '#e8edbf', ink: '#546837' },
  hazelnut: { background: '#e5c399', ink: '#805132' },
}

export class StoreScene {
  private readonly options: SceneOptions
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  private readonly renderer: THREE.WebGLRenderer
  private readonly shopper = new THREE.Group()
  private readonly avatar = new THREE.Group()
  private readonly legs: THREE.Group[] = []
  private readonly basketContents = new THREE.Group()
  private readonly shelfTargets: THREE.Object3D[] = []
  private readonly shelfHighlights = new Map<string, THREE.Mesh>()
  private readonly packMaterials = new Map<string, THREE.MeshStandardMaterial>()
  private readonly packGeometry = new THREE.BoxGeometry(0.29, 0.61, 0.13)
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly counter: THREE.Sprite
  private readonly resources: Array<{ dispose: () => void }> = []
  private readonly resizeObserver: ResizeObserver
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  private dirty = true
  private available = true
  private yaw = 0.32
  private heading = 0
  private lastX = NaN
  private lastY = NaN
  private wasWalking = false
  private lastHighlight: string | undefined
  private cartCount = 0

  constructor(options: SceneOptions) {
    this.options = options
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
    this.renderer.setClearColor('#dce3c8')
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.45
    this.renderer.domElement.setAttribute('aria-hidden', 'true')
    this.renderer.domElement.dataset.renderer = 'three-webgl'
    options.mount.append(this.renderer.domElement)
    this.renderer.domElement.addEventListener('pointerup', this.selectShelf)
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost)
    this.renderer.domElement.addEventListener('webglcontextrestored', this.contextRestored)

    this.scene.add(new THREE.HemisphereLight('#fff9e7', '#8c9c70', 2.2))
    const sun = new THREE.DirectionalLight('#fff5d9', 4)
    sun.position.set(-3, 10, 7)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -10
    sun.shadow.camera.right = 10
    sun.shadow.camera.top = 9
    sun.shadow.camera.bottom = -9
    sun.shadow.normalBias = 0.04
    sun.shadow.bias = -0.0001
    sun.shadow.radius = 3
    this.scene.add(sun)
    const fill = new THREE.DirectionalLight('#e2efca', 1.1)
    fill.position.set(8, 5, -4)
    this.scene.add(fill)

    this.buildRoom()
    options.products.forEach(product => this.buildShelf(product))
    this.buildShopper()
    this.scene.add(this.shopper)
    this.counter = this.textSprite('0', '#234b3b', '#f7f9e9', 0.42, 0.28)
    this.counter.position.set(0.42, 1.1, -0.19)
    this.counter.visible = false
    this.shopper.add(this.counter)
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(options.mount)
    this.reducedMotion.addEventListener('change', this.invalidate)
    this.resize()
    options.availability(true)
  }

  private material(color: string, metalness = 0) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness })
    this.resources.push(material)
    return material
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    this.resources.push(geometry)
    return mesh
  }

  private box(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material) {
    return this.mesh(new THREE.BoxGeometry(...size), material, parent, ...position)
  }

  private texture(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D indisponibil pentru etichete.')
    draw(context)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 4)
    this.resources.push(texture)
    return texture
  }

  private sign(parent: THREE.Object3D, width: number, height: number, position: [number, number, number], draw: (context: CanvasRenderingContext2D) => void) {
    const texture = this.texture(1024, 256, draw)
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    this.resources.push(material)
    return this.mesh(new THREE.PlaneGeometry(width, height), material, parent, ...position)
  }

  private textSprite(text: string, background: string, color: string, width: number, height: number) {
    const texture = this.texture(256, 128, context => {
      context.fillStyle = background
      context.beginPath()
      context.roundRect(0, 0, 256, 128, 45)
      context.fill()
      context.fillStyle = color
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.font = 'bold 72px system-ui'
      context.fillText(text, 128, 66)
    })
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
    this.resources.push(material)
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(width, height, 1)
    return sprite
  }

  private buildRoom() {
    const cream = this.material('#e9e6cd')
    const green = this.material('#294b37')
    const trim = this.material('#173f2f')
    this.box(this.scene, [12.5, 0.32, 7.35], [0, -0.22, 0.01], this.material('#9fae88'))
    this.box(this.scene, [12.25, 0.1, 7.15], [0, -0.02, 0.01], cream)
    const tileGeometry = new THREE.BoxGeometry(0.995, 0.014, 0.885)
    const tileMaterial = this.material('#d4dcbd')
    const tiles = new THREE.InstancedMesh(tileGeometry, tileMaterial, 96)
    const matrix = new THREE.Matrix4()
    let index = 0
    for (let column = 0; column < 12; column++) {
      for (let row = 0; row < 8; row++) {
        matrix.makeTranslation(column - 5.5, 0.039, row * 0.89 - 3.12)
        tiles.setMatrixAt(index, matrix)
        tiles.setColorAt(index++, new THREE.Color((column + row) % 2 ? '#e9e7ce' : '#dce2c3'))
      }
    }
    tiles.receiveShadow = true
    this.resources.push(tileGeometry, tiles)
    this.scene.add(tiles)
    this.box(this.scene, [12.4, 3, 0.18], [0, 1.5, -3.52], green)
    this.box(this.scene, [12.48, 0.1, 0.29], [0, 3.03, -3.52], trim)
    this.box(this.scene, [12.3, 0.16, 0.12], [0, 0.13, -3.36], trim)
    this.box(this.scene, [0.16, 2.2, 1.7], [-6.14, 1.1, -2.71], green)
    this.box(this.scene, [0.16, 0.32, 5.3], [-6.14, 0.16, 0.8], cream)
    this.box(this.scene, [0.16, 0.32, 7], [6.14, 0.16, -0.05], cream)
    for (let i = 0; i < 20; i++) this.box(this.scene, [0.027, 2.85, 0.025], [i * 0.61 - 5.8, 1.53, -3.414], this.material('#3f6144'))
    this.sign(this.scene, 3.2, 0.8, [-3.75, 2.04, -3.38], context => {
      context.fillStyle = '#eef3d9'
      context.font = '900 205px system-ui'
      context.fillText('sly', 40, 187)
      context.font = '22px system-ui'
      context.fillText('T H E  L I T T L E  S T O R E', 382, 135)
    })
    this.sign(this.scene, 4.3, 1.075, [0.7, 2.05, -3.38], context => {
      context.fillStyle = '#f1f2db'
      context.font = '58px system-ui'
      context.fillText('O pauză mică.', 70, 100)
      context.fillStyle = '#cbdba7'
      context.font = 'italic 63px Georgia'
      context.fillText('O lume de descoperit.', 70, 185)
    })
    this.sign(this.scene, 0.9, 0.9, [4.75, 2, -3.38], context => {
      context.fillStyle = '#cbdda4'
      context.textAlign = 'center'
      context.font = '240px Georgia'
      context.fillText('✳', 512, 215)
    })
    this.box(this.scene, [2.4, 0.027, 0.8], [0, 0.057, 2.94], this.material('#426348'))
    const entrance = this.sign(this.scene, 2.15, 0.53, [0, 0.075, 2.94], context => {
      context.fillStyle = '#ecf1d5'
      context.textAlign = 'center'
      context.font = '40px system-ui'
      context.fillText('↑   I N T R A R E   ↑', 512, 145)
    })
    entrance.rotation.x = -Math.PI / 2
    const rug = this.sign(this.scene, 2.6, 0.65, [0, 0.057, 1.57], context => {
      context.strokeStyle = '#9aa984'
      context.lineWidth = 3
      context.beginPath()
      context.ellipse(512, 128, 485, 117, 0, 0, Math.PI * 2)
      context.stroke()
      context.fillStyle = '#879773'
      context.textAlign = 'center'
      context.font = '36px system-ui'
      context.fillText('S T A Y  C U R I O U S   ↗', 512, 143)
    })
    rug.rotation.x = -Math.PI / 2
    this.buildPlant(-5.5, -2.7)
    this.buildPlant(5.55, -2.7)
  }

  private buildPlant(x: number, z: number) {
    const plant = new THREE.Group()
    plant.position.set(x, 0, z)
    this.scene.add(plant)
    this.mesh(new THREE.CylinderGeometry(0.3, 0.23, 0.46, 12), this.material('#c5a578'), plant, 0, 0.25, 0)
    const leafMaterial = this.material('#6b8b4c')
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * Math.PI * 2
      const leaf = this.mesh(new THREE.SphereGeometry(0.22, 8, 6), leafMaterial, plant, Math.cos(angle) * 0.18, 0.85 + i % 2 * 0.18, Math.sin(angle) * 0.18)
      leaf.scale.set(0.7, 2.4, 0.3)
      leaf.rotation.z = Math.cos(angle) * 0.48
      leaf.rotation.x = Math.sin(angle) * 0.48
    }
  }

  private buildShelf(product: SceneProduct) {
    const shelf = new THREE.Group()
    shelf.position.set((product.x + 82.5 - 480) / 80, 0, (285 - 350) / 80)
    shelf.userData.productId = product.id
    this.scene.add(shelf)
    this.shelfTargets.push(shelf)
    const cream = this.material('#eae3ca')
    const edge = this.material('#f6efd8')
    const green = this.material('#788867')
    this.box(shelf, [2.06, 0.18, 2], [0, 0.16, 0], green)
    this.box(shelf, [2.02, 0.12, 1.97], [0, 0.31, 0], cream)
    this.box(shelf, [2.02, 0.11, 1.97], [0, 1.09, 0], edge)
    this.box(shelf, [2.02, 0.1, 0.1], [0, 1.93, -0.89], edge)
    this.box(shelf, [1.94, 1.5, 0.08], [0, 1.1, -0.85], cream)
    for (const side of [-0.98, 0.98]) this.box(shelf, [0.08, 1.76, 1.96], [side, 1.08, 0], edge)
    const palette = palettes[product.color]!
    const texture = this.texture(256, 512, context => {
      context.fillStyle = palette.background
      context.fillRect(0, 0, 256, 512)
      context.fillStyle = palette.ink
      context.textAlign = 'center'
      context.font = '900 115px system-ui'
      context.fillText('sly', 119, 143)
      context.font = '20px system-ui'
      context.fillText('N U T R I T I O N', 128, 180)
      context.font = 'bold 27px system-ui'
      context.fillText(product.name.toUpperCase(), 128, 261)
      context.font = '16px system-ui'
      context.fillText('CONCEPT · DEMO', 128, 470)
      context.save()
      context.translate(128, 357)
      context.rotate(-0.16)
      for (let i = 0; i < 6; i++) {
        context.fillStyle = i % 2 ? '#81532f' : '#d6a365'
        context.fillRect(-75, -27 + i * 11, 150, 11)
      }
      context.restore()
      context.fillStyle = '#94765455'
      for (let i = 0; i < 256; i += 8) {
        context.fillRect(i, 0, 3, 16)
        context.fillRect(i, 493, 3, 19)
      }
    })
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55 })
    this.resources.push(material)
    this.packMaterials.set(product.id, material)
    for (let level = 0; level < 2; level++) {
      for (let row = 0; row < 2; row++) {
        for (let column = 0; column < 5; column++) {
          const pack = new THREE.Mesh(this.packGeometry, material)
          pack.position.set((column - 2) * 0.36, 0.69 + level * 0.78, 0.58 - row * 0.7)
          pack.rotation.x = -0.1
          pack.rotation.z = (column % 2 ? 1 : -1) * 0.025
          pack.castShadow = true
          shelf.add(pack)
        }
      }
    }
    this.box(shelf, [1.88, 0.46, 0.1], [0, 2.05, -0.83], this.material(palette.background))
    this.sign(shelf, 1.8, 0.45, [0, 2.05, -0.77], context => {
      context.fillStyle = palette.ink
      context.font = '25px system-ui'
      context.fillText(`${product.number} / NAPOLITANE`, 45, 55)
      context.font = '116px Georgia'
      context.fillText(product.name, 45, 168)
      context.font = '25px system-ui'
      context.fillText('AMBALAJ CONCEPT · DEMO', 45, 219)
      context.font = '60px system-ui'
      context.fillText('↗', 877, 150)
    })
    for (const height of [0.32, 1.09]) {
      this.sign(shelf, 1.91, 0.14, [0, height, 1.007], context => {
        context.fillStyle = '#f7f2dc'
        context.fillRect(0, 0, 1024, 256)
        context.fillStyle = '#556548'
        context.font = '70px system-ui'
        context.fillText('SLY / ' + product.name.toUpperCase(), 33, 158)
        context.fillText('DEMO', 742, 158)
      })
    }
    const haloMaterial = new THREE.MeshBasicMaterial({ color: '#b4d17e', transparent: true, opacity: 0.48, depthWrite: false })
    this.resources.push(haloMaterial)
    const halo = this.mesh(new THREE.PlaneGeometry(2.25, 2.18), haloMaterial, this.scene, shelf.position.x, 0.055, shelf.position.z)
    halo.rotation.x = -Math.PI / 2
    halo.visible = false
    this.shelfHighlights.set(product.id, halo)
  }

  private buildShopper() {
    this.avatar.position.set(-0.18, 0, 0.07)
    this.shopper.add(this.avatar)
    const skin = this.material('#e3aa7c')
    const shirt = this.material('#dc8650')
    const trousers = this.material('#35594c')
    const shoes = this.material('#f4eddb')
    const hair = this.material('#4a382b')
    for (const side of [-1, 1]) {
      const leg = new THREE.Group()
      leg.position.set(side * 0.092, 0.35, 0)
      this.avatar.add(leg)
      this.mesh(new THREE.CapsuleGeometry(0.072, 0.19, 4, 8), trousers, leg, 0, -0.12, 0)
      this.box(leg, [0.14, 0.085, 0.24], [0, -0.29, -0.035], shoes)
      this.legs.push(leg)
    }
    this.mesh(new THREE.CapsuleGeometry(0.18, 0.25, 4, 12), shirt, this.avatar, 0, 0.63, 0)
    this.mesh(new THREE.SphereGeometry(0.195, 16, 12), skin, this.avatar, 0, 1.04, 0)
    const hairMesh = this.mesh(new THREE.SphereGeometry(0.203, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), hair, this.avatar, 0, 1.083, 0)
    hairMesh.rotation.z = 0.1
    const eyes = this.material('#47382c')
    for (const side of [-1, 1]) this.mesh(new THREE.SphereGeometry(0.017, 6, 4), eyes, this.avatar, side * 0.067, 1.043, -0.178)
    for (const side of [-1, 1]) {
      const arm = this.mesh(new THREE.CapsuleGeometry(0.065, 0.21, 4, 8), shirt, this.avatar, side * 0.2, 0.7, -0.05)
      arm.rotation.x = -0.85
      this.mesh(new THREE.SphereGeometry(0.07, 8, 6), skin, this.avatar, side * 0.2, 0.59, -0.18)
    }
    const trolley = new THREE.Group()
    trolley.position.set(0.23, 0, -0.2)
    this.shopper.add(trolley)
    const metal = this.material('#8daca0', 0.35)
    const handle = this.material('#35594b')
    const tyre = this.material('#354439')
    this.box(trolley, [0.43, 0.025, 0.5], [0, 0.37, 0], metal)
    for (const z of [-0.25, 0.25]) {
      for (const height of [0.39, 0.54, 0.71]) this.box(trolley, [0.46, 0.022, 0.022], [0, height, z], metal)
      for (let i = 0; i < 5; i++) this.box(trolley, [0.013, 0.34, 0.015], [i * 0.1 - 0.2, 0.55, z], metal)
    }
    for (const side of [-0.22, 0.22]) {
      for (const height of [0.39, 0.54, 0.71]) this.box(trolley, [0.018, 0.022, 0.51], [side, height, 0], metal)
      for (let i = 0; i < 6; i++) this.box(trolley, [0.015, 0.34, 0.015], [side, 0.55, i * 0.1 - 0.25], metal)
      this.box(trolley, [0.022, 0.43, 0.025], [side, 0.5, 0.3], metal)
      for (const z of [-0.19, 0.2]) {
        const wheel = this.mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.043, 10), tyre, trolley, side, 0.12, z)
        wheel.rotation.z = Math.PI / 2
        this.box(trolley, [0.024, 0.2, 0.024], [side, 0.25, z], metal)
      }
    }
    this.box(trolley, [0.49, 0.045, 0.05], [0, 0.73, 0.32], handle)
    trolley.add(this.basketContents)
    const marker = this.textSprite('TU', '#f3f5df', '#46623d', 0.32, 0.17)
    marker.position.set(-0.18, 1.47, 0.07)
    this.shopper.add(marker)
  }

  private resize = () => {
    const { clientWidth: width, clientHeight: height } = this.options.mount
    if (!width || !height) return
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.positionCamera()
    this.dirty = true
  }

  private positionCamera() {
    const distance = this.camera.aspect < 1.25 ? 20 : 17.7
    this.camera.zoom = 1
    this.camera.updateProjectionMatrix()
    this.camera.position.set(Math.sin(this.yaw) * distance, 13.1, Math.cos(this.yaw) * distance)
    this.camera.lookAt(0, 0.52, -0.28)
    this.camera.updateMatrixWorld()
    let extent = 0
    for (const x of [-6.3, 6.3]) {
      for (const y of [0, 3.2]) {
        for (const z of [-3.7, 3.7]) {
          const point = new THREE.Vector3(x, y, z).project(this.camera)
          extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y))
        }
      }
    }
    this.camera.zoom = 0.94 / extent
    this.camera.updateProjectionMatrix()
  }

  rotate(direction: number) {
    this.yaw = THREE.MathUtils.clamp(this.yaw + direction * 0.16, -0.48, 0.48)
    this.positionCamera()
    this.dirty = true
  }

  movement(dx: number, dy: number) {
    return { dx: dx * Math.cos(this.yaw) + dy * Math.sin(this.yaw), dy: -dx * Math.sin(this.yaw) + dy * Math.cos(this.yaw) }
  }

  update(x: number, y: number, walking: boolean, dx: number, dy: number, time: number, nearby?: string) {
    if (!this.available) return
    if (x !== this.lastX || y !== this.lastY) {
      this.shopper.position.set((x - 480) / 80, 0.07, (y - 350) / 80)
      this.lastX = x
      this.lastY = y
      this.dirty = true
    }
    if (walking && (dx || dy)) {
      this.heading = Math.atan2(-dx, -dy)
      this.shopper.rotation.y = this.heading
    }
    const stride = walking && !this.reducedMotion.matches ? Math.sin(time / 95) * 0.36 : 0
    this.legs.forEach((leg, i) => leg.rotation.x = stride * (i ? -1 : 1))
    this.avatar.position.y = walking && !this.reducedMotion.matches ? Math.abs(Math.sin(time / 95)) * 0.025 : 0
    if (nearby !== this.lastHighlight) {
      this.shelfHighlights.forEach((halo, id) => halo.visible = id === nearby)
      this.lastHighlight = nearby
      this.dirty = true
    }
    if (this.dirty || walking || this.wasWalking) {
      this.renderer.render(this.scene, this.camera)
      this.options.mount.dataset.triangles = String(this.renderer.info.render.triangles)
      this.options.mount.dataset.cartPacks = String(Math.min(this.cartCount, 6))
      this.dirty = false
    }
    this.wasWalking = walking
  }

  setCart(products: SceneProduct[], count: number) {
    this.basketContents.clear()
    products.slice(0, 6).forEach((product, i) => {
      const pack = new THREE.Mesh(this.packGeometry, this.packMaterials.get(product.id)!)
      pack.scale.setScalar(0.54)
      pack.position.set((i % 2 - 0.5) * 0.18, 0.54 + Math.floor(i / 4) * 0.04, (Math.floor(i / 2) % 3 - 1) * 0.13)
      pack.rotation.z = (i % 2 ? 1 : -1) * 0.14
      pack.castShadow = true
      this.basketContents.add(pack)
    })
    this.cartCount = count
    const oldMap = this.counter.material.map
    const oldMaterial = this.counter.material
    const sprite = this.textSprite(count > 6 ? `+${count - 6}` : String(count), '#234b3b', '#f7f9e9', 0.42, 0.28)
    this.counter.material = sprite.material
    oldMap?.dispose()
    oldMaterial.dispose()
    for (const resource of [oldMap, oldMaterial]) {
      const index = this.resources.indexOf(resource!)
      if (index !== -1) this.resources.splice(index, 1)
    }
    this.counter.visible = count > 0
    this.dirty = true
  }

  private selectShelf = (event: PointerEvent) => {
    if (event.button !== 0) return
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = this.raycaster.intersectObjects(this.shelfTargets, true)[0]
    if (!hit) return
    let object: THREE.Object3D | null = hit.object
    while (object && !object.userData.productId) object = object.parent
    if (object?.userData.productId) this.options.inspect(object.userData.productId as string)
  }

  private invalidate = () => { this.dirty = true }

  private contextLost = (event: Event) => {
    event.preventDefault()
    this.available = false
    this.options.availability(false)
  }

  private contextRestored = () => {
    this.available = true
    this.dirty = true
    this.options.availability(true)
  }

  dispose() {
    this.resizeObserver.disconnect()
    this.reducedMotion.removeEventListener('change', this.invalidate)
    this.renderer.domElement.removeEventListener('pointerup', this.selectShelf)
    this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost)
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.contextRestored)
    this.packGeometry.dispose()
    this.resources.forEach(resource => resource.dispose())
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
