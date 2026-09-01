---
title: Stop the Whole Process Tree for Release Fixture Services
date: 2026-08-31
category: runtime-errors
module: release-tooling
problem_type: runtime_error
component: development_workflow
symptoms:
  - "The qualification command writes successful evidence but never exits."
  - "A temporary Verdaccio process remains alive after its pnpm wrapper receives SIGTERM."
root_cause: logic_error
resolution_type: code_fix
severity: high
related_components:
  - tooling
  - testing_framework
tags:
  - process-cleanup
  - process-groups
  - release-qualification
  - verdaccio
  - node
---

# Stop the Whole Process Tree for Release Fixture Services

## Problem

The exact-artifact qualification runner launches Verdaccio through `pnpm exec`.
The qualification assertions and evidence write can finish successfully while
the command itself remains alive, which hangs local release rehearsal and CI.

## Symptoms

- `tools/scripts/verify-knit-consumer.mjs` prints its final success and evidence
  lines but does not return to the shell.
- Process inspection shows the wrapper was signaled while Verdaccio survived as
  a descendant and retained the runner's captured output pipes.

## What Didn't Work

- Sending `SIGTERM` and then `SIGKILL` only through `ChildProcess.kill()` stops
  the direct `pnpm` wrapper, not the service processes it launches.
- A timeout race without clearing the losing timer also delays an otherwise
  successful Node command until the timer expires.

## Solution

Launch long-lived fixture services through the shared managed-process helper.
On macOS and Linux it creates a separate process group and signals that group;
Windows retains the direct-child fallback:

```js
export function spawnManaged(command, args, options = {}) {
  return spawn(command, args, {
    ...options,
    detached: process.platform === "win32" ? options.detached : true
  });
}

if (process.platform !== "win32" && child.pid) {
  process.kill(-child.pid, signal);
} else {
  child.kill(signal);
}
```

`stopProcess()` first signals the group with `SIGTERM`, escalates to `SIGKILL`
after a bounded wait, and clears the wait timer as soon as the wrapper exits.
Both Verdaccio and the temporary Knit development server use this helper.

## Why This Works

The shell or package-manager wrapper and the service it starts share the new
process group. A negative PID targets that group on POSIX systems, so descendants
cannot keep stdout or stderr pipes open after cleanup. Clearing the unused timer
also prevents a successful cleanup from extending the Node event loop.

## Prevention

- Test fixture cleanup with a wrapper that launches its own long-lived child;
  assert that stopping the wrapper also makes the descendant PID disappear.
- Use one lifecycle helper for every long-running subprocess started by release
  tooling rather than duplicating direct-child signal logic.
- Verify the real qualification command returns with exit code zero and leaves
  no registry or qualification processes after writing evidence.

## Related Issues

- [Qualify Exact Candidate Artifacts Through a Clean Integration Harness](../architecture-patterns/isolated-cross-project-candidate-qualification.md)
