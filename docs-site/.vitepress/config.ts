import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'VTrustX SDK',
  description: 'Official documentation for the VTrustX SDK and REST API',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/reference' },
      {
        text: '1.0.0',
        items: [
          { text: 'Changelog', link: '/changelog' }
        ]
      }
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/guide/getting-started' }
        ]
      },
      {
        text: 'Platform Guides',
        items: [
          { text: 'JavaScript / TypeScript', link: '/guide/javascript' },
          { text: 'iOS (Swift)', link: '/guide/ios' },
          { text: 'Android (Kotlin)', link: '/guide/android' }
        ]
      },
      {
        text: 'API',
        items: [
          { text: 'REST API Reference', link: '/api/reference' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/vtrustx/vtrustx' }
    ],
    footer: {
      message: 'Released under the ISC License.',
      copyright: 'Copyright © 2026 VTrustX'
    },
    search: {
      provider: 'local'
    }
  }
})
