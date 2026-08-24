import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { verifyArtifactBinding, parseDigest, sha256Bytes } from "../src/core/digest.js";
import { evaluateFreshness } from "../src/core/freshness.js";
import { verifyReceiptEvidence } from "../src/core/verify.js";
import { REGISTRY_PR_1404_PROFILE } from "../src/profiles/registry-pr-1404.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = resolve(root, "fixtures/artifacts/current-artifact.bin");
const fixture = async (name: string) =>
  JSON.parse(await readFile(resolve(root, "fixtures", name), "utf8"));
const now = new Date("2026-08-25T00:00:00Z");

describe("exact-byte digest", () => {
  it("hashes bytes without text normalization", () => {
    const one = new TextEncoder().encode("line1\nline2");
    const two = new TextEncoder().encode("line1\r\nline2");
    expect(sha256Bytes(new Uint8Array())).toBe(
      "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    expect(sha256Bytes(one)).not.toBe(sha256Bytes(two));
  });

  it("canonicalizes hex case but rejects unsupported algorithms", () => {
    const parsed = parseDigest(
      "sha256:41F89C83905A2335098D6ACF5A8FE9E490EE2B4747229E46349CFDF4E3973C78"
    );
    expect(parsed.hex).toBe("41f89c83905a2335098d6acf5a8fe9e490ee2b4747229e46349cfdf4e3973c78");
    expect(() => parseDigest("sha512:" + "0".repeat(64))).toThrow("unsupported_or_malformed_digest");
  });

  it("binds the valid fixture to the exact artifact bytes", async () => {
    const receipt = await fixture("valid/clean-current-artifact.json");
    const result = await verifyArtifactBinding(receipt.scanned_artifact_digest, artifactPath);
    expect(result).toMatchObject({ id: "artifact_binding", status: "pass" });
  });

  it("detects a one-byte/digest mismatch as a fact, not a policy decision", async () => {
    const receipt = await fixture("invalid/digest-mismatch.json");
    const result = await verifyArtifactBinding(receipt.scanned_artifact_digest, artifactPath);
    expect(result).toMatchObject({
      id: "artifact_binding",
      status: "mismatch",
      reason: "artifact_digest_mismatch"
    });
  });

  it("rejects a malformed digest explicitly", async () => {
    const receipt = await fixture("invalid/malformed-digest.json");
    const result = await verifyArtifactBinding(receipt.scanned_artifact_digest, artifactPath);
    expect(result).toMatchObject({
      id: "artifact_binding",
      status: "invalid",
      reason: "unsupported_or_malformed_digest"
    });
  });
});

describe("injected-clock freshness", () => {
  it("passes when expiry is after now and treats equality as stale", () => {
    expect(evaluateFreshness("2026-08-26T00:00:00Z", { now })).toMatchObject({
      id: "freshness",
      status: "pass"
    });
    expect(evaluateFreshness("2026-08-25T00:00:00Z", { now })).toMatchObject({
      id: "freshness",
      status: "inconclusive",
      reason: "stale_scan"
    });
  });

  it("returns stale_scan for an expired receipt, without claiming unsafe", async () => {
    const receipt = await fixture("invalid/stale.json");
    const result = await verifyReceiptEvidence(receipt, artifactPath, now);
    expect(result.profile).toBe(REGISTRY_PR_1404_PROFILE.id);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "artifact_binding", status: "pass" }),
        expect.objectContaining({ id: "freshness", status: "inconclusive", reason: "stale_scan" })
      ])
    );
  });

  it("distinguishes missing and malformed freshness timestamps", async () => {
    expect(evaluateFreshness(undefined, { now })).toMatchObject({
      id: "freshness",
      status: "invalid",
      reason: "freshness_missing"
    });
    const receipt = await fixture("invalid/malformed-date.json");
    const result = await verifyReceiptEvidence(receipt, artifactPath, now);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "freshness", status: "invalid", reason: "malformed_timestamp" })
      ])
    );
  });
});
