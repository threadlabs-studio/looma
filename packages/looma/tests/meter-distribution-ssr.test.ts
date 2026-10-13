import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import Meter from "../vue/UiMeter.js";

// A distribution is a categorical image, not a reading of one progress value.
describe("Meter distribution server render", () => {
  it("renders proportional parts and their complete description before JavaScript", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(Meter, {
      variant: "distribution", label: "Requests by outcome", valueText: "2 waiting, 5 accepted, 2 declined",
      parts: [{ value: 2, color: "#789168" }, { value: 5, color: "#b97731" }, { value: 2, color: "#533b29" }],
    }) }));
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Requests by outcome: 2 waiting, 5 accepted, 2 declined"');
    expect(html).not.toContain("aria-valuenow");
    expect(html).toContain("flex-grow:5;");
    expect(html).toContain("background-color:#b97731;");
  });
  it("keeps empty distributions empty and omits nonpositive parts", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(Meter, {
      variant: "distribution", label: "No requests", parts: [{ value: 0, color: "red" }, { value: -1, color: "blue" }],
    }) }));
    expect(html).toContain('role="img"');
    expect(html).not.toContain('class="part"');
    expect(html).not.toContain('class="fill"');
  });
});
