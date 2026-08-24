import type { Finding } from "./types.js";

export interface FreshnessOptions {
  now: Date;
}

export function evaluateFreshness(
  expiresAt: unknown,
  options: FreshnessOptions
): Finding {
  if (!(options.now instanceof Date) || Number.isNaN(options.now.getTime())) {
    throw new Error("invalid_now");
  }
  if (typeof expiresAt !== "string" || expiresAt.length === 0) {
    return { id: "freshness", status: "invalid", reason: "freshness_missing" };
  }
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) {
    return { id: "freshness", status: "invalid", reason: "malformed_timestamp" };
  }
  const now = options.now.getTime();
  if (expiry <= now) {
    return { id: "freshness", status: "inconclusive", reason: "stale_scan", actual: expiresAt };
  }
  return { id: "freshness", status: "pass", actual: expiresAt };
}
