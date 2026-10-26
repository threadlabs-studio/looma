import { fileURLToPath } from "node:url";
import { build } from "vite";
import { expect, it } from "vitest";

// Native consumers receive production CSS, including the defaults used by the
// package-shipped documentation builder. Check declarations after minification:
// standard-first prefix pairs can lose the standard property in Vite 8.
async function productionCSS(name: string) {
  const cssPath = fileURLToPath(new URL(name === "theme-system" ? "../src/tokens/theme-system.css" : `../styles/ui-${name}.css`, import.meta.url));
  const result = await build({
    configFile: false, publicDir: false, logLevel: "silent", mode: "production",
    plugins: [{
      name: "material-css-consumer",
      resolveId(id) { if (id === "virtual:material-css") return "\0material-css"; },
      load(id) { if (id === "\0material-css") return `import ${JSON.stringify(cssPath)};`; },
    }],
    build: { write: false, target: "es2022", rolldownOptions: { input: "virtual:material-css" } },
  });
  const css = (Array.isArray(result) ? result : [result]).flatMap(output => "output" in output ? output.output : [])
    .filter(asset => asset.type === "asset" && asset.fileName.endsWith(".css"))
    .map(asset => asset.type === "asset" ? String(asset.source) : "").join("\n");
  return css;
}

it.each(["card", "popover", "dialog", "menu", "tooltip"])("retains standard blur and opaque fallbacks in production %s CSS", async name => {
  const css = await productionCSS(name);
  expect(css).toMatch(/(?:^|[;{}])backdrop-filter:blur\(/);
  expect(css).toMatch(/(?:^|[;{}])backdrop-filter:none(?:[;}])/);
});

it.each(["checkbox", "radio"])("keeps empty-well inset separate from filled %s paint in production CSS", async name => {
  const css = await productionCSS(name);
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  expect(rules.some(([, selector, declarations]) => !selector.includes(":checked") && declarations.includes("box-shadow:var(--ui-control-inset)"))).toBe(true);
  const filled = rules.filter(([, selector, declarations]) => selector.includes("input:checked") && !/:{1,2}after\b/.test(selector) && declarations.includes("background-color:var(--ui-accent-solid)"));
  expect(filled.length).toBeGreaterThan(0);
  expect(filled.every(([, , declarations]) => declarations.includes("box-shadow:none"))).toBe(true);
});

it("uses actual foreground knob roles in both production Switch states and removes disabled ornament", async () => {
  const css = await productionCSS("switch");
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  expect(rules.some(([, selector, declarations]) => selector.includes("input") && /:{1,2}after\b/.test(selector) && declarations.includes("var(--ui-knob-highlight"))).toBe(true);
  expect(rules.some(([, selector, declarations]) => selector.includes("input:checked") && /:{1,2}after\b/.test(selector) && declarations.includes("var(--ui-knob-on-accent-highlight"))).toBe(true);
  expect(rules.some(([, selector, declarations]) => selector.includes("disabled") && /:{1,2}after\b/.test(selector) && declarations.includes("background-image:none"))).toBe(true);
});


it("preserves explicit sRGB material interpolation through production minification", async () => {
  const css = await productionCSS("theme-system");
  for (const role of ["accent", "danger", "success", "warning", "info", "surface", "neutral", "knob", "knob-on-accent"]) {
    const value = css.match(new RegExp(`--ui-${role}-highlight:([^;]+)`))?.[1];
    expect(value).toBeDefined();
    expect(value).toContain("in srgb");
  }
});

it.each(["button", "icon-button"])("keeps the derived filled-action boundary in all production %s states", async name => {
  const css = await productionCSS(name);
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const privateRole = name === "button" ? "_tone" : "_solid";
  for (const [state, selectorState] of [["", ""], ["-hover", ":hover"], ["-active", ":active"]]) {
    expect(rules.some(([, selector, declarations]) => /data-appearance=["']?solid/.test(selector)
      && (!selectorState || selector.includes(selectorState))
      && declarations.includes(`var(--${privateRole}${state}-border)`))).toBe(true);
  }
  expect(rules.some(([, selector, declarations]) => /data-tone=["']?neutral/.test(selector)
    && declarations.includes("var(--ui-neutral-hover-border"))).toBe(true);
});
