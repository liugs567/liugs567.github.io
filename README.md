# Shawn's blog (VitePress)

由 `vuepress-theme-vdoing` 迁移而来的 VitePress 站点，当前使用**默认主题**。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

## 目录约定

```
docs/
  index.md              # 站点首页
  about.md              # 关于
  notes/                # 成体系笔记书 → /notes/<书名>/...
  articles/             # 分类文章 → /articles/<分区>/<分类>/...
    frontend|ui|tech|more/
  favorites/            # 收藏
  posts/                # 随笔
  public/               # 静态资源（如 /img/logo.png）
```

## 新增内容

### 1. 放对目录

| 类型 | 放到 |
|------|------|
| 笔记书章节 | `docs/notes/<书名>/` 或子目录 |
| 前端文章 | `docs/articles/frontend/...` |
| HTML/CSS | `docs/articles/ui/html` 或 `css` |
| 技术文档等 | `docs/articles/tech/...` |
| 学习/面试等 | `docs/articles/more/...` |
| 随笔 | `docs/posts/` |
| 收藏 | `docs/favorites/` |

新建分类：建文件夹即可；侧边栏会按目录自动出现。

### 2. 文件名用序号排序

侧边栏 **按文件名前缀数字排序**（`01` < `02` < `10` < `50` < `100`）。

推荐：

```text
01.介绍.md
02.基础用法.md
10.进阶.md
```

### 3. frontmatter

```md
---
title: 文章标题
date: 2026-03-26
---

正文...
```

不必写 `permalink`。网址由文件路径决定。

除站点首页 `docs/index.md` 外，**不要用 `index.md` 当文章**；正文一律用普通文件名（如 `01.标题.md`）。

### 4. 自动与手改

| 项目 | 是否自动 | 说明 |
|------|----------|------|
| 左侧边栏 | 是 | `loadPages.ts` 扫目录生成（忽略各目录下的 `index.md`） |
| 顶栏导航 `nav` | 否 | 改 `docs/.vitepress/config.ts`，链接指向具体文章 |

注意：

- 文件名尽量避免空格；链接中含中文/空格时需 URL 编码。
- Markdown 正文里不要写裸的 `<script src="...">`（可用 iframe）；会被 Vue 拦截报错。

### 5. 新分类挂到顶栏

在 `docs/.vitepress/config.ts` 的 `themeConfig.nav` 里增加一项，**link 指向该分类下某篇具体文章**。
