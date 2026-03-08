#!/usr/bin/env node
/**
 * Self-check: MutationObserver with attributes:true can cause infinite loops
 * when the callback modifies attributes in the observed subtree.
 *
 * This script fails the build if any MutationObserver.observe() uses
 * attributes: true.
 */
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(process.cwd(), "packages/core/src");
const FILE = join(ROOT, "index.ts");

const content = readFileSync(FILE, "utf8");

const attributesTrue = /attributes\s*:\s*true/g;
if (attributesTrue.test(content)) {
  console.error(
    "check-mutation-observer: MutationObserver with attributes:true can cause infinite loops",
    "when the callback modifies observed attributes. Use only childList and subtree."
  );
  process.exit(1);
}

console.log("check-mutation-observer: OK");
