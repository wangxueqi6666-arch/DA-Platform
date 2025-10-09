import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js'

export default function PointCloudViewer({ src, style }) {
  const mountRef = useRef(null)
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const pointRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth || 600
    const height = mount.clientHeight || 400
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8fafc)
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

    rendererRef.current = renderer
    sceneRef.current = scene
    cameraRef.current = camera
    controlsRef.current = controls

    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

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
        },
        undefined,
        onError
      )
    } else {
      console.warn('Unsupported point cloud format:', src)
    }
  }, [src])

  return (
    <div ref={mountRef} style={{ width: '100%', height: 420, border: '1px dashed #cbd5e1', borderRadius: 6, ...(style || {}) }} />
  )
}