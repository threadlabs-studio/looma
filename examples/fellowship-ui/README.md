# Fellowship UI

A runnable custom design system built with Looma. It includes its own theme, a branded documentation home, and an HTML Next project card composed from Looma primitives.

From this directory:

```sh
pnpm install
pnpm setup
pnpm dev
```

Open the address printed in your terminal. Browse **Components → Display → Project card**, or choose **Customize** to edit the same theme used by the site and its examples. Save locally to update `looma.theme.json` and `looma.theme.css`.

```sh
pnpm build
pnpm preview
```

The static site is written to `.looma/site`. Commit the recipe and generated CSS when you save your own identity. An application loads `looma.theme.css` after Looma's token and palette styles.

The example uses the public `@threadlabs/looma-docs` API. Within the Looma repository, build the packages first and link them with your package manager if you are testing unpublished changes.
