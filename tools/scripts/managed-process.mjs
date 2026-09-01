import { spawn } from "node:child_process";

export function spawnManaged(command, args, options = {}) {
  return spawn(command, args, {
    ...options,
    detached: process.platform === "win32" ? options.detached : true
  });
}

function signalManagedProcess(child, signal) {
  try {
    if (process.platform !== "win32" && child.pid) {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

async function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return new Promise((resolve) => {
    const onExit = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    function finish(exited) {
      clearTimeout(timer);
      child.off("exit", onExit);
      resolve(exited);
    }
    child.once("exit", onExit);
  });
}

export async function stopProcess(child) {
  if (!child || child.exitCode !== null) {
    return;
  }
  signalManagedProcess(child, "SIGTERM");
  if (!(await waitForExit(child, 5_000))) {
    signalManagedProcess(child, "SIGKILL");
    await waitForExit(child, 5_000);
  }
}
