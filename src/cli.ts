import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { evaluatePolicy, PERMISSIVE_POLICY, STRICT_RELEASE_EXAMPLE_POLICY, type PolicyConfig } from "./core/policy.js";
import { verifyReceipt } from "./core/verify.js";
import type { ReceiptInput, VerificationResult } from "./core/types.js";

export const CLI_VERSION = "0.1.0";

export interface CliIO {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

interface VerifyArgs {
  receipt: string;
  artifact: string;
  policy: string;
  format: "text" | "json";
  now?: string;
}

class CliInputError extends Error {}

const HELP = `mcp-evidence-gate ${CLI_VERSION}

Usage:
  mcp-evidence-gate verify --receipt <path> --artifact <path> --policy <name> [options]

Options:
  --receipt <path>   Receipt JSON path (required)
  --artifact <path>  Artifact path (required)
  --policy <name>    permissive or strict-release-example (required)
  --format <mode>    text or json (default: text)
  --now <RFC3339>    Evaluation time; defaults to the current time
  --help             Show this help
  --version          Show the version

Exit codes:
  0  PASS or WARN
  1  FAIL
  2  INCONCLUSIVE
  3  CLI, input, or runtime error
`;

function policyByName(name: string): PolicyConfig {
  if (name === PERMISSIVE_POLICY.name) return PERMISSIVE_POLICY;
  if (name === STRICT_RELEASE_EXAMPLE_POLICY.name) return STRICT_RELEASE_EXAMPLE_POLICY;
  throw new CliInputError(`unknown policy: ${name}`);
}

function parseArgs(argv: string[]): VerifyArgs | "help" | "version" {
  if (argv.includes("--help") || argv.length === 0) return "help";
  if (argv.includes("--version")) return "version";
  if (argv[0] !== "verify") throw new CliInputError("only the 'verify' command is available");

  const values: Partial<VerifyArgs> = { format: "text" };
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!flag.startsWith("--")) throw new CliInputError(`unexpected argument: ${flag}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new CliInputError(`missing value for ${flag}`);
    index += 1;
    if (flag === "--receipt") values.receipt = value;
    else if (flag === "--artifact") values.artifact = value;
    else if (flag === "--policy") values.policy = value;
    else if (flag === "--format" && (value === "text" || value === "json")) values.format = value;
    else if (flag === "--now") values.now = value;
    else throw new CliInputError(`unknown option: ${flag}`);
  }

  if (!values.receipt || !values.artifact || !values.policy) {
    throw new CliInputError("--receipt, --artifact, and --policy are required");
  }
  return values as VerifyArgs;
}

function evaluationTime(value: string | undefined): Date {
  const normalized = value?.replace("t", "T").replace(/z$/, "Z");
  const result = normalized ? new Date(normalized) : new Date();
  if (Number.isNaN(result.getTime())) throw new CliInputError("--now must be a valid RFC3339 date-time");
  return result;
}

function outputModel(
  policy: PolicyConfig,
  verification: VerificationResult,
  receipt: ReceiptInput,
  evaluatedAt: Date
) {
  const decision = evaluatePolicy(receipt, verification, policy);
  return {
    tool: "mcp-evidence-gate",
    version: CLI_VERSION,
    profile: decision.profile,
    policy: decision.policy,
    receiptVerdict: decision.receiptVerdict,
    decision: decision.decision,
    evaluatedAt: evaluatedAt.toISOString(),
    checks: verification.checks,
    reasons: decision.reasons
  };
}

function exitCode(decision: string): number {
  if (decision === "pass" || decision === "warn") return 0;
  if (decision === "fail") return 1;
  if (decision === "inconclusive") return 2;
  return 3;
}

function checkLabel(id: string): string {
  return id.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderText(model: ReturnType<typeof outputModel>): string {
  const lines = [
    "MCP Evidence Gate",
    `Profile: ${model.profile}`,
    `Policy: ${model.policy}`,
    `Receipt verdict: ${model.receiptVerdict}`,
    `Evaluated at: ${model.evaluatedAt}`,
    "",
    ...model.checks.map((check) => {
      const status = check.status === "not_present" ? "N/A" : check.status.toUpperCase();
      return `${checkLabel(check.id).padEnd(26)} ${status}${check.reason ? ` (${check.reason})` : ""}`;
    }),
    "",
    `Decision: ${model.decision.toUpperCase()}`
  ];
  if (model.reasons.length > 0) {
    lines.push("Reasons:", ...model.reasons.map((reason) => `- ${reason.code}: ${reason.detail}`));
  }
  return `${lines.join("\n")}\n`;
}

export async function runCli(argv: string[], io: CliIO): Promise<number> {
  try {
    const parsed = parseArgs(argv);
    if (parsed === "help") {
      io.stdout(HELP);
      return 0;
    }
    if (parsed === "version") {
      io.stdout(`${CLI_VERSION}\n`);
      return 0;
    }

    const policy = policyByName(parsed.policy);
    const evaluatedAt = evaluationTime(parsed.now);
    const receipt = JSON.parse(await readFile(parsed.receipt, "utf8")) as ReceiptInput;
    const verification = await verifyReceipt(receipt, parsed.artifact, evaluatedAt);
    const model = outputModel(policy, verification, receipt, evaluatedAt);
    if (parsed.format === "json") io.stdout(`${JSON.stringify(model, null, 2)}\n`);
    else io.stdout(renderText(model));
    return exitCode(model.decision);
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 3;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) {
  const code = await runCli(process.argv.slice(2), {
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text)
  });
  process.exitCode = code;
}
