const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export function formatRelativeTimeUk(
  value: Date | string,
  now = new Date(),
): string {
  const date = new Date(value);
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < MINUTE_MS) return "щойно";

  const minutes = Math.floor(diffMs / MINUTE_MS);
  if (minutes < 60) {
    return `${minutes} хв тому`;
  }

  const hours = Math.floor(diffMs / HOUR_MS);
  if (hours < 24) {
    return `${hours} год тому`;
  }

  const days = Math.floor(diffMs / DAY_MS);
  if (days < 7) {
    return `${days}д тому`;
  }

  const weeks = Math.floor(diffMs / WEEK_MS);
  if (weeks < 5) {
    return `${weeks} тиж тому`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} міс тому`;
  }

  const years = Math.floor(days / 365);
  return `${years} р тому`;
}
