import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const docsReleaseMode = process.env.LOOMA_DOCS_RELEASE_MODE ?? "preview";

if (docsReleaseMode !== "preview" && docsReleaseMode !== "candidate") {
  throw new Error(
    `LOOMA_DOCS_RELEASE_MODE must be preview or candidate; received ${JSON.stringify(docsReleaseMode)}`
  );
}

const isCandidateRelease = docsReleaseMode === "candidate";

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
        content: isCandidateRelease ? "index,follow" : "noindex,nofollow"
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
      id: `looma-r1-${docsReleaseMode}`,
      content: isCandidateRelease
        ? 'Release 1 Candidate 0.1.1 is available on npm under the candidate tag. <a href="/looma/release-1-support">Read the support boundary.</a>'
        : 'Release 1 Candidate documentation preview — confirm registry availability before installing. <a href="/looma/release-1-support">Read the support boundary.</a>',
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
