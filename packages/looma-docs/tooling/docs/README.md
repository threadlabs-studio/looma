---
title: Create your design system
navigation: overview
order: 0
---

# Create your design system

Give your product its own colors, type, and component library. Looma gives you a local documentation site where your components and theme stay together.

![Fellowship UI: a custom design system with project cards and its own theme.](./assets/fellowship-light.png)

This is **Fellowship UI**, a small design system built from Looma and an authored project card. [Open the example source](https://github.com/threadlabs-studio/looma/tree/main/examples/fellowship-ui) to follow along.

## 1. Start your local site

In a project with a `package.json`, run:

```sh
pnpm add @threadlabs/looma
pnpm add -D @threadlabs/looma-docs
pnpm exec looma-docs init --title "Fellowship UI"
pnpm exec looma-docs dev
```

Open the address printed in your terminal. You can browse Looma's components and choose **Customize** to start shaping your theme.

## 2. Make it yours

Choose a starting theme, then adjust color, typography, spacing, and material. Changes appear across the site and its live component examples as you edit.

[Theme your system](/theme-your-system/) walks through choosing an identity, checking light and dark, and saving the result.

## 3. Use it in your application

Initialization creates your configuration and two theme files:

::: table

- File: `looma.docs.json`
  Purpose: Your site name, components, and documentation.

- File: `looma.theme.json`
  Purpose: Editable theme decisions.

- File: `looma.theme.css`
  Purpose: The generated CSS your application loads.

:::

Import the generated theme after Looma's styles in your application entry:

```js
import "@threadlabs/looma/tokens.css";
import "@threadlabs/looma/theme-light.css";
import "@threadlabs/looma/theme-dark.css";
import "./looma.theme.css";
```

Save from **Customize → Export & save** to update the local theme files. Commit them with your application and add `.looma/` to your ignore file.

## Keep building

- [Add your components](/add-your-components/): put your HTML Next definitions, examples, and API reference beside Looma's.
- [Publish your system](/publish-your-system/): add your branding and share a static documentation site.
- [Theme decisions](/theme-decisions/): look up the rules behind color, type, material, and motion.
