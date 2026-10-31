/** Native accept-style filters guide selection; they never replace server-side file validation. */
export function fileRejection(files, options = {}) {
  if (!options.multiple && files.length > 1) return "Choose a single file.";
  const accepted = (options.accept ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  for (const file of files) {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    if (accepted.length && !accepted.some(rule => rule.startsWith(".") ? name.endsWith(rule)
      : rule === "*/*" ? Boolean(type) : rule.endsWith("/*") ? type.startsWith(rule.slice(0, -1)) : type === rule)) {
      return `${file.name}: choose a permitted file type.`;
    }
    if (options.maxFileSize !== undefined && options.maxFileSize !== null && file.size > options.maxFileSize) return `${file.name}: this file exceeds the permitted size.`;
  }
  return "";
}
