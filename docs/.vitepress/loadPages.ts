/**
 * 扫描 docs，为 articles/favorites/posts 生成文件路径侧边栏；
 * 若仍有 permalink 则做重写（兼容残留）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export type PageMeta = {
  source: string
  title: string
  permalink?: string
  link: string
}

type SidebarItem = {
  text: string
  link?: string
  collapsed?: boolean
  items?: SidebarItem[]
}

const SKIP_DIRS = new Set(['.vitepress', 'public', 'node_modules'])

/** 使用文件路径、不走 permalink 的顶层目录 */
const PATH_BASED_ROOTS = new Set(['articles', 'favorites', 'posts'])

function walk(dir: string, base = ''): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (SKIP_DIRS.has(entry.name)) continue
    const rel = base ? `${base}/${entry.name}` : entry.name
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(full, rel))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(rel.replace(/\\/g, '/'))
    }
  }
  return files
}

function parseFrontmatter(raw: string): Record<string, string> {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return {}
  const out: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i <= 0) continue
    const key = line.slice(0, i).trim()
    let val = line.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function permalinkToLink(permalink: string): string {
  let p = permalink.trim()
  if (!p.startsWith('/')) p = `/${p}`
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  return p || '/'
}

function linkToRewriteTarget(link: string): string {
  const trimmed = link.replace(/^\/+|\/+$/g, '')
  return trimmed ? `${trimmed}/index.md` : 'index.md'
}

function titleFromSource(source: string, fmTitle?: string): string {
  if (fmTitle) return fmTitle
  return path.basename(source, '.md').replace(/^\d+\./, '')
}

export function cleanDirName(name: string): string {
  return name.replace(/^\d+\./, '')
}

/** 路径分段编码，避免空格等导致 Markdown/路由无法跳转 */
export function encodePath(pathname: string): string {
  return pathname
    .split('/')
    .map((seg) => (seg ? encodeURIComponent(seg) : ''))
    .join('/')
}

function filePathLink(source: string): string {
  const withoutExt = source.replace(/\.md$/, '')
  if (withoutExt.endsWith('/index') || withoutExt === 'index') {
    const base = withoutExt.replace(/\/?index$/, '')
    return base ? encodePath(`/${base}`) : '/'
  }
  return encodePath(`/${withoutExt}`)
}

function isPathBased(source: string): boolean {
  const root = source.split('/')[0]
  return PATH_BASED_ROOTS.has(root) || source === 'about.md'
}

export function loadPages(): PageMeta[] {
  const files = walk(docsRoot)
  const pages: PageMeta[] = []

  for (const source of files) {
    if (source === 'index.md') continue
    const raw = fs.readFileSync(path.join(docsRoot, source), 'utf-8')
    const fm = parseFrontmatter(raw)
    const title = titleFromSource(source, fm.title)

    if (isPathBased(source) || !fm.permalink) {
      pages.push({ source, title, link: filePathLink(source) })
      continue
    }

    pages.push({
      source,
      title,
      permalink: fm.permalink,
      link: permalinkToLink(fm.permalink),
    })
  }

  return pages
}

export function buildRewrites(pages: PageMeta[]): (id: string) => string {
  const map = new Map<string, string>()
  const used = new Set<string>()

  for (const page of pages) {
    if (!page.permalink || isPathBased(page.source)) continue
    const target = linkToRewriteTarget(page.link)
    if (used.has(target)) {
      console.warn(`[vitepress] duplicate rewrite: ${target} <= ${page.source}`)
      continue
    }
    used.add(target)
    map.set(page.source, target)
  }

  return (id: string) => {
    const key = id.replace(/\\/g, '/')
    return map.get(key) ?? id
  }
}

/** 按文件名前缀序号排序：01 < 02 < 10 < 50 < 100 */
function compareByOrderPrefix(a: string, b: string): number {
  return a.localeCompare(b, 'zh', { numeric: true, sensitivity: 'base' })
}

function buildTree(dirRel: string, bySource: Map<string, PageMeta>): SidebarItem[] {
  const full = path.join(docsRoot, dirRel)
  if (!fs.existsSync(full)) return []

  const entries = fs
    .readdirSync(full, { withFileTypes: true })
    .sort((a, b) => compareByOrderPrefix(a.name, b.name))

  const items: SidebarItem[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const rel = `${dirRel}/${entry.name}`.replace(/\\/g, '/')

    if (entry.isDirectory()) {
      const children = buildTree(rel, bySource)
      if (children.length) {
        items.push({
          text: cleanDirName(entry.name),
          collapsed: true,
          items: children,
        })
      }
    } else if (entry.name.endsWith('.md')) {
      if (entry.name === 'index.md') continue // 不进侧边栏（站点首页除外，不在此树内）
      const page = bySource.get(rel)
      if (!page) continue
      items.push({ text: page.title, link: page.link })
    }
  }

  return items
}

function mountSection(
  sidebar: Record<string, SidebarItem[]>,
  mountPath: string,
  tree: SidebarItem[]
) {
  if (!tree.length) return
  // 直接挂树，不再包一层目录名（避免 frontend/git 下再套一个「git」）
  sidebar[mountPath.endsWith('/') ? mountPath : `${mountPath}/`] = tree
}

export function buildSidebar(pages: PageMeta[]): Record<string, SidebarItem[]> {
  const bySource = new Map(pages.map((p) => [p.source, p]))
  const sidebar: Record<string, SidebarItem[]> = {}

  // articles/<area>/<sub>/：只给有子目录的分类挂侧边栏
  // area 根下的单页（如 typescript.md）不挂目录，避免整区侧边栏盖住单文
  const articlesRoot = path.join(docsRoot, 'articles')
  if (fs.existsSync(articlesRoot)) {
    for (const area of ['frontend', 'ui', 'backend', 'ai', 'tech', 'more']) {
      const areaDir = path.join(articlesRoot, area)
      if (!fs.existsSync(areaDir)) continue

      for (const entry of fs.readdirSync(areaDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const sub = `articles/${area}/${entry.name}`
        mountSection(
          sidebar,
          `/articles/${area}/${entry.name}/`,
          buildTree(sub, bySource)
        )
      }
    }
  }

  // favorites / posts
  for (const [dir, mount] of [
    ['favorites', '/favorites/'],
    ['posts', '/posts/'],
  ] as const) {
    mountSection(sidebar, mount, buildTree(dir, bySource))
  }

  // 其它残留顶层（一般不应再有）
  const topDirs = fs
    .readdirSync(docsRoot, { withFileTypes: true })
    .filter(
      (d: fs.Dirent) =>
        d.isDirectory() && !SKIP_DIRS.has(d.name) && !d.name.startsWith('.')
    )
    .map((d: fs.Dirent) => d.name)
    .filter((name) => !PATH_BASED_ROOTS.has(name))

  for (const top of topDirs) {
    const tree = buildTree(top, bySource)
    if (!tree.length) continue
    for (const page of pages) {
      if (!page.source.startsWith(`${top}/`)) continue
      const key = page.link.endsWith('/') ? page.link : `${page.link}/`
      sidebar[key] = tree
    }
  }

  return sidebar
}
