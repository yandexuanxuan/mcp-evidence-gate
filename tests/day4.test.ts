import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateReceiptStructure } from "../src/core/structural.js";
import { verifyReceipt } from "../src/core/verify.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = resolve(root, "fixtures/artifacts/current-artifact.bin");
const fixture = async (name: string) =>
  JSON.parse(await readFile(resolve(root, "fixtures", name), "utf8"));
const now = new Date("2026-08-25T00:00:00Z");

describe("pinned receipt structural conformance", () => {
  it("accepts a complete clean receipt and keeps evidence checks separate", async () => {
    const receipt = await fixture("valid/complete-clean.json");
    expect(validateReceiptStructure(receipt)).toMatchObject({
      id: "receipt_structure",
      status: "pass"
    });
    const result = await verifyReceipt(receipt, artifactPath, now);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "receipt_structure", status: "pass" }),
        expect.objectContaining({ id: "artifact_binding", status: "pass" })
      ])
    );
  });

  it("accepts RFC3339 lowercase t/z and open future scope values", async () => {
    const receipt = await fixture("valid/complete-lowercase-datetime.json");
    expect(validateReceiptStructure(receipt)).toMatchObject({ status: "pass" });
    const result = await verifyReceipt(receipt, artifactPath, now);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "receipt_structure", status: "pass" }),
        expect.objectContaining({ id: "scan_scope", status: "pass" })
      ])
    );
  });

  it("reports missing required fields as structural invalidity", async () => {
    const result = validateReceiptStructure(await fixture("invalid/structural-missing-scanner.json"));
    expect(result).toMatchObject({
      id: "receipt_structure",
      status: "invalid",
      reason: "schema_validation_failed"
    });
    expect(result.details?.some((detail) => detail.includes("must have required property 'scanner'"))).toBe(true);
  });

  it("reports enum violations through the pinned schema", async () => {
    const result = validateReceiptStructure(await fixture("invalid/structural-bad-enum.json"));
    expect(result).toMatchObject({
      id: "receipt_structure",
      status: "invalid",
      reason: "schema_validation_failed"
    });
    expect(result.details?.some((detail) => detail.includes("must be equal to one of the allowed values"))).toBe(true);
  });
});
