/** Native HTML heading alignment shared by the editor schema and portable conversion. */
export function isHeadingAlignment(value: unknown): value is "left" | "center" | "right" | "justify" {
  return typeof value === "string" && /^(left|center|right|justify)$/.test(value);
}
