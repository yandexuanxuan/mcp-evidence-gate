import type { Finding } from "./types.js";

export interface FreshnessOptions {
  now: Date;
}

const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function parseStrictDateTime(value: string): number | undefined {
  const match = RFC3339_DATE_TIME.exec(value);
  if (!match) return undefined;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return undefined;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function evaluateFreshness(
  expiresAt: unknown,
  options: FreshnessOptions
): Finding {
  if (!(options.now instanceof Date) || Number.isNaN(options.now.getTime())) {
    throw new Error("invalid_now");
  }
  if (typeof expiresAt !== "string" || expiresAt.length === 0) {
    return { id: "freshness", status: "not_present", reason: "freshness_not_declared" };
  }
  const expiry = parseStrictDateTime(expiresAt);
  if (expiry === undefined) {
    return { id: "freshness", status: "invalid", reason: "malformed_timestamp" };
  }
  const now = options.now.getTime();
  if (expiry <= now) {
    return { id: "freshness", status: "inconclusive", reason: "stale_scan", actual: expiresAt };
  }
  return { id: "freshness", status: "pass", actual: expiresAt };
}
