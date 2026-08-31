import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { REGISTRY_PR_1404_PROFILE } from "../profiles/registry-pr-1404.js";
import type { Finding } from "./types.js";

const DIGEST_PATTERN = /^([a-z0-9]+):([a-f0-9]+)$/;

export class DigestError extends Error {
  constructor(public readonly code: "malformed_digest" | "unsupported_digest_algorithm") {
    super(code);
  }
}

export interface ParsedDigest {
  algorithm: string;
  hex: string;
}

export function parseDigest(value: unknown): ParsedDigest {
  if (typeof value !== "string") {
    throw new DigestError("malformed_digest");
  }
  const match = DIGEST_PATTERN.exec(value);
  if (!match) {
    throw new DigestError("malformed_digest");
  }
  if (match[1] !== REGISTRY_PR_1404_PROFILE.digestAlgorithm) {
    throw new DigestError("unsupported_digest_algorithm");
  }
  if (match[2].length !== 64) {
    throw new DigestError("malformed_digest");
  }
  return { algorithm: match[1], hex: match[2] };
}

export function sha256Bytes(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export async function sha256Artifact(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return `sha256:${hash.digest("hex")}`;
}

export async function verifyArtifactBinding(
  receiptDigest: unknown,
  artifactPath: string
): Promise<Finding> {
  let expected: ParsedDigest;
  try {
    expected = parseDigest(receiptDigest);
  } catch (error) {
    const code = error instanceof DigestError ? error.code : "malformed_digest";
    return {
      id: "artifact_binding",
      status: code === "unsupported_digest_algorithm" ? "unsupported" : "invalid",
      reason: code
    };
  }

  const actual = await sha256Artifact(artifactPath);
  return actual === `sha256:${expected.hex}`
    ? { id: "artifact_binding", status: "pass", expected: actual, actual }
    : {
        id: "artifact_binding",
        status: "mismatch",
        reason: "artifact_digest_mismatch",
        expected: `sha256:${expected.hex}`,
        actual
      };
}

export async function verifyEvidenceBinding(receiptDigest: unknown, evidencePath?: string): Promise<Finding> {
  if (!evidencePath) return { id: "evidence_binding", status: "not_present", reason: "evidence_file_not_provided" };
  let expected: ParsedDigest;
  try { expected = parseDigest(receiptDigest); }
  catch (error) {
    const code = error instanceof DigestError ? error.code : "malformed_digest";
    return { id: "evidence_binding", status: code === "unsupported_digest_algorithm" ? "unsupported" : "invalid", reason: code };
  }
  try {
    const actual = await sha256Artifact(evidencePath);
    return actual === `sha256:${expected.hex}`
      ? { id: "evidence_binding", status: "pass", expected: actual, actual }
      : { id: "evidence_binding", status: "mismatch", reason: "evidence_digest_mismatch", expected: `sha256:${expected.hex}`, actual };
  } catch { return { id: "evidence_binding", status: "not_present", reason: "evidence_file_missing" }; }
}
