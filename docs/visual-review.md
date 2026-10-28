# Visual review from source

Visual PNGs are disposable render outputs. Git stores the components, examples,
fonts, rendering configuration, and text inventories needed to reproduce them.
CI renders the affected surfaces from the trusted base and the proposed checkout,
then attaches a before/after/diff report to the pull request's checks.

Appearance changes are assessed in normal PR review. They do not require a
separate acceptance action. A browser error, broken interaction, missing capture,
or failed functional or text-snapshot assertion still fails CI.

## Run a review

From a feature branch, compare against its shared base with main:

```sh
pnpm --dir apps/storybook visual:test
```

Choose another source revision or a focused component set:

```sh
pnpm --dir apps/storybook visual:test --base=origin/main --components=ui-disclosure,ui-light-editor
```

The HTML report is `.context/visual-review/storybook/report/index.html`.
`comparison.json` lists unchanged, changed, added, and removed images.
The base is an isolated detached worktree, removed after rendering. Local base
and candidate browser runs execute sequentially with one worker.

Documentation's exhaustive visual sweep remains an explicit check:

```sh
pnpm --dir apps/docs test:visual --base=origin/main
```

Run from a feature branch or pass the previous revision explicitly when reviewing
a change already on main. Comparing a checkout with itself establishes
reproducibility; it cannot establish whether a proposed visual change is correct.

## Selection, rendering, and caches

Component edits select their composed consumers. Shared tokens, build inputs,
dependencies, and rendering-tool changes select the complete component inventory.
Ordinary prose edits do not select component captures. The authored state and
interaction cases remain the coverage contract, including light/dark and starter
theme coverage.

Both revisions use the candidate's capture driver and pinned canonical container.
Each checkout supplies its own component sources and authored scenarios. A newly
added or removed scene appears as such in the report rather than being silently
accepted as a new reference.

Render keys include source-file identities, dependency and font inputs, rendering
driver identity, selected components, suite, and shard. Commit messages and prose
outside the render-input paths do not change a key. Cached images are accepted only when the
key and recorded file hashes match; a partial render is never a cache hit. Cache
metadata is refreshed to identify the actual base/candidate pair being reviewed.
GitHub's ordinary cache and artifact retention applies. These files are neither
Git history nor permanent baseline releases.

CI renders base and candidate sides in parallel, using the same stable case-name
partition for each shard. The required `verify` check rejects missing or mixed
capture pairs before producing the report. Component comparisons use the pinned
Playwright SSIM/CIE94 comparator; documentation comparisons use its pixel
comparator. Diagnostic screenshots are excluded from the scene inventory.

## Keep binaries out of history

PNG files below either application's `tests/baselines/` directory are ignored.
The required quality check rejects tracked baseline PNGs and PNG additions in the
history introduced by a PR, including a stale branch whose final tree has already
deleted those files. Text inventories and accessibility findings stay in Git and
retain their existing assertions.

`visual:update` is removed. Change the source, generate the report, and review the
result; there is no PNG reference to update or commit.

Existing clones must resynchronize after the historical PNG cleanup. Preserve
unpublished commits and working-tree changes before migrating. Fetching cleaned
refs alone does not reclaim old local objects while branches, worktrees, or
reflogs still reference them. Never merge an old history back into the cleaned
branch; use the recorded commit mapping or replay the unpublished source changes.
