# Shared component scenarios

Scenarios describe content, state changes, and observable browser behavior with `sceneNode`,
`createState`, and `createScene`. The selected renderer mounts those descriptions. Keep framework
imports and lifecycle handling in this directory.

Run the package's complete browser suite with `pnpm test:browser`. The coordinator runs HTML Next,
Vue, React, Preact, Svelte, and Angular sequentially. Set `LOOMA_TEST_TARGET` to select one renderer:

```sh
LOOMA_TEST_TARGET=preact pnpm test:browser pagination
```

Suite setup prepares the complete source catalog once for the selected renderer, including actual
framework compilation and reusable client and server modules. The node-driven browser/SSR project
and Vitest browser-mode tests consume the same immutable output. Individual fixtures write small entry modules and load them through suite-owned Vite module
servers. Module transforms, prebundled dependencies, and compiled CSS are reused. Production and
development profiles have separate caches; neither profile converts or typechecks the library. CI qualification
batches selected files by test configuration and shares the preparation across both configurations.
One browser process serves both browser configurations and all selected renderers. Blank-page
fixtures reuse contexts with identical options to retain HTTP caches, while each page has fresh DOM
and JavaScript state. Storage/navigation scenarios use explicit isolated contexts. Failed tests close
their pages during teardown.

Ordinary fixture entries expose the SDK's `pendingControllers` promises to the shared loader.
After initial DOM commits, it waits for controller activation and checks the resulting view again
before driving controls. Link-form scenarios also require their declared autofocus before entering
text. Use `waitForFixture(page)` again after mounting content later or revealing controls whose
controllers may still be loading. Ordinary Vitest browser-mode scenarios await
`Promise.all(pendingControllers(host))` after the renderer commits and before the first
interaction. A control’s presence in the DOM does not mean its controller’s initial
handlers are installed. The editor fixture applies the same wait after mounting and before
opening a link form. The deliberately transformed Tree controller fixture observes its loading phase directly.

The prepared library is removed when the coordinator exits. Renderer-specific Vite caches and an
adapter identity check prevent one target's output from satisfying another target's scenarios.

To test an HTML Next checkout, build its packages first and set `LOOMA_HTMLNEXT_ROOT` to its absolute
repository path. The preparation and fixtures then use that checkout's public built SDK exports.
Run one local browser runner at a time with one worker.

The HTML Next prepared library exposes `nativeSources` and `nativeAssets` paths in its fixture
manifest. A native server fixture can retain those sources and matching build assets once for the
suite. Set `LOOMA_NATIVE_SERVER_MODULE` to an absolute ESM module that exports
`renderApplication({ source, inputs })` and returns rendered HTML. The shared scene serializer passes
the same authored application carrier and input data to that module. Browser factories and shared
assertions continue to use the prepared HTML Next library.

For scoped fixture callbacks, use `scopedSlot(callback, source)` from `@looma-test/scene`
to associate the callback with equivalent authored HTML slot content. JavaScript renderers
call the same callback; native source compilers receive the authored content and evaluate
its scoped bindings themselves. Reuse the source from the scenario's HTML fixture so both
forms describe the same content. Unannotated scoped callbacks fail native serialization.

The native module may also export `browserPlugins({ scene, applications })`. The renderer
plugin loads these Vite plugins for HTML Next fixtures. A plugin can request native initial
HTML before mounting through the normal hydrated scene adapter. Shared fixture readiness
waits for native render tasks before controller activation; browser behavior and updates
remain owned by the prepared browser library. HTML-only fixtures and Vitest browser-mode
tests need their own native rendering coverage.

Use `asset(name, source)` from the browser driver for inline fixture assets that need a
portable HTTP URL. It serves the same bytes through the production fixture server for
every renderer.

CI runs `node packages/looma/tests/run-pressure.mjs --prepare-only` once. This builds the package,
checks component coverage, and writes `.test-build/pressure.json` plus all six compiled libraries.
Six renderer shards balance files by their measured passing durations. Renderer shards restore that output at the same checkout path and use `--prepared --shard=1/6`.
They install dependencies but do not rebuild the package or catalog. The index verifies its checkout
path and requires the selected renderer; it cannot silently fall back to another renderer's output.

The Tree delayed-controller scenario deliberately transforms one real controller in its fixture
bundle. Ordinary fixtures perform no bundle build. That scenario still consumes the already compiled
catalog and does not convert or typecheck components again.
