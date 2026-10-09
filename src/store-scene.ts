import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

type SceneDepartment = { id: string; name: string; color: string; number: string; x: number; y?: number }
type SceneProduct = { id: string; name: string; color: string; department: string; imageUrl?: string; shape?: 'box' | 'can' | 'bottle' | 'tray' | 'wafer' | 'pasta' }
type SceneOptions = {
  mount: HTMLElement
  departments: SceneDepartment[]
  products: SceneProduct[]
  inspect: (id: string) => void
  availability: (available: boolean) => void
}

const palettes: Record<string, { background: string; ink: string }> = {
  grain: { background: '#eee1cc', ink: '#68402f' },
  leaf: { background: '#e8edbf', ink: '#546837' },
  clay: { background: '#e5c399', ink: '#805132' },
  milk: { background: '#eef0e6', ink: '#3f6158' },
}
const packageShapes: Record<string, NonNullable<SceneProduct['shape']>> = {
  'golfera-turkey': 'tray',
  'reggia-tortellini': 'pasta',
  'cola-zero-caffeine': 'can',
  'cola-zero-sugar': 'can',
  'lidl-olive-oil': 'bottle',
  'sly-cocoa-wafer': 'wafer',
  'sly-vanilla-wafer': 'wafer',
  lentils: 'can',
  yogurt: 'can',
  vegetables: 'tray',
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
  private readonly packageGeometries = new Map<string, THREE.BufferGeometry>()
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly counter: THREE.Sprite
  private readonly resources: Array<{ dispose: () => void }> = []
  private readonly resizeObserver: ResizeObserver
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  private dirty = true
  private available = true
  private yaw = 0.24
  private overview = false
  private readonly cameraGoal = new THREE.Vector3()
  private readonly lookGoal = new THREE.Vector3()
  private readonly cameraLook = new THREE.Vector3()
  private cameraReady = false
  private cameraMoving = false
  private cameraTime = 0
  private heading = 0
  private lastX = NaN
  private lastY = NaN
  private wasWalking = false
  private lastHighlight: string | undefined
  private cartCount = 0
  private shirtMaterial: THREE.MeshStandardMaterial | undefined
  private disposed = false
  private get roomFront() { return Math.max(3.7, ...this.options.departments.map(item => ((item.y ?? 205) + 415 - 350) / 80)) }

  constructor(options: SceneOptions) {
    this.options = options
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
    this.renderer.setClearColor('#101d30')
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.25
    this.renderer.domElement.setAttribute('aria-hidden', 'true')
    this.renderer.domElement.dataset.renderer = 'three-webgl'
    options.mount.append(this.renderer.domElement)
    options.mount.dataset.view = 'follow'
    this.renderer.domElement.addEventListener('pointerup', this.selectShelf)
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost)
    this.renderer.domElement.addEventListener('webglcontextrestored', this.contextRestored)

    this.scene.add(new THREE.HemisphereLight('#cdefff', '#566375', 2.3))
    const sun = new THREE.DirectionalLight('#ffe4c6', 3.2)
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
    const fill = new THREE.DirectionalLight('#80dfff', 1.8)
    fill.position.set(8, 5, -4)
    this.scene.add(fill)

    this.buildRoom()
    this.batchArchitecture()
    options.departments.forEach(department => this.buildShelf(department))
    this.buildShopper()
    this.scene.add(this.shopper)
    this.counter = this.textSprite('0', '#234b3b', '#f7f9e9', 0.42, 0.28)
    this.counter.position.set(0.36, 1.18, -0.28)
    this.counter.visible = false
    this.shopper.add(this.counter)
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(options.mount)
    this.reducedMotion.addEventListener('change', this.invalidate)
    this.resize()
    options.availability(true)
  }

  private material(color: string, metalness = 0) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: metalness ? 0.34 : 0.7, metalness })
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
    const graphite = this.material('#182333', 0.45)
    const metal = this.material('#687f90', 0.7)
    const glow = new THREE.MeshStandardMaterial({ color: '#b6f5ff', emissive: '#49c8e3', emissiveIntensity: 2.4 })
    this.resources.push(glow)
    this.box(this.scene, [12.5, 0.32, 7.35], [0, -0.22, 0.01], graphite)
    this.box(this.scene, [12.25, 0.1, 7.15], [0, -0.02, 0.01], this.material('#506271', 0.3))
    if (this.roomFront > 3.71) {
      const extension = this.roomFront - 3.7
      this.box(this.scene, [12.5, 0.32, extension], [0, -0.22, 3.7 + extension / 2], graphite)
      this.box(this.scene, [12.25, 0.1, extension], [0, -0.02, 3.7 + extension / 2], this.material('#506271', 0.3))
      for (const side of [-6.14, 6.14]) this.box(this.scene, [0.1, 0.3, extension], [side, 0.15, 3.7 + extension / 2], graphite)
    }
    const tileGeometry = new THREE.BoxGeometry(0.985, 0.014, 0.875)
    const tiles = new THREE.InstancedMesh(tileGeometry, this.material('#ffffff', 0.25), 96)
    const matrix = new THREE.Matrix4()
    let index = 0
    for (let column = 0; column < 12; column++) {
      for (let row = 0; row < 8; row++) {
        matrix.makeTranslation(column - 5.5, 0.039, row * 0.89 - 3.12)
        tiles.setMatrixAt(index, matrix)
        tiles.setColorAt(index++, new THREE.Color((column + row) % 2 ? '#536678' : '#4b5e70'))
      }
    }
    tiles.receiveShadow = true
    this.resources.push(tileGeometry, tiles)
    this.scene.add(tiles)
    this.box(this.scene, [12.4, 0.7, 0.18], [0, 0.35, -3.52], graphite)
    const glass = new THREE.MeshPhysicalMaterial({ color: '#7fb9d2', metalness: 0.25, roughness: 0.14, transparent: true, opacity: 0.18, depthWrite: false })
    this.resources.push(glass)
    this.box(this.scene, [12.2, 2.4, 0.06], [0, 1.9, -3.53], glass)
    for (let i = 0; i < 9; i++) this.box(this.scene, [0.055, 3.5, 0.12], [i * 1.53 - 6.12, 1.75, -3.5], metal)
    this.box(this.scene, [12.45, 0.46, 0.24], [0, 3.37, -3.5], graphite)
    this.box(this.scene, [12.2, 0.025, 0.06], [0, 3.1, -3.35], glow)
    this.sign(this.scene, 4.2, 0.42, [0, 3.38, -3.36], context => {
      context.fillStyle = '#d9f8ff'
      context.textAlign = 'center'
      context.font = '600 100px system-ui'
      context.fillText('ATELIER / NIGHT MARKET', 512, 163)
    })
    // Architecture remains outside the same walkable footprint as the 2D fallback.
    for (const side of [-6.14, 6.14]) {
      this.box(this.scene, [0.1, 0.3, 7], [side, 0.15, -0.05], graphite)
      this.box(this.scene, [0.04, 0.02, 6.9], [side, 0.31, -0.05], glow)
      this.box(this.scene, [0.1, 3.2, 0.1], [side, 1.6, 3.35], metal)
    }
    const buildings = this.material('#101c30')
    const windowLight = new THREE.MeshBasicMaterial({ color: '#f0c891' })
    this.resources.push(windowLight)
    for (let i = 0; i < 14; i++) {
      const bx = i * 1.35 - 8.8
      const height = 2.5 + (i * 7 % 5) * 0.65
      this.box(this.scene, [1.08, height, 0.9], [bx, height / 2 - 0.2, -6.8 - i % 3], buildings)
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          if ((i + row + col) % 3 !== 0) this.box(this.scene, [0.08, 0.12, 0.02], [bx + col * 0.26 - 0.26, 0.7 + row * 0.37, -6.33 - i % 3], windowLight)
        }
      }
    }
    for (const department of this.options.departments) {
      const sx = (department.x + 82.5 - 480) / 80
      this.box(this.scene, [1.9, 0.045, 0.16], [sx, 3.85, -0.8], graphite)
      this.box(this.scene, [1.8, 0.018, 0.12], [sx, 3.82, -0.8], glow)
      for (const side of [-0.7, 0.7]) this.box(this.scene, [0.015, 0.55, 0.015], [sx + side, 3.58, -3.4], metal)
      this.box(this.scene, [1.8, 0.008, 0.035], [sx, 0.053, 0.63], glow)
    }
    this.box(this.scene, [2.4, 0.027, 0.8], [0, 0.057, 2.94], graphite)
    const entrance = this.sign(this.scene, 2.15, 0.53, [0, 0.075, 2.94], context => {
      context.fillStyle = '#c6f5ff'
      context.textAlign = 'center'
      context.font = '40px system-ui'
      context.fillText('↑   I N T R A R E   ↑', 512, 145)
    })
    entrance.rotation.x = -Math.PI / 2
  }

  private buildPackMaterial(product: SceneProduct) {
    const palette = palettes[product.color] ?? { background: '#d4e7ef', ink: '#18354b' }
    const texture = this.texture(256, 512, context => {
      context.fillStyle = palette.background
      context.fillRect(0, 0, 256, 512)
      context.fillStyle = palette.ink
      context.textAlign = 'center'
      context.fillRect(18, 30, 220, 12)
      context.font = 'bold 22px system-ui'
      const words = product.name.split(/\s+/)
      const lines: string[] = []
      let line = ''
      for (const word of words) {
        if (context.measureText(`${line} ${word}`.trim()).width > 218 && line) { lines.push(line); line = '' }
        line = `${line} ${word}`.trim()
      }

      if (line) lines.push(line)
      const lineHeight = Math.min(34, 310 / Math.max(lines.length, 1))
      lines.forEach((text, i) => context.fillText(text, 128, 112 + i * lineHeight, 218))
      context.font = '15px system-ui'
      context.fillText('AMBALAJ ILUSTRATIV', 128, 455)
    })
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55 })
    this.resources.push(material)
    this.packMaterials.set(`${product.department}:${product.id}`, material)
    if (product.imageUrl) {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.referrerPolicy = 'no-referrer'
      image.onload = () => {
        if (this.disposed) return
        const photo = this.texture(256, 512, context => {
          context.fillStyle = palette.background
          context.fillRect(0, 0, 256, 512)
          const ratio = Math.min(256 / image.naturalWidth, 512 / image.naturalHeight)
          const width = image.naturalWidth * ratio, height = image.naturalHeight * ratio
          context.drawImage(image, (256 - width) / 2, (512 - height) / 2, width, height)
        })
        material.map = photo
        material.needsUpdate = true
        this.dirty = true
      }
      image.src = product.imageUrl
    }
  }

  private batchArchitecture() {
    const batches = new Map<THREE.Material, THREE.Mesh[]>()
    this.scene.updateMatrixWorld(true)
    for (const object of this.scene.children) {
      if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || Array.isArray(object.material) || object.material.transparent) continue
      const batch = batches.get(object.material) ?? []
      batch.push(object)
      batches.set(object.material, batch)
    }
    for (const [material, meshes] of batches) {
      if (meshes.length < 2) continue
      const geometries = meshes.map(mesh => mesh.geometry.clone().applyMatrix4(mesh.matrixWorld))
      const geometry = mergeGeometries(geometries)
      geometries.forEach(item => item.dispose())
      if (!geometry) continue
      meshes.forEach(mesh => this.scene.remove(mesh))
      this.mesh(geometry, material, this.scene, 0, 0, 0)
    }
  }

  private packageMesh(product: SceneProduct) {
    const shape = product.shape ?? packageShapes[product.id] ?? 'box'
    let geometry = this.packageGeometries.get(shape)
    if (!geometry) {
      if (shape === 'can') geometry = new THREE.CylinderGeometry(0.125, 0.125, 0.32, 16)
      else if (shape === 'bottle') {
        geometry = new THREE.LatheGeometry([new THREE.Vector2(0, -0.27), new THREE.Vector2(0.1, -0.27), new THREE.Vector2(0.105, 0.09), new THREE.Vector2(0.045, 0.18), new THREE.Vector2(0.045, 0.27), new THREE.Vector2(0, 0.27)], 16)
      } else if (shape === 'tray') geometry = new THREE.BoxGeometry(0.32, 0.18, 0.23)
      else if (shape === 'wafer') geometry = new THREE.BoxGeometry(0.28, 0.43, 0.09)
      else if (shape === 'pasta') geometry = new THREE.BoxGeometry(0.24, 0.59, 0.17)
      else geometry = new THREE.BoxGeometry(0.27, 0.46, 0.16)
      this.packageGeometries.set(shape, geometry)
    }
    if (!this.packMaterials.has(`${product.department}:${product.id}`)) this.buildPackMaterial(product)
    const pack = new THREE.Mesh(geometry, this.packMaterials.get(`${product.department}:${product.id}`))
    pack.castShadow = true
    return pack
  }

  private buildShelf(product: SceneDepartment) {
    const items = this.options.products.filter(item => item.department === product.id)
    const shelf = new THREE.Group()
    shelf.position.set((product.x + 82.5 - 480) / 80, 0, ((product.y ?? 205) + 80 - 350) / 80)
    shelf.userData.departmentId = product.id
    this.scene.add(shelf)
    this.shelfTargets.push(shelf)
    const cream = this.material('#334253', 0.45)
    const edge = this.material('#8799a7', 0.7)
    const green = this.material('#172330', 0.5)
    this.box(shelf, [2.06, 0.18, 2], [0, 0.16, 0], green)
    this.box(shelf, [2.02, 0.12, 1.97], [0, 0.31, 0], cream)
    this.box(shelf, [2.02, 0.11, 1.97], [0, 1.09, 0], edge)
    this.box(shelf, [2.02, 0.1, 0.1], [0, 1.93, -0.89], edge)
    this.box(shelf, [1.94, 1.5, 0.08], [0, 1.1, -0.85], cream)
    for (const side of [-0.98, 0.98]) {
      for (const z of [-0.9, 0.9]) this.box(shelf, [0.065, 1.76, 0.065], [side, 1.08, z], edge)
    }
    const palette = palettes[product.color] ?? palettes.grain!
    if (items.length) {
      for (let index = 0; index < 20; index++) {
        const item = items[index % items.length]!
        const pack = this.packageMesh(item)
        pack.geometry.computeBoundingBox()
        pack.position.set((index % 5 - 2) * 0.36, 0.37 - pack.geometry.boundingBox!.min.y + Math.floor(index / 10) * 0.78, 0.63 - Math.floor(index / 5) % 2 * 0.65)
        shelf.add(pack)
      }
    }
    this.box(shelf, [1.88, 0.46, 0.1], [0, 2.05, -0.83], this.material(palette.background))
    this.sign(shelf, 1.8, 0.45, [0, 2.05, -0.77], context => {
      context.fillStyle = palette.ink
      context.font = '25px system-ui'
      context.fillText(`${product.number} / DEPARTAMENT`, 45, 55)
      context.font = 'bold 106px system-ui'
      context.fillText(product.name, 45, 168, 840)
      context.font = '25px system-ui'
      context.fillText(items.length ? 'SELECȚIE PENTRU MESE' : 'PRODUSE ÎN CURÂND', 45, 219)
      context.font = '60px system-ui'
      context.fillText('↗', 877, 150)
    })
    for (const height of [0.32, 1.09]) {
      this.sign(shelf, 1.91, 0.14, [0, height, 1.007], context => {
        context.fillStyle = '#c6eff7'
        context.fillRect(0, 0, 1024, 256)
        context.fillStyle = '#182d40'
        context.font = '70px system-ui'
        context.fillText(items.length ? 'CONSULTĂ ETICHETA' : 'PRODUSE ÎN CURÂND', 33, 158)
      })
    }
    const haloMaterial = new THREE.MeshBasicMaterial({ color: '#58d9e8', transparent: true, opacity: 0.32, depthWrite: false })
    this.resources.push(haloMaterial)
    const halo = this.mesh(new THREE.PlaneGeometry(2.25, 2.18), haloMaterial, this.scene, shelf.position.x, 0.055, shelf.position.z)
    halo.rotation.x = -Math.PI / 2
    halo.visible = false
    this.shelfHighlights.set(product.id, halo)
  }

  private buildShopper() {
    this.avatar.position.set(0, 0, 0.29)
    this.shopper.add(this.avatar)
    const skin = this.material('#e3aa7c')
    const shirt = this.material('#db8c51')
    this.shirtMaterial = shirt
    const trousers = this.material('#202d41')
    const shoes = this.material('#d9e5ed')
    const hair = this.material('#4a382b')
    for (const side of [-1, 1]) {
      const leg = new THREE.Group()
      leg.position.set(side * 0.092, 0.66, 0)
      this.avatar.add(leg)
      this.mesh(new THREE.CapsuleGeometry(0.072, 0.4, 4, 8), trousers, leg, 0, -0.25, 0)
      this.box(leg, [0.14, 0.085, 0.24], [0, -0.58, -0.035], shoes)
      this.legs.push(leg)
    }
    const torso = this.mesh(new THREE.CapsuleGeometry(0.17, 0.28, 6, 12), shirt, this.avatar, 0, 0.95, 0)
    torso.scale.z = 0.7
    this.box(this.avatar, [0.014, 0.34, 0.01], [0, 0.96, -0.123], this.material('#354559', 0.3))
    this.box(this.avatar, [0.14, 0.11, 0.014], [0.08, 0.85, -0.124], shirt)
    this.mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 10), skin, this.avatar, 0, 1.28, 0)
    const head = this.mesh(new THREE.SphereGeometry(0.13, 16, 12), skin, this.avatar, 0, 1.43, 0)
    head.scale.y = 1.15
    const hairMesh = this.mesh(new THREE.SphereGeometry(0.136, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), hair, this.avatar, 0, 1.466, 0)
    hairMesh.rotation.z = 0.1
    const eyes = this.material('#47382c')
    for (const side of [-1, 1]) {
      this.mesh(new THREE.SphereGeometry(0.009, 6, 4), eyes, this.avatar, side * 0.043, 1.44, -0.118)
      this.mesh(new THREE.SphereGeometry(0.025, 8, 6), skin, this.avatar, side * 0.124, 1.43, 0)
    }
    this.mesh(new THREE.SphereGeometry(0.023, 8, 6), skin, this.avatar, 0, 1.414, -0.127)
    for (const side of [-1, 1]) {
      const arm = this.mesh(new THREE.CapsuleGeometry(0.06, 0.24, 4, 8), shirt, this.avatar, side * 0.2, 1.04, -0.08)
      arm.rotation.x = 0.55
      const forearm = this.mesh(new THREE.CapsuleGeometry(0.044, 0.17, 4, 8), skin, this.avatar, side * 0.2, 0.92, -0.23)
      forearm.rotation.x = 1.4
      this.mesh(new THREE.SphereGeometry(0.052, 8, 6), skin, this.avatar, side * 0.2, 0.9, -0.32)
    }
    const trolley = new THREE.Group()
    trolley.position.set(0, 0, -0.35)
    this.shopper.add(trolley)
    const metal = this.material('#a2b8c8', 0.8)
    const handle = this.material('#52c5d8')
    const tyre = this.material('#354439')
    this.box(trolley, [0.43, 0.025, 0.5], [0, 0.49, 0], metal)
    this.box(trolley, [0.39, 0.025, 0.46], [0, 0.24, 0], metal)
    for (const z of [-0.25, 0.25]) {
      for (const height of [0.5, 0.67, 0.85]) this.box(trolley, [0.46, 0.022, 0.022], [0, height, z], metal)
      for (let i = 0; i < 5; i++) this.box(trolley, [0.013, 0.35, 0.015], [i * 0.1 - 0.2, 0.67, z], metal)
    }
    for (const side of [-0.22, 0.22]) {
      for (const height of [0.5, 0.67, 0.85]) this.box(trolley, [0.018, 0.022, 0.51], [side, height, 0], metal)
      for (let i = 0; i < 6; i++) this.box(trolley, [0.015, 0.35, 0.015], [side, 0.67, i * 0.1 - 0.25], metal)
      this.box(trolley, [0.022, 0.65, 0.025], [side, 0.58, 0.3], metal)
      for (const z of [-0.19, 0.2]) {
        const wheel = this.mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.043, 10), tyre, trolley, side, 0.12, z)
        wheel.rotation.z = Math.PI / 2
        this.box(trolley, [0.024, 0.2, 0.024], [side, 0.25, z], metal)
      }
    }
    this.box(trolley, [0.49, 0.045, 0.05], [0, 0.9, 0.32], handle)
    trolley.add(this.basketContents)
  }

  private resize = () => {
    const { clientWidth: width, clientHeight: height } = this.options.mount
    if (!width || !height) return
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.cameraReady = false
    this.positionCamera(0)
    this.dirty = true
  }

  private positionCamera(time: number, paused = false) {
    const elapsed = this.cameraTime ? Math.min((time - this.cameraTime) / 1000, 0.1) : 0
    this.cameraTime = time
    this.camera.fov = this.overview ? 38 : this.camera.aspect < 1 ? 66 : 56
    this.camera.zoom = 1
    this.camera.updateProjectionMatrix()
    if (!this.overview) {
      const player = this.shopper.position
      // Stay on the open entrance side, above the shelf tops when following a rear aisle.
      // A fixed yaw (not avatar heading) keeps camera-relative controls predictable.
      const rearAisle = THREE.MathUtils.clamp((0.8 - player.z) / 2.5, 0, 1)
      this.cameraGoal.set(
        THREE.MathUtils.clamp(player.x + Math.sin(this.yaw) * 5.3, -6, 6),
        3.4 + rearAisle * 7,
        Math.max(3.6, player.z + Math.cos(this.yaw) * 5.3),
      )
      this.lookGoal.set(player.x, 0.8, player.z - 0.85)
    } else {
      const distance = this.camera.aspect < 1.25 ? 20 : 17.7
      this.cameraGoal.set(Math.sin(this.yaw) * distance, 24, Math.cos(this.yaw) * distance)
      this.lookGoal.set(0, 0.52, -0.28 + (this.roomFront - 3.7) / 2)
    }
    const snap = !this.cameraReady || this.reducedMotion.matches || paused
    const alpha = snap ? 1 : 1 - Math.exp(-elapsed * 12)
    this.camera.position.lerp(this.cameraGoal, alpha)
    this.cameraLook.lerp(this.lookGoal, alpha)
    this.cameraMoving = this.camera.position.distanceToSquared(this.cameraGoal) + this.cameraLook.distanceToSquared(this.lookGoal) > 0.00001
    if (!this.cameraMoving) {
      this.camera.position.copy(this.cameraGoal)
      this.cameraLook.copy(this.lookGoal)
    }
    this.cameraReady = true
    this.camera.lookAt(this.cameraLook)
    this.camera.updateMatrixWorld()
    if (!this.overview) return
    let extent = 0
    for (const x of [-6.3, 6.3]) {
      for (const y of [0, 3.2]) {
        for (const z of [-3.7, this.roomFront]) {
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
    this.cameraReady = false
    this.dirty = true
  }

  setOverview(overview: boolean) {
    this.overview = overview
    this.cameraReady = false
    this.dirty = true
    this.options.mount.dataset.view = overview ? 'overview' : 'follow'
  }

  resetCamera() {
    this.yaw = 0.24
    this.setOverview(false)
  }

  movement(dx: number, dy: number) {
    const direction = this.cameraLook.clone().sub(this.camera.position)
    const yaw = Math.atan2(-direction.x, -direction.z)
    return { dx: dx * Math.cos(yaw) + dy * Math.sin(yaw), dy: -dx * Math.sin(yaw) + dy * Math.cos(yaw) }
  }

  update(x: number, y: number, walking: boolean, dx: number, dy: number, time: number, nearby?: string, paused = false) {
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
    if (this.dirty || walking || this.wasWalking || this.cameraMoving) {
      this.positionCamera(time, paused)
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
      const pack = this.packageMesh(product)
      pack.scale.setScalar(0.54)
      pack.position.set((i % 2 - 0.5) * 0.18, 0.65 + Math.floor(i / 4) * 0.04, (Math.floor(i / 2) % 3 - 1) * 0.13)
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
    while (object && !object.userData.departmentId) object = object.parent
    if (object?.userData.departmentId) this.options.inspect(object.userData.departmentId as string)
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

  setAvatarColor(color: string) {
    this.shirtMaterial?.color.set(({ clay: '#db8c51', leaf: '#83a36a', milk: '#cfdfed' } as Record<string, string>)[color] ?? '#db8c51')
    this.dirty = true
  }

  dispose() {
    this.disposed = true
    this.resizeObserver.disconnect()
    this.reducedMotion.removeEventListener('change', this.invalidate)
    this.renderer.domElement.removeEventListener('pointerup', this.selectShelf)
    this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost)
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.contextRestored)
    this.packageGeometries.forEach(geometry => geometry.dispose())
    this.resources.forEach(resource => resource.dispose())
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
