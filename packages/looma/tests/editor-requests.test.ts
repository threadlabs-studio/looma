// @vitest-environment jsdom
import { respond } from "@nextwebwg/html-next/runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { askRequest, onResponderAnnounced, respondWithFunction } from "../src/editor/requests";

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  document.body.innerHTML = "";
});

function editorRoot() {
  const region = document.body.appendChild(document.createElement("section"));
  const root = region.appendChild(document.createElement("div"));
  return { region, root };
}

describe("editor requests", () => {
  it("answers at once with null when nobody answers, and with the nearest responder's answer otherwise", () => {
    const { region, root } = editorRoot();
    expect(askRequest(root, "link-resolve", { href: "/a" })).toBeNull();
    const outer = (event: Event) => respondWithFunction(event, () => "document");
    document.addEventListener("link-resolve", outer);
    cleanups.push(() => document.removeEventListener("link-resolve", outer));
    region.addEventListener("link-resolve", (event) => respondWithFunction(event, ({ href }: { href: string }) => `region ${href}`));
    expect(askRequest(root, "link-resolve", { href: "/a" })).toBe("region /a");
  });

  it("answers through HTML Next's respond() helper, forwards progress, and announces the responder", async () => {
    const { root } = editorRoot();
    const announced = vi.fn();
    cleanups.push(onResponderAnnounced(root, announced));
    cleanups.push(respond(document, "image-upload", async ({ file }: { file: string }, { progress }) => {
      progress(1, 2);
      progress(2, 2);
      return { src: `/uploads/${file}` };
    }));
    expect(announced.mock.calls).toEqual([["image-upload"]]);
    const progress = vi.fn();
    expect(await askRequest(root, "image-upload", { file: "a.png" }, { progress })).toEqual({ src: "/uploads/a.png" });
    expect(progress.mock.calls).toEqual([[1, 2], [2, 2]]);
  });

  it("rejects with the abort reason before the answer, and aborts the responder's signal", async () => {
    const { root } = editorRoot();
    let seen: AbortSignal | undefined;
    root.addEventListener("mention-query", (event) => respondWithFunction(event, (_detail, { signal }) => {
      seen = signal;
      return new Promise(() => {});
    }));
    const controller = new AbortController();
    const asked = askRequest(root, "mention-query", { query: "ad" }, { signal: controller.signal });
    controller.abort(new DOMException("Superseded", "AbortError"));
    await expect(asked).rejects.toMatchObject({ name: "AbortError", message: "Superseded" });
    expect(seen?.aborted).toBe(true);
  });

  it("ignores announcements from outside the editor's ancestry", () => {
    const { root } = editorRoot();
    const elsewhere = document.body.appendChild(document.createElement("aside"));
    const announced = vi.fn();
    cleanups.push(onResponderAnnounced(root, announced));
    elsewhere.dispatchEvent(new CustomEvent("responder", { bubbles: true, detail: { name: "extensions" } }));
    expect(announced).not.toHaveBeenCalled();
    document.dispatchEvent(new CustomEvent("responder", { detail: { name: "extensions" } }));
    expect(announced.mock.calls).toEqual([["extensions"]]);
  });
});
