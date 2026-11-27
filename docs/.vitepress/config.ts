import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import {
  buildRewrites,
  buildSidebar,
  loadPages,
} from './loadPages'

const pages = loadPages()
const rewrites = buildRewrites(pages)
const sidebar = buildSidebar(pages)

export default withMermaid(
  defineConfig({
  lang: 'zh-CN',
  title: "Shawn's Blog",
  description:
    'web前端技术博客,专注web前端学习与总结。JavaScript,js,ES6,TypeScript,vue,React,python,css3,html5,Node,git,github等技术文章。',

  // 用户站仓库名需为 liugs567.github.io → https://liugs567.github.io/
  base: '/',

  cleanUrls: true,
  ignoreDeadLinks: true,
  lastUpdated: true,
  rewrites,

  head: [
    ['link', { rel: 'icon', href: '/img/favicon.ico' }],
    [
      'meta',
      {
        name: 'keywords',
        content:
          '前端博客,个人技术博客,前端,前端开发,前端框架,web前端,前端面试题,技术文档,学习,面试,JavaScript,js,ES6,TypeScript,vue,python,css3,html5,Node,git,github,markdown',
      },
    ],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
  ],

  markdown: {
    lineNumbers: true,
    math: true,
    config(md) {
      // 表格外包一层容器：宽表格在容器内横向滚动，正文宽度不受影响
      md.renderer.rules.table_open = () => '<div class="vp-table-wrap"><table>'
      md.renderer.rules.table_close = () => '</table></div>'
    },
  },

  // mermaid 11 + fastdom 的 CJS 默认导出需要 interop，否则页面空白
  vite: {
    optimizeDeps: {
      include: ['mermaid', 'fastdom', 'debug', 'dayjs'],
      needsInterop: ['fastdom'],
    },
    ssr: {
      noExternal: ['mermaid', 'vitepress-plugin-mermaid'],
    },
  },

  themeConfig: {
    logo: '/img/logo.png',
    siteTitle: "Shawn's Blog",

    nav: [
      { text: '首页', link: '/' },
      {
        text: '前端',
        items: [
          {
            text: '系列',
            items: [
              {
                text: 'ES6 教程',
                link: '/articles/frontend/es6/01.ECMAScript%206%20%E7%AE%80%E4%BB%8B',
              },
              {
                text: 'TypeScript 从零实现 axios',
                link: '/articles/frontend/typescript-axios/01.%E5%88%9D%E8%AF%86%20TypeScript/01.%E7%AE%80%E4%BB%8B',
              },
              {
                text: 'CSS',
                link: '/articles/frontend/ui/css/00.CSS%E6%95%99%E7%A8%8B%E5%92%8C%E6%8A%80%E5%B7%A7%E6%94%B6%E8%97%8F',
              },
            ],
          },
          {
            text: '文章',
            items: [
              { text: 'TypeScript', link: '/articles/frontend/typescript' },
              { text: 'HTML', link: '/articles/frontend/ui/html/10.%E5%B8%B8%E7%94%A8meta%E6%95%B4%E7%90%86' },
            ],
          },
        ],
      },
      {
        text: '后端',
        items: [
          { text: '系列', items: [] },
          { text: '文章', items: [] },
        ],
      },
      {
        text: 'AI',
        items: [
          { text: '系列', items: [] },
          { text: '文章', items: [] },
        ],
      },
      {
        text: '技术',
        items: [
          {
            text: '系列',
            items: [
              {
                text: 'Git',
                link: '/articles/tech/git/10.%E6%89%8B%E5%86%8C/00.%E5%B8%B8%E7%94%A8Git%E5%91%BD%E4%BB%A4%E6%B8%85%E5%8D%95',
              },
              {
                text: 'Docker',
                link: '/articles/tech/docker/01.Docker%E7%9F%A5%E8%AF%86%E6%A2%B3%E7%90%86',
              },
              { text: '技术文档', link: '/articles/tech/docs/01.Git%E4%BD%BF%E7%94%A8%E6%89%8B%E5%86%8C' },
              {
                text: 'GitHub 技巧',
                link: '/articles/tech/github/01.GitHub%E9%AB%98%E7%BA%A7%E6%90%9C%E7%B4%A2%E6%8A%80%E5%B7%A7',
              },
              {
                text: '博客搭建',
                link: '/articles/tech/blog/02.%E4%BD%BF%E7%94%A8Gitalk%E5%AE%9E%E7%8E%B0%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E6%97%A0%E5%90%8E%E5%8F%B0%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F',
              },
            ],
          },
          {
            text: '文章',
            items: [
              {
                text: 'Node.js',
                link: '/articles/tech/nodejs/01.nodejs%E9%80%92%E5%BD%92%E8%AF%BB%E5%8F%96%E6%89%80%E6%9C%89%E6%96%87%E4%BB%B6',
              },
            ],
          },
        ],
      },
      {
        text: '更多',
        items: [
          {
            text: '系列',
            items: [
              { text: '学习', link: '/more/learning/00.%E8%B4%B9%E6%9B%BC%E5%AD%A6%E4%B9%A0%E6%B3%95' },
              {
                text: '心情杂货',
                link: '/more/misc/01.%E4%B8%80%E4%B8%AA%E5%AE%8C%E7%BE%8E%E4%B8%BB%E4%B9%89%E8%80%85%E7%9A%84%E8%87%AA%E6%88%91%E6%95%91%E8%B5%8E',
              },
              { text: '实用技巧', link: '/more/tips/01.2%E5%88%86%E9%92%9F%E8%A7%84%E5%88%99' },
            ],
          },
          {
            text: '文章',
            items: [
              {
                text: '面试',
                link: '/more/interview/01.%E9%9D%A2%E8%AF%95%E9%97%AE%E9%A2%98%E9%9B%86%E9%94%A6',
              },
            ],
          },
        ],
      },
      { text: '收藏', link: '/favorites/01.%E7%BD%91%E7%AB%99' },
      { text: '关于', link: '/about' },
    ],

    sidebar,

    // socialLinks: [
    //   { icon: 'github', link: 'https://github.com/liugs567/vitepress-blog' },
    // ],

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 6],
      label: '本页目录',
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },

    lastUpdated: {
      text: '上次更新',
    },

    footer: {
      message: '仅供个人学习交流，非商业用途。部分内容来自网络或第三方，版权归原作者所有。',
      copyright: 'Copyright © 2026 Shawn',
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  },
  }),
)
