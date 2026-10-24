// Restricted dimensional arithmetic: unitless factors and one matching unit, without code evaluation.
export function calculateValue(source, unit = "") {
  const text = String(source).trim();
  if (!text || text.length > 256) throw new Error("Enter a number or arithmetic expression.");
  const tokens = text.match(/(?:\d*\.?\d+(?:e[+-]?\d+)?)(?:[a-z%]+)?|[()+*/-]/gi) ?? [];
  if (tokens.join("") !== text.replace(/\s+/g, "")) throw new Error("Unsupported expression.");
  let index = 0;
  const add = () => {
    let left = multiply();
    while (["+", "-"].includes(tokens[index])) {
      const operator = tokens[index++]; const right = multiply();
      // A bare number in addition uses the field's unit.
      if (left.unit && right.unit && left.unit !== right.unit) throw new Error("Use matching units.");
      left = { number: left.number + (operator === "+" ? 1 : -1) * right.number, unit: left.unit || right.unit };
    }
    return left;
  };
  const multiply = () => {
    let left = atom();
    while (["*", "/"].includes(tokens[index])) {
      const operator = tokens[index++]; const right = atom();
      if (operator === "*" && left.unit && right.unit) throw new Error("Multiply by a unitless number.");
      if (operator === "/" && right.unit) throw new Error("Divide by a unitless number.");
      left = { number: operator === "*" ? left.number * right.number : left.number / right.number, unit: left.unit || right.unit };
    }
    return left;
  };
  const atom = () => {
    const token = tokens[index++];
    if (token === "+" || token === "-") { const value = atom(); return { ...value, number: (token === "-" ? -1 : 1) * value.number }; }
    if (token === "(") { const value = add(); if (tokens[index++] !== ")") throw new Error("Close the parentheses."); return value; }
    const match = /^(\d*\.?\d+(?:e[+-]?\d+)?)([a-z%]*)$/i.exec(token ?? "");
    if (!match) throw new Error("Enter a number.");
    if (match[2] && match[2] !== unit) throw new Error(`Use ${unit || "unitless values"}.`);
    return { number: Number(match[1]), unit: match[2] };
  };
  const result = add();
  if (index !== tokens.length || !Number.isFinite(result.number)) throw new Error("Enter a finite result.");
  return result.number;
}

export function boundedNumber(value, min, max) {
  const lower = Number.isFinite(Number(min)) ? Number(min) : -Number.MAX_VALUE;
  const upper = Number.isFinite(Number(max)) ? Number(max) : Number.MAX_VALUE;
  return Math.min(Math.max(value, Math.min(lower, upper)), Math.max(lower, upper));
}
export function numberText(value, unit = "") { return `${Number(value.toFixed(6))}${unit}`; }
