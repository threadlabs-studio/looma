// Retarget Looma's shipped light-DOM compatibility stylesheet to lowered HTML Next roots.
// The original custom-element tag is replaced during lowering, while data-component-root retains
// the component identity as a space-separated token list (including nested/composite roots).

function kebab(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function convertLightDomStyles(css, { contracts = {} } = {}) {
  let converted = css;
  for (const [tag, contract] of Object.entries(contracts)) {
    for (const [source, target] of Object.entries(contract.stateAttributes ?? {})) {
      const attribute = new RegExp(`(${escapeRegExp(tag)}(?:\\[[^\\]]+\\])*\\[)${escapeRegExp(source)}(?=\\s*(?:[~|^$*]?=|\\]))`, "g");
      converted = converted.replace(attribute, `$1${target}`);
    }
    for (const [name, prop] of Object.entries(contract.props)) {
      const dataAttribute = `data-${kebab(name)}`;
      const aliases = new Set([prop.attribute ?? kebab(name), dataAttribute]);
      for (const attribute of aliases) {
        const prefix = `${escapeRegExp(tag)}(?:\\[[^\\]]+\\])*\\[`;
        const presence = new RegExp(`(${prefix})${escapeRegExp(attribute)}(\\s*\\])`, "g");
        converted = converted.replace(
          presence,
          `$1${dataAttribute}${prop.type === "boolean" ? "='true'" : ""}$2`,
        );
        const valued = new RegExp(`(${prefix})${escapeRegExp(attribute)}(?=\\s*[~|^$*]?=)`, "g");
        converted = converted.replace(valued, `$1${dataAttribute}`);
      }
    }
  }
  return converted.replace(/([^{}]+)\{/g, (block, prelude) => {
    if (prelude.trimStart().startsWith("@")) return block;
    const selector = prelude.replace(
      /(?<![-\w.#])ui-[a-z0-9]+(?:-[a-z0-9]+)*(?![-\w])/g,
      (tag) => `[data-component-root~="${tag}"]`,
    );
    return `${selector}{`;
  });
}
