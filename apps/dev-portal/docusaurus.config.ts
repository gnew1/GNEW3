
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'GNEW Developer Portal',
  tagline: 'Time‑to‑demo < 10 min',
  url: 'https://dev.gnew.local',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  presets: [
    ['@docusaurus/preset-classic',
      {
        docs: { sidebarPath: require.resolve('./sidebars.ts'), editUrl: undefined },
        blog: false,
        theme: { customCss: require.resolve('./src/css/custom.css') }
      }
    ]
  ],
  themeConfig: {
    navbar: {
      title: 'GNEW Dev',
      items: [
        { type: 'docSidebar', sidebarId: 'quickstart', position: 'left', label: 'Quickstarts' },
        { type: 'docSidebar', sidebarId: 'sdk', position: 'left', label: 'SDKs' },
        { type: 'docSidebar', sidebarId: 'guides', position: 'left', label: 'Guides' },
        { href: 'https://github.com/gnew-org', label: 'GitHub', position: 'right' }
      ]
    },
  prism: { theme: prismThemes.github },
    metadata: [{ name: 'robots', content: 'index,follow' }]
  }
};
export default config;


