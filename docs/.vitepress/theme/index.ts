import DefaultTheme from 'vitepress/theme'
import { onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import mediumZoom from 'medium-zoom'
import type { Zoom } from 'medium-zoom'
import 'viewerjs/dist/viewer.css'
import './custom.css'

let mermaidViewer: { destroy: () => void } | null = null

const SVG_NS = 'http://www.w3.org/2000/svg'

// 量出 svg 里内容实际占的范围（用户单位）。
// 不用 getBBox()：甘特图的 today 线会跑到 x≈32000，会把 bbox 拉到图表外；
// 所以改用子元素的屏幕坐标，并与 svg 可视区取交集，超出部分本来就是被裁掉的。
function measureContent(svg: SVGSVGElement) {
  const vb = svg.viewBox.baseVal
  const box = svg.getBoundingClientRect()
  const fallback = {
    x: vb.x,
    y: vb.y,
    w: vb.width || box.width,
    h: vb.height || box.height,
  }
  if (!vb.width || !vb.height || !box.width || !box.height) return fallback

  const scaleX = box.width / vb.width
  const scaleY = box.height / vb.height
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity

  svg
    .querySelectorAll('text, rect, path, line, circle, ellipse, polygon, polyline, foreignObject, image')
    .forEach((el) => {
      const b = el.getBoundingClientRect()
      const l = Math.max(b.left, box.left)
      const t = Math.max(b.top, box.top)
      const r = Math.min(b.right, box.right)
      const bo = Math.min(b.bottom, box.bottom)
      if (r <= l || bo <= t) return
      left = Math.min(left, l)
      top = Math.min(top, t)
      right = Math.max(right, r)
      bottom = Math.max(bottom, bo)
    })

  if (!Number.isFinite(left) || !Number.isFinite(right)) return fallback
  return {
    x: vb.x + (left - box.left) / scaleX,
    y: vb.y + (top - box.top) / scaleY,
    w: (right - left) / scaleX,
    h: (bottom - top) / scaleY,
  }
}

// 把页面里的 mermaid svg 序列化成一张图片，再交给 viewerjs 放大展示。
// 好处：不复制 DOM 节点，也就不会和 mermaid 的 id / 重渲染纠缠；底色跟着当前主题走。
async function openMermaidViewer(container: HTMLElement) {
  const svg = container.querySelector('svg')
  if (!svg || mermaidViewer) return

  // 页面底色：深色主题下就是深色，和正文一致
  const bg =
    getComputedStyle(document.documentElement).getPropertyValue('--vp-c-bg').trim() || '#ffffff'

  // 按内容实际范围裁剪，四边补同样宽度：mermaid 图形内容是贴左上排的，不裁会有半边空白
  const pad = 16
  const area = measureContent(svg)
  const vx = area.x - pad
  const vy = area.y - pad
  const vw = Math.max(area.w + pad * 2, 1)
  const vh = Math.max(area.h + pad * 2, 1)

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', SVG_NS)
  clone.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`)
  // svg 没有 CSS 上下文，宽高必须写成具体像素，否则图片尺寸会变成 0
  clone.setAttribute('width', String(Math.round(vw)))
  clone.setAttribute('height', String(Math.round(vh)))
  clone.removeAttribute('style')
  clone.style.maxWidth = 'none'
  clone.style.maxHeight = 'none'

  // 垫一层与页面一致的底色，放大后不会变成透明/白底
  const bgRect = document.createElementNS(SVG_NS, 'rect')
  bgRect.setAttribute('x', String(vx))
  bgRect.setAttribute('y', String(vy))
  bgRect.setAttribute('width', String(vw))
  bgRect.setAttribute('height', String(vh))
  bgRect.setAttribute('fill', bg)
  clone.insertBefore(bgRect, clone.firstChild)

  const xml = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))
  const { default: Viewer } = await import('viewerjs')

  const img = new Image()
  img.className = 'mermaid-viewer-image no-zoom'
  img.src = url
  img.style.cssText =
    'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none'
  // viewerjs 需要图片在文档里才能拿到尺寸
  document.body.appendChild(img)

  const instance = new Viewer(img, {
    navbar: false,
    title: false,
    toolbar: false,
    rotatable: false,
    scalable: false,
    fullscreen: false,
    loading: false,
    movable: true,
    zoomable: true,
    transition: true,
    hidden: () => {
      instance.destroy()
      img.remove()
      URL.revokeObjectURL(url)
      mermaidViewer = null
    },
  })
  mermaidViewer = instance
  instance.view()
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
      void openMermaidViewer(mermaid)
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