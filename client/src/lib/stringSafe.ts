export function ensureString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Safe wrapper for String.prototype.match */
export function safeMatch(input: unknown, re: RegExp): RegExpMatchArray | null {
  if (typeof input !== "string") return null;
  try { return input.match(re); } catch { return null; }
}

/** Boolean check: does input match re? */
export function isMatch(input: unknown, re: RegExp): boolean {
  return !!safeMatch(input, re);
}

/** Return first capture group or empty string */
export function firstMatch(input: unknown, re: RegExp, group = 1): string {
  const m = safeMatch(input, re);
  return (m && m[group]) || "";
}
