import type { Finding } from "./types.js";

export interface FreshnessOptions {
  now: Date;
  scannedAt?: unknown;
  /** Maximum accepted age for a scan, enforced by the consumer policy. */
  maxScanAgeMs?: number;
  /** Tolerance for small publisher/consumer clock differences. */
  clockSkewMs?: number;
}

const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$/;

function parseStrictDateTime(value: string): number | undefined {
  const match = RFC3339_DATE_TIME.exec(value);
  if (!match) return undefined;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return undefined;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return undefined;
  const normalized = value.replace("t", "T").replace(/z$/, "Z");
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function evaluateFreshness(
  expiresAt: unknown,
  options: FreshnessOptions
): Finding {
  if (!(options.now instanceof Date) || Number.isNaN(options.now.getTime())) {
    throw new Error("invalid_now");
  }
  const now = options.now.getTime();
  const clockSkewMs = options.clockSkewMs ?? 5 * 60 * 1000;
  let scannedAtMs: number | undefined;
  if (options.scannedAt !== undefined) {
    if (typeof options.scannedAt !== "string" || options.scannedAt.length === 0) {
      return { id: "freshness", status: "invalid", reason: "malformed_timestamp" };
    }
    scannedAtMs = parseStrictDateTime(options.scannedAt);
    if (scannedAtMs === undefined) {
      return { id: "freshness", status: "invalid", reason: "malformed_timestamp" };
    }
    if (scannedAtMs > now + clockSkewMs) {
      return {
        id: "freshness",
        status: "invalid",
        reason: "scan_timestamp_in_future",
        actual: options.scannedAt
      };
    }
  }
  if (expiresAt === undefined) {
    return { id: "freshness", status: "not_present", reason: "freshness_not_declared" };
  }
  if (typeof expiresAt !== "string" || expiresAt.length === 0) {
    return { id: "freshness", status: "invalid", reason: "malformed_timestamp" };
  }
  const expiry = parseStrictDateTime(expiresAt);
  if (expiry === undefined) {
    return { id: "freshness", status: "invalid", reason: "malformed_timestamp" };
  }
  if (scannedAtMs !== undefined && expiry < scannedAtMs) {
    return {
      id: "freshness",
      status: "invalid",
      reason: "freshness_before_scan",
      expected: options.scannedAt as string,
      actual: expiresAt
    };
  }
  if (scannedAtMs !== undefined && options.maxScanAgeMs !== undefined && now - scannedAtMs > options.maxScanAgeMs) {
    return {
      id: "freshness",
      status: "inconclusive",
      reason: "scan_too_old",
      actual: options.scannedAt
    };
  }
  if (expiry <= now) {
    return { id: "freshness", status: "inconclusive", reason: "stale_scan", actual: expiresAt };
  }
  return { id: "freshness", status: "pass", actual: expiresAt };
}
