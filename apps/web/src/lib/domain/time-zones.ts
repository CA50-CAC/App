/** US time zones first (our schools), then every other zone the runtime knows. */
const COMMON = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Phoenix",
  "America/Chicago",
  "America/New_York",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export function timeZoneOptions(current?: string): string[] {
  let all: string[] = [];
  try {
    all = Intl.supportedValuesOf("timeZone");
  } catch {
    all = [];
  }
  const rest = all.filter((z) => !COMMON.includes(z));
  const list = [...COMMON, ...rest];
  if (current && !list.includes(current)) list.unshift(current);
  return list;
}
