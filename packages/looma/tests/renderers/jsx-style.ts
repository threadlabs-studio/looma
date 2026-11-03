import tokenize from "postcss/lib/tokenize";

/** Native serialization retains variable-bearing shorthands whose enumerated longhands are empty. */
export function jsxStyle(source: string): Record<string, string> {
  const style = document.createElement("span").style;
  style.cssText = source;
  const tokens = tokenize({ css: style.cssText }, { ignoreErrors: true });
  const values: Record<string, string> = {};
  let name = "", depth = 0;
  const append = () => {
    if (name) values[name.startsWith("--") ? name : name.replace(/^-ms-/, "ms-").replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())] = style.getPropertyValue(name);
    name = "";
  };
  while (!tokens.endOfFile()) {
    const token = tokens.nextToken();
    if (!token) break;
    if (!name && token[0] === "word") name = token[1];
    if (["(", "[", "{"].includes(token[0])) depth++;
    else if ([")", "]", "}"].includes(token[0])) depth--;
    else if (token[0] === ";" && depth === 0) append();
  }
  append();
  return values;
}
