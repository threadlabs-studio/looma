import assert from "node:assert/strict";
import test from "node:test";

import { spawnManaged, stopProcess } from "./managed-process.mjs";

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
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
  "stopping a managed wrapper also stops its descendant process",
  { skip: process.platform === "win32" },
  async () => {
    const parent = spawnManaged(
      process.execPath,
      [
        "-e",
        `const { spawn } = require("node:child_process");
         const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "inherit" });
         console.log(child.pid);
         setInterval(() => {}, 1000);`
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    const descendantPid = Number.parseInt(await firstLine(parent.stdout), 10);
    assert.ok(Number.isInteger(descendantPid));

    await stopProcess(parent);
    const descendantSurvived = processExists(descendantPid);
    if (descendantSurvived) process.kill(descendantPid, "SIGKILL");

    assert.equal(descendantSurvived, false, "the managed process left its descendant running");
  }
);
