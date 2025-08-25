import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/docs',
    component: ComponentCreator('/docs', 'bd4'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '2d4'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '088'),
            routes: [
              {
                path: '/docs/guides/',
                component: ComponentCreator('/docs/guides/', '399'),
                exact: true,
                sidebar: "guides"
              },
              {
                path: '/docs/guides/auth',
                component: ComponentCreator('/docs/guides/auth', '2f6'),
                exact: true,
                sidebar: "guides"
              },
              {
                path: '/docs/guides/testing',
                component: ComponentCreator('/docs/guides/testing', '83e'),
                exact: true,
                sidebar: "guides"
              },
              {
                path: '/docs/guides/webhooks',
                component: ComponentCreator('/docs/guides/webhooks', '560'),
                exact: true,
                sidebar: "guides"
              },
              {
                path: '/docs/quickstarts/',
                component: ComponentCreator('/docs/quickstarts/', 'bdb'),
                exact: true,
                sidebar: "quickstart"
              },
              {
                path: '/docs/quickstarts/hello-gnew-js',
                component: ComponentCreator('/docs/quickstarts/hello-gnew-js', 'ce5'),
                exact: true,
                sidebar: "quickstart"
              },
              {
                path: '/docs/quickstarts/hello-gnew-py',
                component: ComponentCreator('/docs/quickstarts/hello-gnew-py', '262'),
                exact: true,
                sidebar: "quickstart"
              },
              {
                path: '/docs/sdk/',
                component: ComponentCreator('/docs/sdk/', 'bfd'),
                exact: true,
                sidebar: "sdk"
              },
              {
                path: '/docs/sdk/python',
                component: ComponentCreator('/docs/sdk/python', 'ff9'),
                exact: true,
                sidebar: "sdk"
              },
              {
                path: '/docs/sdk/typescript',
                component: ComponentCreator('/docs/sdk/typescript', 'ccb'),
                exact: true,
                sidebar: "sdk"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
