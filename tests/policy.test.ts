import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  evaluatePolicy,
  PERMISSIVE_POLICY,
  STRICT_RELEASE_EXAMPLE_POLICY
} from "../src/core/policy.js";
import { verifyReceipt } from "../src/core/verify.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = resolve(root, "fixtures/artifacts/current-artifact.bin");
const now = new Date("2026-08-25T00:00:00Z");
const fixture = async (name: string) =>
  JSON.parse(await readFile(resolve(root, "fixtures", name), "utf8"));

async function verifiedReceipt(overrides: Record<string, unknown> = {}) {
  const base = await fixture("valid/complete-clean.json");
  const receipt = { ...base, freshness_expires_at: "2026-08-26T00:00:00Z", ...overrides };
  return { receipt, verification: await verifyReceipt(receipt, artifactPath, now) };
}

describe("deterministic policy decisions", () => {
  it("passes a bound and fresh clean receipt under permissive policy", async () => {
    const { receipt, verification } = await verifiedReceipt();
    const result = evaluatePolicy(receipt, verification, PERMISSIVE_POLICY);
    expect(result).toMatchObject({ decision: "pass", receiptVerdict: "clean" });
    expect(result.reasons).toHaveLength(0);
  });

  it("does not turn digest mismatch into a server safety claim", async () => {
    const { receipt, verification } = await verifiedReceipt({
      scanned_artifact_digest: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
    });
    const result = evaluatePolicy(receipt, verification, PERMISSIVE_POLICY);
    expect(result).toMatchObject({ decision: "inconclusive", receiptVerdict: "clean" });
    expect(result.reasons).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "artifact_digest_mismatch" })])
    );
  });

  it("maps stale evidence to inconclusive", async () => {
    const { receipt, verification } = await verifiedReceipt({
      freshness_expires_at: "2026-08-24T00:00:00Z"
    });
    const result = evaluatePolicy(receipt, verification, PERMISSIVE_POLICY);
    expect(result.decision).toBe("inconclusive");
  });

  it("makes optional freshness policy-dependent", async () => {
    const { receipt, verification } = await verifiedReceipt();
    delete receipt.freshness_expires_at;
    const withoutFreshness = await verifyReceipt(receipt, artifactPath, now);
    expect(evaluatePolicy(receipt, withoutFreshness, PERMISSIVE_POLICY).decision).toBe("pass");
    expect(evaluatePolicy(receipt, withoutFreshness, STRICT_RELEASE_EXAMPLE_POLICY).decision).toBe("fail");
  });

  it("applies required scopes without changing structural validity", async () => {
    const { receipt, verification } = await verifiedReceipt({
      scan_scope: ["package"],
      attestation: "third-party-attested"
    });
    const result = evaluatePolicy(receipt, verification, STRICT_RELEASE_EXAMPLE_POLICY);
    expect(result.decision).toBe("inconclusive");
    expect(result.reasons).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "required_scope_missing" })])
    );
    expect(verification.checks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "receipt_structure", status: "pass" })])
    );
  });

  it("accepts unknown scope strings when no policy requires them", async () => {
    const { receipt, verification } = await verifiedReceipt({ scan_scope: ["future-scope"] });
    expect(evaluatePolicy(receipt, verification, PERMISSIVE_POLICY).decision).toBe("pass");
  });

  it("uses attestation allow-lists, not an invented trust hierarchy", async () => {
    const { receipt, verification } = await verifiedReceipt({ attestation: "publisher-asserted" });
    const result = evaluatePolicy(receipt, verification, STRICT_RELEASE_EXAMPLE_POLICY);
    expect(result.decision).toBe("fail");
    expect(result.reasons).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "attestation_not_allowed" })])
    );
  });

  it("maps warnings, findings, and inconclusive receipt verdicts separately", async () => {
    const warnings = await verifiedReceipt({ verdict: "warnings" });
    const findings = await verifiedReceipt({ verdict: "findings" });
    const inconclusive = await verifiedReceipt({ verdict: "inconclusive", inconclusive_reason: "stale_scan" });
    expect(evaluatePolicy(warnings.receipt, warnings.verification, PERMISSIVE_POLICY).decision).toBe("warn");
    expect(evaluatePolicy(findings.receipt, findings.verification, PERMISSIVE_POLICY).decision).toBe("fail");
    expect(evaluatePolicy(inconclusive.receipt, inconclusive.verification, PERMISSIVE_POLICY).decision).toBe("inconclusive");
  });

  it("short-circuits structurally invalid receipts to fail", async () => {
    const receipt = { verdict: "clean" };
    const verification = await verifyReceipt(receipt, "/definitely/not/exist.tgz", now);
    const result = evaluatePolicy(receipt, verification, PERMISSIVE_POLICY);
    expect(result).toMatchObject({ decision: "fail", receiptVerdict: "clean" });
    expect(verification.checks).toHaveLength(1);
  });

  it("does not mutate the receipt input", async () => {
    const { receipt, verification } = await verifiedReceipt({ verdict: "warnings" });
    const before = JSON.stringify(receipt);
    evaluatePolicy(receipt, verification, PERMISSIVE_POLICY);
    expect(JSON.stringify(receipt)).toBe(before);
  });
});
