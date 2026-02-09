export function hasMatchProp(v: unknown): v is { match: unknown } {
  return !!v && typeof v === 'object' && 'match' in (v as any);
}
export function notFoundFallback(children?: any) {
  // Minimal fallback; keeps UI alive instead of crashing
  return children ?? null;
}
