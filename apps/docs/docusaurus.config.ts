import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Looma UI Docs",
  tagline: "SSR-first web component contracts",
  favicon: "img/favicon.ico",
  url: process.env.LOOMA_DOCS_URL ?? "https://threadlabs-studio.github.io",
  baseUrl: process.env.LOOMA_DOCS_BASE_URL ?? "/looma/",
  headTags: [
    {
      tagName: "meta",
      attributes: {
        name: "robots",
        content: "noindex,nofollow"
      }
    }
  ],
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
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
    }
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
    announcementBar: {
      id: "looma-r1-candidate-preview",
      content:
        'Release 1 Candidate preview — packages are not published yet. <a href="/looma/release-1-support">Read the support boundary and open gates.</a>',
      backgroundColor: "#312e81",
      textColor: "#ffffff",
      isCloseable: false
    },
    colorMode: {
      defaultMode: "light",
      respectPrefersColorScheme: true
    },
    navbar: {
      title: "Looma UI",
      items: [
        {
          to: "/",
          label: "Docs",
          position: "left"
        },
        {
          href: "https://knit.wiki",
          label: "Knit",
          position: "right"
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
            { label: "Knit", href: "https://knit.wiki" },
            {
              label: "GitHub",
              href: "https://github.com/threadlabs-studio/looma"
            }
          ]
        }
      ],
      copyright: "Looma UI — SSR-first web components."
    }
  } satisfies Preset.ThemeConfig
};

export default config;
