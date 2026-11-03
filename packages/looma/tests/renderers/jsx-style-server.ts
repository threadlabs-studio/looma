import postcss from "postcss";

/** Server scenes have no CSSStyleDeclaration; keep the Node parser on that side. */
export function jsxStyle(source: string): Record<string, string> {
  const rule = postcss.parse(`x { ${source} }`).first;
  return Object.fromEntries(rule?.type === "rule" ? rule.nodes.flatMap(declaration => declaration.type !== "decl" ? [] : [[declaration.prop.startsWith("--") ? declaration.prop : declaration.prop.replace(/^-ms-/, "ms-").replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), declaration.value]]) : []);
}
