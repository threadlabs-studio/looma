import { readFileSync } from "node:fs";
import path from "node:path";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// The released package version, shown in the navbar.
const loomaVersion = (JSON.parse(readFileSync(path.join(__dirname, "../../package.json"), "utf8")) as { version: string }).version;

const config: Config = {
  title: "Looma",
  tagline: "Declarative components, woven into the web platform",
  favicon: "img/looma-mark.svg",
  url: process.env.LOOMA_DOCS_URL ?? "https://threadlabs-studio.github.io",
  baseUrl: process.env.LOOMA_DOCS_BASE_URL ?? "/looma/",
  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn"
    }
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en"]
  },
  clientModules: [require.resolve("./src/prism-languages.ts")],
  stylesheets: [
    {
      href: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap"
    }
  ],
  plugins: [
    // Component examples (packages/looma/src/components/*/examples) are read as text: one HTML file per example, plus
    // hand-written framework code. Behaviour files (.behavior.ts) compile normally.
    () => ({
      name: "looma-examples",
      configureWebpack: () => ({
        module: {
          rules: [{
            test: /\/examples\/[^/]+\.(html|vue)$/,
            include: path.join(__dirname, "../../packages"),
            type: "asset/source"
          }]
        }
      })
    })
  ],
  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts"
        },
        blog: false,
        pages: false,
        theme: {
          customCss: "./src/css/custom.css"
        }
      } satisfies Preset.Options
    ]
  ],
  themeConfig: {
    colorMode: {
      defaultMode: "light",
      respectPrefersColorScheme: true
    },
    navbar: {
      title: "Looma",
      logo: {
        alt: "",
        src: "img/looma-mark.svg",
        width: 34,
        height: 34
      },
      items: [
        {
          to: "/",
          label: "Get started",
          position: "left"
        },
        {
          to: "/components",
          label: "Components",
          position: "left"
        },
        {
          to: "/editor",
          label: "Editor",
          position: "left"
        },
        {
          type: "html",
          position: "right",
          value: `<span class="looma-version" title="Looma version">v${loomaVersion}</span>`
        }
      ]
    },
    docs: {
      sidebar: {
        hideable: false,
        autoCollapseCategories: false
      }
    },
    prism: {
      additionalLanguages: ["tsx", "jsx"]
    },
    footer: {
      style: "light",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Getting Started", to: "/" },
            { label: "Architecture", to: "/architecture" },
            { label: "Tokens", to: "/tokens" }
          ]
        },
        {
          title: "Resources",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/threadlabs-studio/looma"
            }
          ]
        }
      ],
      copyright: "Looma — declarative components, woven into the web platform."
    }
  } satisfies Preset.ThemeConfig
};

export default config;
