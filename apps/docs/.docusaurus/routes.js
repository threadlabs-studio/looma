import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/',
    component: ComponentCreator('/', 'b85'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '34f'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '3f8'),
            routes: [
              {
                path: '/adapter-parity',
                component: ComponentCreator('/adapter-parity', '551'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/architecture',
                component: ComponentCreator('/architecture', 'af9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-button',
                component: ComponentCreator('/components/ui-button', '694'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-center',
                component: ComponentCreator('/components/ui-center', 'c49'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-cluster',
                component: ComponentCreator('/components/ui-cluster', '260'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-dialog',
                component: ComponentCreator('/components/ui-dialog', 'd95'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-disclosure',
                component: ComponentCreator('/components/ui-disclosure', '70f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-form-field',
                component: ComponentCreator('/components/ui-form-field', 'f90'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-grid',
                component: ComponentCreator('/components/ui-grid', '988'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-inline',
                component: ComponentCreator('/components/ui-inline', 'c74'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-input',
                component: ComponentCreator('/components/ui-input', '4c8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-menu',
                component: ComponentCreator('/components/ui-menu', '72d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-menu-item',
                component: ComponentCreator('/components/ui-menu-item', '338'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-popover',
                component: ComponentCreator('/components/ui-popover', 'aac'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-separator',
                component: ComponentCreator('/components/ui-separator', '293'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-stack',
                component: ComponentCreator('/components/ui-stack', 'e78'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/components/ui-tabs',
                component: ComponentCreator('/components/ui-tabs', '8b9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/conventions',
                component: ComponentCreator('/conventions', '801'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/overlay-contract',
                component: ComponentCreator('/overlay-contract', 'dfe'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/tokens',
                component: ComponentCreator('/tokens', 'd25'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/',
                component: ComponentCreator('/', 'd58'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
