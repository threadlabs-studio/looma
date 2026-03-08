export function toInitials(value: string): string {
  const tokens = value
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return '?';
  if (tokens.length === 1) return tokens[0]!.slice(0, 2).toUpperCase();
  return `${tokens[0]![0] ?? ''}${tokens[1]![0] ?? ''}`.toUpperCase();
}
