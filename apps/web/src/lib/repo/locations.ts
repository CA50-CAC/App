/**
 * Small helpers for saveLocations, shared by both adapters.
 */

export function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
  }
  return out;
}

/** Name pairs to (a, b) id pairs with a < b, skipping unknown names and self-links. */
export function linkPairs(saved: { id: string; name: string }[], links: Array<[string, string]>): Array<[string, string]> {
  const idOf = new Map(saved.map((l) => [l.name, l.id]));
  const out = new Map<string, [string, string]>();
  for (const [x, y] of links) {
    const a = idOf.get(x.trim());
    const b = idOf.get(y.trim());
    if (!a || !b || a === b) continue;
    const pair: [string, string] = a < b ? [a, b] : [b, a];
    out.set(pair.join(":"), pair);
  }
  return [...out.values()];
}
