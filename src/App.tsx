import { useEffect, useRef } from 'react'
import { PerspectiveCamera, Scene, WebGLRenderer } from 'three'

export default function App() {
  const containerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const scene = new Scene()
    const camera = new PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.z = 5

    const renderer = new WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = container
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera)
    })

    return () => {
      observer.disconnect()
      renderer.setAnimationLoop(null)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <main ref={containerRef} className="h-full w-full overflow-hidden" aria-label="3D scene" />
}
