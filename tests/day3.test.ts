import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluateFreshness } from "../src/core/freshness.js";
import { validateInconclusiveReason } from "../src/core/inconclusive.js";
import { validateScanScope } from "../src/core/scope.js";
import { verifyReceiptEvidence } from "../src/core/verify.js";

const now = new Date("2026-08-25T00:00:00Z");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = resolve(root, "fixtures/artifacts/current-artifact.bin");
const fixture = async (name: string) =>
  JSON.parse(await readFile(resolve(root, "fixtures", name), "utf8"));

describe("strict RFC3339 freshness", () => {
  it("accepts timezone-bearing date-time values", () => {
    expect(evaluateFreshness("2026-08-26T00:00:00Z", { now }).status).toBe("pass");
    expect(evaluateFreshness("2026-08-26T08:00:00+08:00", { now }).status).toBe("pass");
    expect(evaluateFreshness("2026-08-26t00:00:00z", { now }).status).toBe("pass");
  });

  it("rejects date-only, timezone-less, and impossible values", () => {
    for (const value of ["2026-08-26", "2026-08-26T00:00:00", "2026-02-30T00:00:00Z"]) {
      expect(evaluateFreshness(value, { now })).toMatchObject({
        id: "freshness",
        status: "invalid",
        reason: "malformed_timestamp"
      });
    }
  });

  it("distinguishes missing from present-but-invalid freshness", () => {
    expect(evaluateFreshness(undefined, { now })).toMatchObject({
      status: "not_present",
      reason: "freshness_not_declared"
    });
    expect(evaluateFreshness(123, { now })).toMatchObject({
      status: "invalid",
      reason: "malformed_timestamp"
    });
    expect(evaluateFreshness("", { now })).toMatchObject({
      status: "invalid",
      reason: "malformed_timestamp"
    });
  });
});

describe("scan scope", () => {
  it("requires a non-empty array of strings but accepts future scope names", () => {
    expect(validateScanScope([])).toMatchObject({ status: "invalid", reason: "scan_scope_empty" });
    expect(validateScanScope("package")).toMatchObject({ status: "invalid", reason: "scan_scope_not_array" });
    expect(validateScanScope(["package", 123])).toMatchObject({
      status: "invalid",
      reason: "scan_scope_item_not_string"
    });
    expect(validateScanScope(["future-scope"])).toMatchObject({ status: "pass" });
  });
});

describe("conditional inconclusive reason", () => {
  it("does not require a reason for clean", () => {
    expect(validateInconclusiveReason("clean", undefined)).toMatchObject({
      status: "not_present",
      reason: "inconclusive_reason_not_required"
    });
  });

  it("requires one of the five upstream reasons for inconclusive", () => {
    expect(validateInconclusiveReason("inconclusive", undefined)).toMatchObject({
      status: "invalid",
      reason: "inconclusive_reason_missing"
    });
    expect(validateInconclusiveReason("inconclusive", "stale_scan")).toMatchObject({ status: "pass" });
    expect(validateInconclusiveReason("inconclusive", "future-reason")).toMatchObject({
      status: "invalid",
      reason: "unknown_inconclusive_reason"
    });
  });
});

describe("fixture-backed receipt aggregation", () => {
  it("keeps optional freshness separate from invalid conformance", async () => {
    const result = await verifyReceiptEvidence(
      await fixture("valid/clean-no-freshness.json"),
      artifactPath,
      now
    );
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "artifact_binding", status: "pass" }),
        expect.objectContaining({ id: "freshness", status: "not_present" }),
        expect.objectContaining({ id: "scan_scope", status: "pass" }),
        expect.objectContaining({ id: "inconclusive_reason", status: "not_present" })
      ])
    );
  });

  it("accepts future scope names and rejects conditional reason violations", async () => {
    const futureScope = await verifyReceiptEvidence(await fixture("valid/unknown-scope.json"), artifactPath, now);
    expect(futureScope.checks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "scan_scope", status: "pass" })])
    );

    const missingReason = await verifyReceiptEvidence(
      await fixture("invalid/inconclusive-missing-reason.json"),
      artifactPath,
      now
    );
    expect(missingReason.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "inconclusive_reason", status: "invalid", reason: "inconclusive_reason_missing" })
      ])
    );

    const validReason = await verifyReceiptEvidence(
      await fixture("valid/inconclusive-with-reason.json"),
      artifactPath,
      now
    );
    expect(validReason.checks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "inconclusive_reason", status: "pass" })])
    );
  });
});
