import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluateReceiptSet } from "../src/core/composition.js";
import { evaluatePolicy, PERMISSIVE_POLICY } from "../src/core/policy.js";
import { verifyReceipt } from "../src/core/verify.js";
import type { ReceiptInput } from "../src/core/types.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifact = resolve(root, "fixtures/artifacts/current-artifact.bin");
const validReceipt = (name: string) => resolve(root, "fixtures/valid", name);
const invalidReceipt = (name: string) => resolve(root, "fixtures/invalid", name);
const now = new Date("2026-08-25T00:00:00Z");

async function load(path: string): Promise<ReceiptInput> {
  return JSON.parse(await readFile(path, "utf8")) as ReceiptInput;
}

describe("multi-receipt composition", () => {
  it("keeps a single receipt decision equivalent to the existing verifier path", async () => {
    const receipt = await load(validReceipt("complete-clean.json"));
    const verification = await verifyReceipt(receipt, artifact, now, {
      clockSkewMs: PERMISSIVE_POLICY.clockSkewMs
    });
    const single = evaluatePolicy(receipt, verification, PERMISSIVE_POLICY, now);
    const composed = await evaluateReceiptSet([{ receipt }], artifact, now, PERMISSIVE_POLICY);

    expect(composed.decision).toBe(single.decision);
    expect(composed.receiptCount).toBe(1);
    expect(composed.artifactDigest).toBe(receipt.scanned_artifact_digest);
    expect(composed.receipts[0].evaluation).toEqual(single);
    expect(composed.receipts[0].verification).toEqual(verification);
  });

  it("composes pass plus warning to warn under the permissive policy", async () => {
    const clean = await load(validReceipt("complete-clean.json"));
    const warnings = await load(validReceipt("complete-warnings.json"));
    const result = await evaluateReceiptSet(
      [{ receipt: clean, id: "clean" }, { receipt: warnings, id: "warnings" }],
      artifact,
      now,
      PERMISSIVE_POLICY
    );

    expect(result.decision).toBe("warn");
    expect(result.receipts.map((entry) => entry.evaluation.decision)).toEqual(["pass", "warn"]);
  });

  it("composes pass plus digest mismatch to inconclusive", async () => {
    const clean = await load(validReceipt("complete-clean.json"));
    const mismatch = await load(validReceipt("complete-digest-mismatch.json"));
    const result = await evaluateReceiptSet(
      [{ receipt: clean }, { receipt: mismatch }], artifact, now, PERMISSIVE_POLICY
    );

    expect(result.decision).toBe("inconclusive");
    expect(result.receipts[1].evaluation.reasons.map((reason) => reason.code)).toContain("artifact_digest_mismatch");
  });

  it("composes pass plus findings to fail without rewriting either receipt verdict", async () => {
    const clean = await load(validReceipt("complete-clean.json"));
    const findings = await load(validReceipt("complete-findings.json"));
    const result = await evaluateReceiptSet(
      [{ receipt: clean }, { receipt: findings }], artifact, now, PERMISSIVE_POLICY
    );

    expect(result.decision).toBe("fail");
    expect(result.receipts.map((entry) => entry.evaluation.receiptVerdict)).toEqual(["clean", "findings"]);
  });

  it("keeps evaluating the set when one structurally invalid receipt fails", async () => {
    const clean = await load(validReceipt("complete-clean.json"));
    const invalid = await load(invalidReceipt("structural-missing-scanner.json"));
    const result = await evaluateReceiptSet(
      [{ receipt: clean }, { receipt: invalid }], artifact, now, PERMISSIVE_POLICY
    );

    expect(result.decision).toBe("fail");
    expect(result.receipts).toHaveLength(2);
    expect(result.receipts[0].evaluation.decision).toBe("pass");
    expect(result.receipts[1].evaluation.reasons[0]?.code).toBe("receipt_structure_invalid");
  });

  it("binds optional evidence independently for each receipt", async () => {
    const clean = await load(validReceipt("complete-clean.json"));
    const mismatch = await load(validReceipt("complete-evidence-mismatch.json"));
    const evidence = validReceipt("complete-clean.json");
    const result = await evaluateReceiptSet(
      [{ receipt: clean }, { receipt: mismatch, evidencePath: evidence }],
      artifact,
      now,
      PERMISSIVE_POLICY
    );

    expect(result.decision).toBe("inconclusive");
    expect(result.receipts[1].evaluation.reasons.map((reason) => reason.code)).toContain("evidence_digest_mismatch");
  });

  it("keeps the aggregate decision invariant when input order changes", async () => {
    const warnings = await load(validReceipt("complete-warnings.json"));
    const mismatch = await load(validReceipt("complete-digest-mismatch.json"));
    const first = await evaluateReceiptSet(
      [{ receipt: warnings }, { receipt: mismatch }], artifact, now, PERMISSIVE_POLICY
    );
    const second = await evaluateReceiptSet(
      [{ receipt: mismatch }, { receipt: warnings }], artifact, now, PERMISSIVE_POLICY
    );

    expect(first.decision).toBe("inconclusive");
    expect(second.decision).toBe(first.decision);
  });

  it("uses one evaluation time and one frozen artifact digest for the whole set", async () => {
    const clean = await load(validReceipt("complete-clean.json"));
    const warnings = await load(validReceipt("complete-warnings.json"));
    const result = await evaluateReceiptSet(
      [{ receipt: clean }, { receipt: warnings }], artifact, now, PERMISSIVE_POLICY
    );

    expect(result.evaluatedAt).toBe(now.toISOString());
    expect(result.artifactDigest).toBe(clean.scanned_artifact_digest);
    expect(new Set(result.receipts.map((entry) => entry.verification.evaluatedAt))).toEqual(
      new Set([now.toISOString()])
    );
  });

  it("rejects an empty set instead of treating absence of evidence as pass", async () => {
    await expect(evaluateReceiptSet([], artifact, now, PERMISSIVE_POLICY)).rejects.toThrow("receipt_set_empty");
  });
});
