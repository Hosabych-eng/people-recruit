export function getDaysActive(from: Date | string | null | undefined) {
  if (!from) return 0;
  const start = typeof from === "string" ? new Date(from) : from;
  const diff = Date.now() - start.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function formatDaysActive(from: Date | string | null | undefined) {
  return `${getDaysActive(from)}дн`;
}
