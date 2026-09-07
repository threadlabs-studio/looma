import axe from "axe-core";
import { beforeEach, describe, expect, it } from "vitest";

const flushStencil = async () => {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
};

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("ui-dialog accessible name (real browser)", () => {
  it("derives a reactive native-dialog name from authored heading content", async () => {
    document.body.innerHTML = `
      <main id="dialog-surface">
        <ui-dialog open>
          <h2>Invite a teammate</h2>
          <button type="button">Cancel</button>
        </ui-dialog>
      </main>
    `;
    await flushStencil();

    const host = document.querySelector("ui-dialog")!;
    const heading = host.querySelector("h2")!;
    const dialog = host.shadowRoot!.querySelector("dialog")!;
    expect(dialog.getAttribute("aria-label")).toBe("Invite a teammate");

    heading.textContent = "Invite a reviewer";
    await flushStencil();
    expect(dialog.getAttribute("aria-label")).toBe("Invite a reviewer");

    const result = await axe.run(document.getElementById("dialog-surface")!);
    expect(result.violations, result.violations.map((violation) => violation.id).join(", ")).toEqual([]);
  });

  it("gives the explicit label precedence over slotted headings", async () => {
    document.body.innerHTML = `
      <ui-dialog label="Version history">
        <h2>Recent changes</h2>
      </ui-dialog>
    `;
    await flushStencil();

    const host = document.querySelector("ui-dialog")!;
    const dialog = host.shadowRoot!.querySelector("dialog")!;
    expect(dialog.getAttribute("aria-label")).toBe("Version history");

    host.removeAttribute("label");
    await flushStencil();
    expect(dialog.getAttribute("aria-label")).toBe("Recent changes");

    host.querySelector("h2")!.remove();
    await flushStencil();
    expect(dialog.getAttribute("aria-label")).toBe("Dialog");
  });
});
