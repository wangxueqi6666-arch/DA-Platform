import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js'

export default function PointCloudViewer({ src, style, box, onBoxChange, onPointsLoaded, highlight = false, onBoxDrawn, annotations = [], onSelectAnnotation }) {
  const mountRef = useRef(null)
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const pointRef = useRef(null)
  const boxMeshRef = useRef(null)
  const boxEdgesRef = useRef(null)
  const annGroupRef = useRef(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const drawingRef = useRef(false)
  const startPtRef = useRef(null)
  const draggingBoxRef = useRef(null)
  const transformRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth || 600
    const height = mount.clientHeight || 400
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b0b0b)
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000)
    camera.position.set(0, 0, 10)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.screenSpacePanning = false
    controls.minDistance = 0.1
    controls.maxDistance = 2000

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0)
    hemiLight.position.set(0, 20, 0)
    scene.add(hemiLight)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(3, 10, 10)
    scene.add(dirLight)

    // Grid & axes helpers
    const grid = new THREE.GridHelper(20, 20, 0x999999, 0xcccccc)
    scene.add(grid)
    const axes = new THREE.AxesHelper(5)
    scene.add(axes)

    // group for non-interactive annotation boxes and labels
    const annGroup = new THREE.Group()
    scene.add(annGroup)
    annGroupRef.current = annGroup

    rendererRef.current = renderer
    sceneRef.current = scene
    cameraRef.current = camera
    controlsRef.current = controls

    // Transform controls for XYZ translation of the box
    const tcontrols = new TransformControls(camera, renderer.domElement)
    tcontrols.setMode('translate')
    tcontrols.showX = true
    tcontrols.showY = true
    tcontrols.showZ = true
    tcontrols.addEventListener('dragging-changed', (ev) => {
      controls.enabled = !ev.value
    })
    tcontrols.addEventListener('change', () => {
      if (boxMeshRef.current) {
        const pos = boxMeshRef.current.position
        boxEdgesRef.current?.position.copy(pos)
        const params = boxMeshRef.current.geometry.parameters
        if (typeof onBoxChange === 'function') {
          onBoxChange({ width: params.width, length: params.depth, height: params.height, center: pos.clone() })
        }
      }
    })
    scene.add(tcontrols)
    transformRef.current = tcontrols

    const getPlaneIntersection = (event) => {
      const rect = renderer.domElement.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycasterRef.current.setFromCamera({ x, y }, camera)
      const p = new THREE.Vector3()
      raycasterRef.current.ray.intersectPlane(planeRef.current, p)
      return p
    }

    const createOrUpdateBox = (size, center) => {
      const scene = sceneRef.current
      if (!scene) return
      const { width = 1, length = 1, height = 1 } = size || {}
      const pos = center || new THREE.Vector3(0, height / 2, 0)

      // remove existing
      if (boxMeshRef.current) {
        scene.remove(boxMeshRef.current)
        boxMeshRef.current.geometry?.dispose?.()
        if (Array.isArray(boxMeshRef.current.material)) {
          boxMeshRef.current.material.forEach((m) => m.dispose?.())
        } else {
          boxMeshRef.current.material?.dispose?.()
        }
        boxMeshRef.current = null
      }
      if (boxEdgesRef.current) {
        scene.remove(boxEdgesRef.current)
        boxEdgesRef.current.geometry?.dispose?.()
        boxEdgesRef.current.material?.dispose?.()
        boxEdgesRef.current = null
      }

      const geom = new THREE.BoxGeometry(width, height, length)
      const fillColor = highlight ? 0x93c5fd : 0x10b981
      const mat = new THREE.MeshPhongMaterial({ color: fillColor, opacity: highlight ? 0.35 : 0.25, transparent: true, depthTest: true })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.copy(pos)
      scene.add(mesh)
      boxMeshRef.current = mesh

      const edgeColor = highlight ? 0x3b82f6 : 0x065f46
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), new THREE.LineBasicMaterial({ color: edgeColor }))
      edges.position.copy(pos)
      scene.add(edges)
      boxEdgesRef.current = edges

      // attach transform controls to enable 3D dragging
      if (transformRef.current) transformRef.current.attach(mesh)
    }

    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    const onPointerDown = (e) => {
      // click on existing annotation box to select
      if (annGroupRef.current) {
        const rect = renderer.domElement.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        raycasterRef.current.setFromCamera({ x, y }, camera)
        const meshes = annGroupRef.current.children.filter((o) => o.isMesh)
        if (meshes.length > 0) {
          const hits = raycasterRef.current.intersectObjects(meshes, true)
          if (hits && hits.length > 0) {
            const obj = hits[0].object
            const annId = obj?.userData?.__ann_id
            if (annId && typeof onSelectAnnotation === 'function') {
              e.preventDefault()
              onSelectAnnotation(annId)
              return
            }
          }
        }
      }
      if (e.ctrlKey) {
        // start drawing new box
        e.preventDefault()
        drawingRef.current = true
        controls.enabled = false
        startPtRef.current = getPlaneIntersection(e)
        return
      }
      // left button drag existing box
      if (e.button === 0 && boxMeshRef.current) {
        const rect = renderer.domElement.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        raycasterRef.current.setFromCamera({ x, y }, camera)
        const intersects = raycasterRef.current.intersectObject(boxMeshRef.current, true)
        if (intersects && intersects.length > 0) {
          e.preventDefault()
          controls.enabled = false
          const worldPt = getPlaneIntersection(e)
          const currentCenter = boxMeshRef.current.position.clone()
          draggingBoxRef.current = { offset: worldPt.clone().sub(currentCenter) }
          return
        }
      }
    }
    const onPointerUp = (e) => {
      if (drawingRef.current) {
        e.preventDefault()
        controls.enabled = true
        const endPt = getPlaneIntersection(e)
        const s = startPtRef.current
        if (!s || !endPt) { drawingRef.current = false; return }
        const width = Math.max(0.01, Math.abs(endPt.x - s.x))
        const length = Math.max(0.01, Math.abs(endPt.z - s.z))
        const height = boxMeshRef.current ? boxMeshRef.current.geometry.parameters.height : 2
        const center = new THREE.Vector3((s.x + endPt.x) / 2, height / 2, (s.z + endPt.z) / 2)
        createOrUpdateBox({ width, length, height }, center)
        if (typeof onBoxChange === 'function') {
          onBoxChange({ width, length, height, center })
        }
        if (typeof onBoxDrawn === 'function') {
          onBoxDrawn({ width, length, height, center })
        }
        drawingRef.current = false
        return
      }
      if (draggingBoxRef.current) {
        e.preventDefault()
        controls.enabled = true
        draggingBoxRef.current = null
      }
    }
    const onPointerMove = (e) => {
      // Optional: preview or hover logic can go here if needed
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointermove', onPointerMove)

    let rafId
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      // dispose annotations group children
      if (annGroupRef.current) {
        const g = annGroupRef.current
        const children = [...g.children]
        children.forEach((obj) => {
          if (obj.geometry) obj.geometry.dispose?.()
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.())
          else obj.material?.dispose?.()
          g.remove(obj)
        })
      }
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => {
    // load point cloud when src changes
    const scene = sceneRef.current
    const camera = cameraRef.current
    if (!scene || !camera) return

    // remove previous
    if (pointRef.current) {
      scene.remove(pointRef.current)
      pointRef.current.geometry?.dispose?.()
      if (Array.isArray(pointRef.current.material)) {
        pointRef.current.material.forEach((m) => m.dispose?.())
      } else {
        pointRef.current.material?.dispose?.()
      }
      pointRef.current = null
    }

    if (!src) return
    const ext = src.split('?')[0].split('#')[0].toLowerCase()
    const isPLY = ext.endsWith('.ply')
    const isPCD = ext.endsWith('.pcd')
    const onError = (e) => {
      console.warn('Failed to load point cloud:', e)
    }

    const emitWorldPositions = (object) => {
      try {
        object.updateMatrixWorld(true)
        const geom = object.geometry
        const arr = geom?.attributes?.position?.array
        if (!arr) return
        const mat = object.matrixWorld.clone()
        const maxPoints = 30000
        const stride = Math.max(1, Math.floor(arr.length / 3 / maxPoints))
        const out = []
        const v = new THREE.Vector3()
        for (let i = 0; i < arr.length; i += 3 * stride) {
          v.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix4(mat)
          out.push({ x: v.x, y: v.y, z: v.z })
        }
        if (typeof onPointsLoaded === 'function') onPointsLoaded(out)
      } catch (e) {
        console.warn('emitWorldPositions failed:', e)
      }
    }

    if (isPLY) {
      const loader = new PLYLoader()
      loader.load(
        src,
        (geom) => {
          geom.computeBoundingSphere()
          const material = new THREE.PointsMaterial({ color: 0x2563eb, size: 0.02, sizeAttenuation: true })
          const points = new THREE.Points(geom, material)
          // Apply 90° roll (commonly X-axis in vehicle convention)
          points.rotation.x += Math.PI / 2
          // Additional 180° roll per user request
          points.rotation.x += Math.PI
          scene.add(points)
          pointRef.current = points
          const bs = geom.boundingSphere
          if (bs) {
            const r = bs.radius || 1
            const center = bs.center || new THREE.Vector3()
            camera.position.copy(center.clone().add(new THREE.Vector3(r * 2.2, r * 1.4, r * 2.8)))
            camera.lookAt(center)
          }
          emitWorldPositions(points)
        },
        undefined,
        onError
      )
    } else if (isPCD) {
      const loader = new PCDLoader()
      loader.load(
        src,
        (points) => {
          points.material.size = 0.02
          points.material.color = new THREE.Color(0x2563eb)
          // Apply 90° roll (commonly X-axis in vehicle convention)
          points.rotation.x += Math.PI / 2
          // Additional 180° roll per user request
          points.rotation.x += Math.PI
          scene.add(points)
          pointRef.current = points
          // center camera on object
          const box = new THREE.Box3().setFromObject(points)
          const center = new THREE.Vector3()
          box.getCenter(center)
          const size = new THREE.Vector3()
          box.getSize(size)
          const r = Math.max(size.x, size.y, size.z)
          camera.position.copy(center.clone().add(new THREE.Vector3(r * 2.2, r * 1.4, r * 2.8)))
          camera.lookAt(center)
          emitWorldPositions(points)
        },
        undefined,
        onError
      )
    } else {
      console.warn('Unsupported point cloud format:', src)
    }
  }, [src])

  // reflect external box updates
  useEffect(() => {
    if (!box) return
    const c = box.center || { x: 0, y: box.height / 2, z: 0 }
    const center = new THREE.Vector3(c.x, c.y, c.z)
    const size = { width: box.width, length: box.length, height: box.height }
    const scene = sceneRef.current
    if (!scene) return
    // create or update
    const recreate = () => {
      // remove & add fresh
      if (boxMeshRef.current || boxEdgesRef.current) {
        if (boxMeshRef.current) {
          scene.remove(boxMeshRef.current)
          boxMeshRef.current.geometry?.dispose?.()
          if (Array.isArray(boxMeshRef.current.material)) {
            boxMeshRef.current.material.forEach((m) => m.dispose?.())
          } else {
            boxMeshRef.current.material?.dispose?.()
          }
          boxMeshRef.current = null
        }
        if (boxEdgesRef.current) {
          scene.remove(boxEdgesRef.current)
          boxEdgesRef.current.geometry?.dispose?.()
          boxEdgesRef.current.material?.dispose?.()
          boxEdgesRef.current = null
        }
      }
      const geom = new THREE.BoxGeometry(size.width || 1, size.height || 1, size.length || 1)
      const fillColor2 = highlight ? 0x93c5fd : 0x10b981
      const mat = new THREE.MeshPhongMaterial({ color: fillColor2, opacity: highlight ? 0.35 : 0.25, transparent: true })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.copy(center)
      scene.add(mesh)
      boxMeshRef.current = mesh
      const edgeColor2 = highlight ? 0x3b82f6 : 0x065f46
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), new THREE.LineBasicMaterial({ color: edgeColor2 }))
      edges.position.copy(center)
      scene.add(edges)
      boxEdgesRef.current = edges

      // attach transform controls so user can move the box in XYZ
      if (transformRef.current) transformRef.current.attach(mesh)
    }
    recreate()
  }, [box?.width, box?.length, box?.height, box?.center?.x, box?.center?.y, box?.center?.z, highlight])

  // helper to create a label sprite with given text
  const createLabelSprite = (text) => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#0b0b0b'
    ctx.globalAlpha = 0.65
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalAlpha = 1
    ctx.font = '28px sans-serif'
    ctx.fillStyle = '#e5e7eb'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(1.8, 0.45, 1)
    return sprite
  }

  // render all annotations (non-interactive) with ID+type label
  useEffect(() => {
    const scene = sceneRef.current
    const group = annGroupRef.current
    if (!scene || !group) return

    // clear previous
    const prevChildren = [...group.children]
    prevChildren.forEach((obj) => {
      if (obj.geometry) obj.geometry.dispose?.()
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.())
      else obj.material?.dispose?.()
      group.remove(obj)
    })

    annotations.forEach((a) => {
      const b = a?.box
      if (!b) return
      const c = b.center || { x: 0, y: (b.height || 1) / 2, z: 0 }
      const center = new THREE.Vector3(c.x, c.y, c.z)
      const width = b.width || 1
      const height = b.height || 1
      const length = b.length || 1

      const geom = new THREE.BoxGeometry(width, height, length)
      const mat = new THREE.MeshPhongMaterial({ color: 0x0ea5e9, opacity: 0.18, transparent: true, depthTest: true })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.copy(center)
      mesh.userData.__ann_id = a.id
      // make sure this box won't be attached to transform controls
      mesh.userData.__annotation = true
      group.add(mesh)

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), new THREE.LineBasicMaterial({ color: 0x0891b2 }))
      edges.position.copy(center)
      group.add(edges)

      const label = createLabelSprite(`${a.id}｜${a.type}`)
      label.position.copy(center.clone())
      group.add(label)
    })
  }, [annotations])

  return (
    <div ref={mountRef} style={{ width: '100%', height: 420, border: '1px dashed #cbd5e1', borderRadius: 6, ...(style || {}) }} />
  )
}
