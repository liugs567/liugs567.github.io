# Shawn's Blog

基于 [VitePress](https://vitepress.dev/) 的个人前端技术博客。仅供学习交流，非商业用途。

## 命令

```bash
npm install
npm run dev      # 本地预览
npm run build    # 构建
npm run preview  # 预览构建结果
```

## 目录

```
docs/
  index.md / about.md
  articles/          # 分类文章 → /articles/<分区>/<分类>/...
    frontend/        # 前端（含 ui/css、ui/html）
    tech/
  more/              # 学习 / 面试 / 杂记等
  favorites/         # 收藏
  posts/             # 随笔
  public/            # 静态资源
```

## 写文章

| 类型 | 目录 |
|------|------|
| 前端 | `docs/articles/frontend/` |
| HTML / CSS | `docs/articles/frontend/ui/` |
| 技术文档等 | `docs/articles/tech/` |
| 学习 / 面试等 | `docs/more/` |
| 随笔 | `docs/posts/` |
| 收藏 | `docs/favorites/` |

- 文件名用序号排序：`01.标题.md`、`02.标题.md`
- frontmatter 写 `title` 即可，网址由路径决定
- 侧边栏自动生成；顶栏导航改 `docs/.vitepress/config.ts`
