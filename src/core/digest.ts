import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { REGISTRY_PR_1404_PROFILE } from "../profiles/registry-pr-1404.js";
import type { Finding } from "./types.js";

const DIGEST_PATTERN = /^([a-z0-9]+):([0-9a-f]{64})$/i;

export interface ParsedDigest {
  algorithm: "sha256";
  hex: string;
}

export function parseDigest(value: unknown): ParsedDigest {
  if (typeof value !== "string") {
    throw new Error("invalid_digest");
  }
  const match = DIGEST_PATTERN.exec(value);
  if (!match || match[1] !== REGISTRY_PR_1404_PROFILE.digestAlgorithm) {
    throw new Error("unsupported_or_malformed_digest");
  }
  return { algorithm: "sha256", hex: match[2].toLowerCase() };
}

export function sha256Bytes(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export async function sha256Artifact(path: string): Promise<string> {
  return sha256Bytes(await readFile(path));
}

export async function verifyArtifactBinding(
  receiptDigest: unknown,
  artifactPath: string
): Promise<Finding> {
  let expected: ParsedDigest;
  try {
    expected = parseDigest(receiptDigest);
  } catch (error) {
    return {
      id: "artifact_binding",
      status: "invalid",
      reason: error instanceof Error ? error.message : "invalid_digest"
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
