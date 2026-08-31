import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifact = resolve(root, "fixtures/artifacts/current-artifact.bin");
const receipt = (name: string) => resolve(root, "fixtures/valid", name);
const now = "2026-08-25T00:00:00Z";

async function invoke(args: string[]) {
  let stdout = "";
  let stderr = "";
  const code = await runCli(args, {
    stdout: (text) => { stdout += text; },
    stderr: (text) => { stderr += text; }
  });
  return { code, stdout, stderr };
}

async function withManifest(
  body: unknown,
  run: (manifestPath: string, directory: string) => Promise<void>
): Promise<void> {
  const directory = await mkdtemp(resolve(tmpdir(), "mcp-evidence-gate-set-"));
  const manifestPath = resolve(directory, "receipt-set.json");
  try {
    await writeFile(manifestPath, JSON.stringify(body, null, 2), "utf8");
    await run(manifestPath, directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function fromDirectory(directory: string, path: string): string {
  return relative(directory, path);
}

describe("mcp-evidence-gate verify-set CLI", () => {
  it("evaluates relative receipt paths and emits per-receipt JSON evidence", async () => {
    await withManifest(
      { schema_version: "project-defined-receipt-set-v1", receipts: [] },
      async (manifestPath, directory) => {
        await writeFile(
          manifestPath,
          JSON.stringify({
            schema_version: "project-defined-receipt-set-v1",
            receipts: [
              { id: "clean", receipt: fromDirectory(directory, receipt("complete-clean.json")) },
              { id: "findings", receipt: fromDirectory(directory, receipt("complete-findings.json")) }
            ]
          }),
          "utf8"
        );
        const result = await invoke([
          "verify-set", "--set", manifestPath, "--artifact", artifact,
          "--policy", "permissive", "--format", "json", "--now", now
        ]);
        const model = JSON.parse(result.stdout);

        expect(result.code).toBe(1);
        expect(result.stderr).toBe("");
        expect(model).toMatchObject({
          mode: "receipt-set",
          receiptCount: 2,
          decision: "fail"
        });
        expect(model.receipts.map((entry: { id: string; decision: string; receiptVerdict: string }) => ({
          id: entry.id,
          decision: entry.decision,
          receiptVerdict: entry.receiptVerdict
        }))).toEqual([
          { id: "clean", decision: "pass", receiptVerdict: "clean" },
          { id: "findings", decision: "fail", receiptVerdict: "findings" }
        ]);
      }
    );
  });

  it("returns exit 0 and aggregate WARN for pass plus warnings", async () => {
    await withManifest(
      { schema_version: "project-defined-receipt-set-v1", receipts: [] },
      async (manifestPath, directory) => {
        await writeFile(
          manifestPath,
          JSON.stringify({
            schema_version: "project-defined-receipt-set-v1",
            receipts: [
              { receipt: fromDirectory(directory, receipt("complete-clean.json")) },
              { receipt: fromDirectory(directory, receipt("complete-warnings.json")) }
            ]
          }),
          "utf8"
        );
        const result = await invoke([
          "verify-set", "--set", manifestPath, "--artifact", artifact,
          "--policy", "permissive", "--now", now
        ]);

        expect(result.code).toBe(0);
        expect(result.stderr).toBe("");
        expect(result.stdout).toContain("MCP Evidence Gate Receipt Set");
        expect(result.stdout).toContain("Decision: WARN");
      }
    );
  });

  it("rejects an empty receipt set as CLI/input error rather than PASS", async () => {
    await withManifest(
      { schema_version: "project-defined-receipt-set-v1", receipts: [] },
      async (manifestPath) => {
        const result = await invoke([
          "verify-set", "--set", manifestPath, "--artifact", artifact,
          "--policy", "permissive", "--now", now
        ]);
        expect(result.code).toBe(3);
        expect(result.stdout).toBe("");
        expect(result.stderr).toContain("at least one receipt");
      }
    );
  });

  it("rejects unknown project-defined set schemas", async () => {
    await withManifest(
      { schema_version: "future-receipt-set-v2", receipts: [{ receipt: "receipt.json" }] },
      async (manifestPath) => {
        const result = await invoke([
          "verify-set", "--set", manifestPath, "--artifact", artifact,
          "--policy", "permissive", "--now", now
        ]);
        expect(result.code).toBe(3);
        expect(result.stdout).toBe("");
        expect(result.stderr).toContain("unsupported receipt-set schema_version");
      }
    );
  });
});
