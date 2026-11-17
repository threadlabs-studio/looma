// A blocked top overlay still owns the request. The overlay beneath it must stay open.
export function overlayDismissalTarget(records, reason) {
  const top = records.at(-1);
  if (!top) return undefined;
  if (top.dismissible === false && (reason === "escape" || reason === "light-dismiss")) return undefined;
  return top.canClose?.(reason) === false ? undefined : top;
}
