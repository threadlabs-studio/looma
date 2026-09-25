// Stories render each component's own examples (packages/looma/src/components/<tag>/examples/*.html),
// the same files the docs site renders and tests. A story never writes a component's markup by hand,
// so it cannot drift from the component: a story that did once slotted a native <input> into a
// Checkbox that draws its own, and showed two boxes.

const sources = import.meta.glob("../../../../packages/looma/src/components/*/examples/*.html", {
  query: "?raw",
  import: "default",
  eager: true
}) as Record<string, string>;

interface Example {
  title: string;
  description: string;
  html: string;
}

export function componentExamples(tag: string): Example[] {
  return Object.entries(sources)
    .filter(([file]) => file.includes(`/components/${tag}/examples/`))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, source]) => {
      const front = source.match(/^\s*<!--([\s\S]*?)-->/);
      const field = (name: string) => front?.[1].match(new RegExp(`^\\s*${name}:\\s*(.+)$`, "m"))?.[1].trim() ?? "";
      return { title: field("title"), description: field("description"), html: source.replace(/^\s*<!--[\s\S]*?-->\s*/, "") };
    });
}

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** The component's first example, with the story's args set on the component. */
export function renderExample(tag: string, args: Record<string, unknown> = {}): DocumentFragment {
  const [example] = componentExamples(tag);
  const template = document.createElement("template");
  template.innerHTML = example?.html ?? `<${tag}></${tag}>`;
  const root = template.content.querySelector(tag);
  for (const [name, value] of Object.entries(args)) {
    if (!root || value === undefined || value === "") continue;
    const attribute = kebab(name);
    if (value === false) root.removeAttribute(attribute);
    else root.setAttribute(attribute, value === true ? "" : String(value));
  }
  return template.content;
}

/** Every example, each under its title and description. */
export function renderAllExamples(tag: string): HTMLElement {
  const container = document.createElement("div");
  container.style.cssText = "display: grid; gap: 2.5rem;";
  for (const example of componentExamples(tag)) {
    const section = document.createElement("section");
    section.style.cssText = "display: grid; gap: 0.75rem;";
    const heading = document.createElement("h3");
    heading.textContent = example.title;
    heading.style.cssText = "margin: 0; font-size: 0.875rem;";
    const description = document.createElement("p");
    description.textContent = example.description;
    description.style.cssText = "margin: 0; font-size: 0.875rem; color: var(--ui-text-muted);";
    const stage = document.createElement("div");
    stage.innerHTML = example.html;
    section.append(heading, description, stage);
    container.append(section);
  }
  return container;
}
