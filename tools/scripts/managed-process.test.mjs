import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { spawnManaged, stopProcess } from "./managed-process.mjs";

function processIsRunning(pid) {
  const result = spawnSync("ps", ["-o", "stat=", "-p", String(pid)], { encoding: "utf8" });
  const state = result.stdout.trim();
  return result.status === 0 && state !== "" && !state.startsWith("Z");
}

async function firstLine(stream) {
  let output = "";
  for await (const chunk of stream) {
    output += chunk;
    const newline = output.indexOf("\n");
    if (newline !== -1) return output.slice(0, newline);
  }
  throw new Error("managed process exited before reporting its descendant PID");
}

test(
  "stopping a managed wrapper waits for its descendant process to exit",
  { skip: process.platform === "win32" },
  async () => {
    const parent = spawnManaged(
      process.execPath,
      [
        "-e",
        `const { spawn } = require("node:child_process");
         spawn(process.execPath, ["-e", "process.on('SIGTERM', () => setTimeout(() => process.exit(0), 100)); console.log(process.pid); setInterval(() => {}, 1000)"], { stdio: "inherit" });
         setInterval(() => {}, 1000);`
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    const descendantPid = Number.parseInt(await firstLine(parent.stdout), 10);
    assert.ok(Number.isInteger(descendantPid));

    await stopProcess(parent);
    const descendantSurvived = processIsRunning(descendantPid);
    if (descendantSurvived) process.kill(descendantPid, "SIGKILL");

    assert.equal(descendantSurvived, false, "the managed process left its descendant running");
  }
);
