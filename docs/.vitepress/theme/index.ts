import DefaultTheme from 'vitepress/theme'
import { onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import mediumZoom from 'medium-zoom'
import type { Zoom } from 'medium-zoom'
import './custom.css'

// 给克隆出来的 svg 及其内部 id / 引用统一加前缀：
// mermaid 重绘时是按 id 找节点的，id 不重复就不会往克隆里再叠一份图
function renameCloneIds(clone: SVGSVGElement) {
  const baseId = clone.id
  if (!baseId) return
  const rename = (text: string) => text.split(baseId).join(`lightbox-${baseId}`)
  clone.querySelectorAll('style').forEach((style) => {
    style.textContent = rename(style.textContent || '')
  })
  const elements: Element[] = [clone, ...Array.from(clone.querySelectorAll('*'))]
  elements.forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.value.includes(baseId)) el.setAttribute(attr.name, rename(attr.value))
    })
  })
}

function openMermaidLightbox(container: HTMLElement) {
  const svg = container.querySelector('svg')
  if (!svg) return
  if (document.querySelector('.mermaid-lightbox')) return

  const overlay = document.createElement('div')
  overlay.className = 'mermaid-lightbox'
  overlay.tabIndex = -1

  const stage = document.createElement('div')
  stage.className = 'mermaid-lightbox__stage'

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.removeAttribute('width')
  clone.removeAttribute('height')
  clone.style.maxWidth = 'none'
  clone.style.maxHeight = 'none'
  renameCloneIds(clone)
  stage.appendChild(clone)
  overlay.appendChild(stage)
  // 先挂进 DOM，才能读到真实的盒模型尺寸
  document.body.appendChild(overlay)
  // 锁滚动要用 body：vitepress-plugin-mermaid 监听的是 documentElement 的属性变化，
  // 动 <html> 会触发整页图表重渲染（闪一下，并把第二份叠进克隆节点）
  const bodyEl = document.body
  const prevBodyOverflow = bodyEl.style.overflow
  bodyEl.style.overflow = 'hidden'

  // 最小留白（取 CSS 里遮罩层的 padding）；居中与溢出对齐交给 grid + safe center
  const overlayStyle = getComputedStyle(overlay)
  const minPadX = parseFloat(overlayStyle.paddingLeft) || 16
  const minPadY = parseFloat(overlayStyle.paddingTop) || 16

  const srcRect = svg.getBoundingClientRect()
  const srcW = Math.max(srcRect.width, 1)
  const srcH = Math.max(srcRect.height, 1)

  // 一次性记下可用区域：之后不再读实时 clientWidth/clientHeight，
  // 否则滚动条出现/消失会反过来影响尺寸计算，导致滚动条反复闪现
  const viewW = Math.max(overlay.clientWidth, 1)
  const viewH = Math.max(overlay.clientHeight, 1)

  // 等比缩放到可用区域内（四周至少留 minPad）
  const availW = Math.max(viewW - minPadX * 2, 200)
  const availH = Math.max(viewH - minPadY * 2, 200)
  const fit = Math.min(availW / srcW, availH / srcH)
  // 向下取整，避免四舍五入多出 1px 又引出滚动条
  const baseW = Math.max(Math.floor(srcW * fit), 1)
  const baseH = Math.max(Math.floor(srcH * fit), 1)

  let scale = 1
  const layout = () => {
    const w = Math.max(Math.round(baseW * scale), 1)
    const h = Math.max(Math.round(baseH * scale), 1)
    clone.style.width = `${w}px`
    clone.style.height = `${h}px`
    stage.style.width = `${w}px`
    stage.style.height = `${h}px`
    return { w, h }
  }

  const applySize = (nextScale: number, anchorX?: number, anchorY?: number) => {
    const ovRect = overlay.getBoundingClientRect()
    const hasAnchor = anchorX != null && anchorY != null
    // 没传锚点（初次打开）时以视口中心为锚点
    const anchorClientX = anchorX ?? ovRect.left + viewW / 2
    const anchorClientY = anchorY ?? ovRect.top + viewH / 2

    const prevW = Math.max(Math.round(baseW * scale), 1)
    const prevH = Math.max(Math.round(baseH * scale), 1)
    const ratioX = (overlay.scrollLeft + anchorClientX - ovRect.left - stage.offsetLeft) / prevW
    const ratioY = (overlay.scrollTop + anchorClientY - ovRect.top - stage.offsetTop) / prevH

    scale = nextScale
    const { w, h } = layout()

    // 改真实宽高（不用 transform），滚动条可覆盖四边
    requestAnimationFrame(() => {
      const rect = overlay.getBoundingClientRect()
      const nextViewX = hasAnchor ? anchorClientX - rect.left : overlay.clientWidth / 2
      const nextViewY = hasAnchor ? anchorClientY - rect.top : overlay.clientHeight / 2
      overlay.scrollLeft = stage.offsetLeft + ratioX * w - nextViewX
      overlay.scrollTop = stage.offsetTop + ratioY * h - nextViewY
    })
  }
  applySize(1)

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.12 : 0.12
    const next = Math.min(5, Math.max(0.4, scale + delta))
    if (next === scale) return
    applySize(next, e.clientX, e.clientY)
  }

  // 拖拽平移（放大后可拖到任意边缘）
  let dragging = false
  let moved = false
  let startX = 0
  let startY = 0
  let startScrollLeft = 0
  let startScrollTop = 0

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    dragging = true
    moved = false
    startX = e.clientX
    startY = e.clientY
    startScrollLeft = overlay.scrollLeft
    startScrollTop = overlay.scrollTop
    overlay.setPointerCapture(e.pointerId)
    overlay.classList.add('is-dragging')
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true
    overlay.scrollLeft = startScrollLeft - dx
    overlay.scrollTop = startScrollTop - dy
  }
  const onPointerUp = (e: PointerEvent) => {
    if (!dragging) return
    dragging = false
    overlay.classList.remove('is-dragging')
    try {
      overlay.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
  }

  const close = () => {
    overlay.removeEventListener('wheel', onWheel)
    overlay.removeEventListener('pointerdown', onPointerDown)
    overlay.removeEventListener('pointermove', onPointerMove)
    overlay.removeEventListener('pointerup', onPointerUp)
    overlay.removeEventListener('pointercancel', onPointerUp)
    overlay.removeEventListener('click', onClick)
    window.removeEventListener('keydown', onKeyDown)
    bodyEl.style.overflow = prevBodyOverflow
    overlay.remove()
  }

  const onClick = (e: MouseEvent) => {
    if (moved) return
    // 点空白处关闭；点图表本身不关
    if (e.target === overlay) close()
  }

  overlay.addEventListener('wheel', onWheel, { passive: false })
  overlay.addEventListener('pointerdown', onPointerDown)
  overlay.addEventListener('pointermove', onPointerMove)
  overlay.addEventListener('pointerup', onPointerUp)
  overlay.addEventListener('pointercancel', onPointerUp)
  overlay.addEventListener('click', onClick)
  window.addEventListener('keydown', onKeyDown)

  overlay.focus()
}

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute()
    let zoom: Zoom | null = null

    const initImageZoom = () => {
      zoom?.detach()
      zoom = mediumZoom('.vp-doc img:not(.no-zoom)', {
        background: 'var(--vp-c-bg)',
      })
    }

    const onDocClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      if (!el) return
      const mermaid = el.closest('.vp-doc .mermaid') as HTMLElement | null
      if (!mermaid || mermaid.classList.contains('no-zoom')) return
      if (document.querySelector('.medium-zoom-image--opened')) return
      e.preventDefault()
      e.stopPropagation()
      openMermaidLightbox(mermaid)
    }

    onMounted(() => {
      nextTick(initImageZoom)
      document.addEventListener('click', onDocClick, true)
    })

    onUnmounted(() => {
      document.removeEventListener('click', onDocClick, true)
      zoom?.detach()
    })

    watch(
      () => route.path,
      () => nextTick(initImageZoom),
    )
  },
}
