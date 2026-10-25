import { JSDOM } from "jsdom";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import Skeleton from "../vue/UiSkeleton.js";
import StatusMessage from "../vue/UiStatusMessage.js";

describe("Skeleton before upgrade", () => {
  it("renders an empty decorative placeholder without a focus target or announcement", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(Skeleton) }));
    const element = new JSDOM(html).window.document.body.firstElementChild!;
    expect(element.tagName).toBe("SPAN");
    expect(element.getAttribute("aria-hidden")).toBe("true");
    expect(element.textContent).toBe("");
    expect(element.hasAttribute("tabindex")).toBe(false);
    expect(element.hasAttribute("role")).toBe(false);
    expect(element.hasAttribute("aria-live")).toBe(false);
  });

  it("ships dimensions and shape with the server markup", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(Skeleton, {
      shape: "rectangle", width: "75%", height: "6rem", animated: true,
    }) }));
    const element = new JSDOM(html).window.document.body.firstElementChild as HTMLElement;
    expect(element.style.getPropertyValue("--ui-skeleton-width")).toBe("75%");
    expect(element.style.getPropertyValue("--ui-skeleton-height")).toBe("6rem");
    expect(html).toContain("rectangle");
    expect(html).toContain("animated");
  });

  it("lets a single status describe a region containing several placeholders", async () => {
    const html = await renderToString(createSSRApp({ render: () => [
      h(StatusMessage, { kind: "loading" }, () => "Loading a profile"),
      h("section", { "aria-busy": "true", "aria-label": "Profile" }, [
        h(Skeleton, { shape: "circle" }), h(Skeleton), h(Skeleton),
      ]),
    ] }));
    const document = new JSDOM(html).window.document;
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(document.querySelector('section[aria-busy="true"]')?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
    expect(document.querySelector('[role="status"]')?.textContent).toContain("Loading a profile");
  });
});
