import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import Listbox from "../vue/UiListbox.js";

describe("Listbox server render", () => {
  it("keeps authored options in a usable native control before upgrade", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(Listbox, { name: "region", multiple: true, required: true }, () => [
        h("option", { value: "north", selected: true }, "North"),
        h("option", { value: "south" }, "South"),
      ]),
    }));

    expect(html).toContain('class="fallback"');
    expect(html).toMatch(/<select\b[^>]*\bname="region"/);
    expect(html).toContain('value="north" selected');
    expect(html).toContain("North");
    expect(html).toContain("South");
    expect(html).not.toContain("data-enhanced");
  });
});
