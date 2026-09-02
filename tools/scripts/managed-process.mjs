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

function processGroupExists(groupId) {
  try {
    process.kill(-groupId, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    // A group created by spawnManaged() shares our user. EPERM here means only
    // already-terminated members remain visible while the OS reaps them.
    if (error?.code === "EPERM") return false;
    throw error;
  }
}

async function waitForProcessGroupExit(groupId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (processGroupExists(groupId)) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) return false;
    await new Promise((resolve) => setTimeout(resolve, Math.min(25, remainingMs)));
  }
  return true;
}

function waitForManagedExit(child, timeoutMs) {
  return process.platform !== "win32" && child.pid
    ? waitForProcessGroupExit(child.pid, timeoutMs)
    : waitForExit(child, timeoutMs);
}

export async function stopProcess(child) {
  if (!child || child.exitCode !== null) {
    return;
  }
  signalManagedProcess(child, "SIGTERM");
  if (!(await waitForManagedExit(child, 5_000))) {
    signalManagedProcess(child, "SIGKILL");
    await waitForManagedExit(child, 5_000);
  }
}
