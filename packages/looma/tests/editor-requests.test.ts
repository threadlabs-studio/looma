// @vitest-environment jsdom
import { RequestEvent } from "@nextwebwg/html-next/runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { onResponderAnnounced, respondWithFunction } from "../src/editor/requests";

const { request, respond, hasResponder } = RequestEvent;
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
  it("answers with a responder function, nearest first, with its signal and progress", async () => {
    const { region, root } = editorRoot();
    expect(await request(root, "link-resolve", { href: "/a" })).toBeNull();
    cleanups.push(respond(document, "link-resolve", () => "document"));
    region.addEventListener("link-resolve", (event) => respondWithFunction(event, ({ href }: { href: string }, { progress }) => {
      progress(1, 1);
      return `region ${href}`;
    }));
    const progress = vi.fn();
    expect(await request(root, "link-resolve", { href: "/a" }, { progress })).toBe("region /a");
    expect(progress.mock.calls).toEqual([[1, 1]]);
  });

  it("hears announcements from the editor's ancestry only, which also makes the responder known", () => {
    const { root } = editorRoot();
    const elsewhere = document.body.appendChild(document.createElement("aside"));
    const announced = vi.fn();
    cleanups.push(onResponderAnnounced(root, announced));
    cleanups.push(respond(elsewhere, "extensions", () => []));
    expect(announced).not.toHaveBeenCalled();
    expect(hasResponder(root, "extensions")).toBe(false);
    const stop = respond(document, "image-upload", () => null);
    expect(announced.mock.calls).toEqual([["image-upload"]]);
    expect(hasResponder(root, "image-upload")).toBe(true);
    stop();
    expect(hasResponder(root, "image-upload")).toBe(false);
  });
});
