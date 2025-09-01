export const toUnixMs = (d: Date | number) => (d instanceof Date ? d.getTime() : d);
export const nowMs = () => Date.now();

export function msUntilEndOfDay(now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end.getTime() - now.getTime();
}
