// Renders ui-meter on the server through the built Vue components (run `pnpm build` first). The bar's
// fill and its ARIA values come from the props as it renders, so the server's HTML shows and states
// the value with no JavaScript.
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import Meter from "../vue/UiMeter.js";

const render = async (props: Record<string, unknown>) => {
  const html = await renderToString(createSSRApp({ render: () => h(Meter, props) }));
  const root = /^<span\b[^>]*>/.exec(html)![0];
  const attribute = (name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(root)?.[1];
  const fill = Number(/class="fill" style="inline-size:([\d.]+)%;"/.exec(html)?.[1]);
  return { attribute, fill, html };
};

describe("Meter server render", () => {
  it("draws the fill and states its value, name, and bounds", async () => {
    const meter = await render({ value: 750, max: 1240, label: "Collected", valueText: "$750 of $1,240 collected" });
    expect(meter.fill).toBeCloseTo(60.48, 2);
    expect(meter.attribute("role")).toBe("meter");
    expect(meter.attribute("aria-label")).toBe("Collected");
    expect(meter.attribute("aria-valuemin")).toBe("0");
    expect(meter.attribute("aria-valuemax")).toBe("1240");
    expect(meter.attribute("aria-valuenow")).toBe("750");
    expect(meter.attribute("aria-valuetext")).toBe("$750 of $1,240 collected");
  });

  it("reads the whole percentage without valueText, and names nothing without a label", async () => {
    const meter = await render({ value: 0.29 });
    expect(meter.fill).toBeCloseTo(29, 6);
    expect(meter.attribute("aria-valuemax")).toBe("1");
    expect(meter.attribute("aria-valuetext")).toBe("29%");
    expect(meter.attribute("aria-label")).toBeUndefined();
    expect((await render({ value: 2, max: 3 })).attribute("aria-valuetext")).toBe("67%");
  });

  it("clamps the value to the track: empty below 0, full above max, empty without a max above 0", async () => {
    for (const [props, fill, now, text] of [
      [{ value: -5, max: 10 }, 0, "0", "0%"],
      [{ value: 0, max: 10 }, 0, "0", "0%"],
      [{ value: 10, max: 10 }, 100, "10", "100%"],
      [{ value: 15, max: 10 }, 100, "10", "100%"],
      [{ value: 3, max: 0 }, 0, "0", "0%"],
    ] as const) {
      const meter = await render(props);
      expect(meter.fill, JSON.stringify(props)).toBe(fill);
      expect(meter.attribute("aria-valuenow"), JSON.stringify(props)).toBe(now);
      expect(meter.attribute("aria-valuetext"), JSON.stringify(props)).toBe(text);
    }
  });

  it("records its tone and size for its styles", async () => {
    const state = (await render({ value: 1, tone: "success", size: "sm" })).attribute("data-ui-meter-state")!.split(" ");
    expect(state).toEqual(expect.arrayContaining(["tone=success", "size=sm"]));
    expect((await render({})).attribute("data-ui-meter-state")!.split(" ")).toEqual(expect.arrayContaining(["tone=neutral", "size=md"]));
  });

  it("renders a continuous meter as before unless segments is 2 or more, and records the count for its styles", async () => {
    const plain = (await render({ value: 4, max: 6 })).html;
    for (const segments of [0, 1]) expect((await render({ value: 4, max: 6, segments })).html).toBe(plain);
    expect(plain).not.toContain("data-ui-meter-segments");

    const steps = await render({ value: 4, max: 6, segments: 6, label: "Status", valueText: "Shipped, step 4 of 6" });
    expect(steps.attribute("data-ui-meter-segments")).toBe("6");
    expect(steps.fill).toBeCloseTo(66.67, 2);
    expect(steps.attribute("role")).toBe("meter");
    expect(steps.attribute("aria-valuemax")).toBe("6");
    expect(steps.attribute("aria-valuenow")).toBe("4");
    expect(steps.attribute("aria-valuetext")).toBe("Shipped, step 4 of 6");
  });
});
