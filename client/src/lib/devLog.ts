function maskKey(k?: string | null) {
  if (!k) return "(empty)";
  if (k.length <= 10) return k;
  return `${k.slice(0, 10)}…${k.slice(-4)}`;
}

export function devLog(label: string, data?: unknown) {
  if (!import.meta.env.DEV) return;
  console.log(`[dev] ${label}`, data ?? "");
}

export function devLogKey(label: string, key?: string | null) {
  if (!import.meta.env.DEV) return;
  console.log(`[dev] ${label}`, maskKey(key ?? null));
}
