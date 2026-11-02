import postcss from "postcss";
import { component, componentProps, connectNode, type SceneComponent } from "./component";
import type { NativeSceneComponent, SceneNode, SceneSlots, SceneValue } from "./scene";

const attributes: Record<string, string> = { class: "className", for: "htmlFor", tabindex: "tabIndex", readonly: "readOnly", autofocus: "autoFocus", autocomplete: "autoComplete", maxlength: "maxLength", minlength: "minLength", colspan: "colSpan", rowspan: "rowSpan", contenteditable: "contentEditable", spellcheck: "spellCheck" };
export function jsxProps(node: SceneNode): Record<string, any> {
  const type = component(node.type);
  const props = Object.fromEntries(Object.entries(componentProps(node)).map(([name, value]) => [type?.props.includes(name) ? name : attributes[name] ?? name, value]));
  if (typeof props.style === "string") {
    const rule = postcss.parse(`x { ${props.style} }`).first;
    props.style = Object.fromEntries(rule?.type === "rule" ? rule.nodes.flatMap(declaration => declaration.type !== "decl" ? [] : [[declaration.prop.startsWith("--") ? declaration.prop : declaration.prop.replace(/^-ms-/, "ms-").replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), declaration.value]]) : []);
  }
  if (typeof node.type === "string" && ["input", "textarea", "select"].includes(node.type)) {
    if ("value" in props) { props.defaultValue = props.value; delete props.value; }
    if ("checked" in props) { props.defaultChecked = props.checked; delete props.checked; }
  }
  return props;
}

export function jsxOutput(createElement: (...args: any[]) => any, Wrapper: any, Native: any, NativeFixture: any) {
  const output = (value: SceneValue): any => {
    if (Array.isArray(value)) return value.map(output);
    if (value === null || typeof value !== "object") return value;
    const node = value as SceneNode;
    const type = component(node.type);
    if (type) return createElement(Wrapper, { key: node.props.key, scene: node });
    if (node.type && typeof node.type === "object" && "kind" in node.type && node.type.kind === "native-scene") return createElement(NativeFixture, { key: node.props.key, scene: node });
    return createElement(Native, { key: node.props.key, scene: node });
  };
  const children = (node: SceneNode, type?: SceneComponent) => {
    const source = node.children;
    const values: Record<string, any> = {};
    const slot = (name: string, render: (props?: any) => SceneValue) => {
      const scoped = (type?.slots.find(slot => slot.name === name || name === "default" && slot.name === "")?.props.length ?? 0) > 0;
      return scoped ? (props: any) => output(render(props)) : output(render());
    };
    if (typeof source === "function") return { children: slot("default", source) };
    if (source && typeof source === "object" && !Array.isArray(source) && !("type" in source && "props" in source)) {
      for (const [name, render] of Object.entries(source as SceneSlots)) values[name] = slot(name, render);
      const { default: defaultChildren, ...slots } = values;
      return { children: defaultChildren, ...(Object.keys(slots).length > 0 ? { slots } : {}) };
    }
    return { children: output(source as SceneValue) };
  };
  return { output, children };
}
export { component, connectNode };
export type { NativeSceneComponent };
