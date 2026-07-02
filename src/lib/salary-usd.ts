const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  UAH: 1 / 41,
  GBP: 1.27,
};

export function salaryToUsd(amount: number, currency: string | null | undefined) {
  const code = (currency ?? "USD").toUpperCase();
  const rate = USD_RATES[code] ?? 1;
  return Math.round(amount * rate);
}

export function buildCompensationHistogram(
  salariesUsd: number[],
  bucketSize = 1000,
) {
  if (salariesUsd.length === 0) {
    return { curve: [], scatter: [] };
  }

  const min = Math.floor(Math.min(...salariesUsd) / bucketSize) * bucketSize;
  const max = Math.ceil(Math.max(...salariesUsd) / bucketSize) * bucketSize;

  const buckets = new Map<number, number>();
  for (let value = min; value <= max; value += bucketSize) {
    buckets.set(value, 0);
  }

  for (const salary of salariesUsd) {
    const bucket = Math.floor(salary / bucketSize) * bucketSize;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  const curve = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([salaryUsd, count]) => ({ salaryUsd, count }));

  const scatter = salariesUsd.map((salaryUsd, index) => ({
    salaryUsd,
    density: 0.35 + (index % 5) * 0.08,
  }));

  return { curve, scatter };
}
