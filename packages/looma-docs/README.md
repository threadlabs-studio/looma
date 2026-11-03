# Looma docs

Browse Looma and your authored components, customize a shared theme, and build a documentation site.

```sh
pnpm add @threadlabs/looma
pnpm add -D @threadlabs/looma-docs
pnpm exec looma-docs init --title "Your design system"
pnpm exec looma-docs dev
```

The documentation package owns Markupress, MarkupKit, Vite and the editor preview dependencies. Their tested minimum versions are declared in package metadata; your lockfile records the installed versions.
