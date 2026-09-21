# Looma declarative build

Looma's maintained component source is the set of declarative definitions and
controllers under each package's `src/declarative/` directory. There is no
Stencil-to-declarative generation step in development.

`pnpm --filter @threadlabs/looma-declarative-build registry` refreshes the small
shipping registries from those definitions. It never rewrites component source
or framework adapters.

`pnpm --filter @threadlabs/looma-declarative-build validate` loads and lowers all
49 package-owned definitions with the vendored HTML Next runtime.

React, Vue, and Svelte adapters are generated only at a deliberate release
checkpoint. Build the package-owned definitions with the official HTML Next CLI,
then run:

```sh
pnpm --filter @threadlabs/looma-declarative-build release:adapters -- \
  --compiled-dir=<official-html-next-output>
```

The materializer adapts compiler output to Looma's package registry. It is a
release compiler, not a component-source generator.
