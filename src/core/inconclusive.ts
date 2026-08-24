import { REGISTRY_PR_1404_PROFILE } from "../profiles/registry-pr-1404.js";
import type { Finding } from "./types.js";

export function validateInconclusiveReason(verdict: unknown, reason: unknown): Finding {
  if (verdict !== "inconclusive") {
    return {
      id: "inconclusive_reason",
      status: "not_present",
      reason: "inconclusive_reason_not_required"
    };
  }
  if (typeof reason !== "string" || reason.length === 0) {
    return {
      id: "inconclusive_reason",
      status: "invalid",
      reason: "inconclusive_reason_missing"
    };
  }
  const allowedReasons: readonly string[] = REGISTRY_PR_1404_PROFILE.inconclusiveReasons;
  if (!allowedReasons.includes(reason)) {
    return {
      id: "inconclusive_reason",
      status: "invalid",
      reason: "unknown_inconclusive_reason"
    };
  }
  return { id: "inconclusive_reason", status: "pass" };
}
