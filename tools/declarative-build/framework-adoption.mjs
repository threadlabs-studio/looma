function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function preserveVueSlotRegions(source) {
  const slotCount = [...source.matchAll(/<slot(?:\s|>)/g)].length;
  const withNamedRegions = source.replace(
    /<slot name="([^"]+)"><\/slot>/g,
    '<span slot="$1" data-html-next-slot="$1" style="display: contents"><slot name="$1"></slot></span>',
  );

  // A sole default slot is already unambiguous to both Vue and the declarative
  // runtime. Keeping its children direct preserves native child combinators and
  // layout measurement for primitives such as Sidebar. Multi-region components
  // still need an explicit marker for their default region during hydration.
  if (slotCount <= 1) return withNamedRegions;
  return withNamedRegions.replace(
    /<slot><\/slot>/g,
    '<span data-html-next-slot="" style="display: contents"><slot></slot></span>',
  );
}

export function preserveVueOptionalBooleanAbsence(source, definitionSource) {
  const optionalBooleanProps = [...definitionSource.matchAll(/<prop\b([^>]*)>/g)]
    .map(([, attributes]) => ({
      attributes,
      name: attributes.match(/\bname="([^"]+)"/)?.[1],
      type: attributes.match(/\btype="([^"]+)"/)?.[1],
    }))
    .filter(({ attributes, name, type }) => name && type === "boolean" && !/\bdefault=/.test(attributes));

  for (const { name } of optionalBooleanProps) {
    const declaration = new RegExp(
      `(\\b${escapeRegExp(name)}: \\{ type: \\[Boolean, null\\], required: false)( \\})`,
    );
    if (!declaration.test(source)) {
      throw new Error(`Could not preserve undefined for optional Vue Boolean prop \`${name}\`.`);
    }
    source = source.replace(declaration, "$1, default: undefined$2");
  }
  return source;
}
