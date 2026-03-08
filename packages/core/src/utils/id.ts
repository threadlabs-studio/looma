let nextId = 0;

export function createId(prefix: string): string {
  nextId += 1;
  return `ui-core-${prefix}-${nextId}`;
}
