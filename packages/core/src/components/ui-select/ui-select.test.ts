import { afterEach, expect, it } from "vitest";

const flush = async () => {
  for (let index = 0; index < 3; index += 1) await new Promise(requestAnimationFrame);
};

afterEach(() => document.body.replaceChildren());

it.each([undefined, ""])("preserves omitted and explicit empty select defaults (%j)", async (initial) => {
  document.body.innerHTML = `<ui-select${initial === undefined ? "" : ' default-value=""'}><select aria-label="Role"><option value="viewer">Viewer</option><option value="editor">Editor</option></select></ui-select>`;
  await flush();

  const field = document.querySelector<HTMLElement & { value?: string; defaultValue?: string }>(`[data-component-root="ui-select"]`);
  const select = field?.querySelector("select");
  expect(field).toBeTruthy();
  expect(select?.value).toBe(initial === undefined ? "viewer" : "");

  if (!field || !select) return;
  select.value = "editor";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  field.defaultValue = "viewer";
  await flush();
  expect(select.value).toBe("editor");
});

it("updates a controlled select through its declarative property channel", async () => {
  document.body.innerHTML = `<ui-select value="editor"><select><option value="viewer">Viewer</option><option value="editor">Editor</option></select></ui-select>`;
  await flush();

  const field = document.querySelector<HTMLElement & { value?: string }>(`[data-component-root="ui-select"]`)!;
  const select = field.querySelector("select")!;
  expect(select.value).toBe("editor");

  field.value = "viewer";
  await flush();
  expect(select.value).toBe("viewer");
});
