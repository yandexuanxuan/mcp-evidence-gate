import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const PROFILE_PATH = 'src/profiles/registry-pr-1404/profile.json';
const LOCAL_SCHEMA_PATH = 'src/profiles/registry-pr-1404/security-scan-receipt.schema.json';
const DEFAULT_GENERATED_SCHEMA_PATH = 'docs/reference/server-json/draft/server.schema.json';
const COMPONENT = 'SecurityScanReceipt';
const NON_CONTRACT_KEYS = new Set([
  '$comment',
  '$id',
  '$schema',
  'description',
  'example',
  'examples',
  'title',
]);
const ORDER_INSENSITIVE_ARRAY_KEYS = new Set(['enum', 'required']);

export function projectContract(value, parentKey = '') {
  if (Array.isArray(value)) {
    const projected = value.map((item) => projectContract(item));
    if (ORDER_INSENSITIVE_ARRAY_KEYS.has(parentKey)) {
      return projected.sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
    }
    return projected;
  }

  if (value !== null && typeof value === 'object') {
    const output = {};
    for (const key of Object.keys(value).sort()) {
      if (NON_CONTRACT_KEYS.has(key)) continue;
      output[key] = projectContract(value[key], key);
    }
    return output;
  }

  return value;
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256Json(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function extractGeneratedComponent(schema, component = COMPONENT) {
  const definition = schema?.definitions?.[component];
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    throw new Error(`generated schema is missing definitions.${component}`);
  }
  return definition;
}

export function classifyDrift({
  pinnedHeadSha,
  currentHeadSha,
  localComponent,
  pinnedUpstreamComponent,
  currentUpstreamComponent,
}) {
  const localContract = projectContract(localComponent);
  const pinnedContract = projectContract(pinnedUpstreamComponent);
  const currentContract = projectContract(currentUpstreamComponent);

  const localContractHash = sha256Json(localContract);
  const pinnedContractHash = sha256Json(pinnedContract);
  const currentContractHash = sha256Json(currentContract);
  const pinnedFullHash = sha256Json(pinnedUpstreamComponent);
  const currentFullHash = sha256Json(currentUpstreamComponent);

  if (localContractHash !== pinnedContractHash) {
    return {
      status: 'LOCAL_PIN_MISMATCH',
      safe: false,
      localContractHash,
      pinnedContractHash,
      currentContractHash,
      componentContentChanged: pinnedFullHash !== currentFullHash,
    };
  }

  if (pinnedHeadSha === currentHeadSha) {
    return {
      status: 'NO_CHANGE',
      safe: true,
      localContractHash,
      pinnedContractHash,
      currentContractHash,
      componentContentChanged: false,
    };
  }

  if (pinnedContractHash === currentContractHash) {
    return {
      status: 'NON_CONTRACT_CHANGE',
      safe: true,
      localContractHash,
      pinnedContractHash,
      currentContractHash,
      componentContentChanged: pinnedFullHash !== currentFullHash,
    };
  }

  return {
    status: 'CONTRACT_CHANGE',
    safe: false,
    localContractHash,
    pinnedContractHash,
    currentContractHash,
    componentContentChanged: pinnedFullHash !== currentFullHash,
  };
}

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'mcp-evidence-gate-profile-drift-sentinel',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`fetch failed ${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
}

function rawUrl(repo, sha, path) {
  return `https://raw.githubusercontent.com/${repo}/${sha}/${path}`;
}

export async function runSentinel({ outputPath } = {}) {
  const profile = JSON.parse(await readFile(PROFILE_PATH, 'utf8'));
  const localComponent = JSON.parse(await readFile(LOCAL_SCHEMA_PATH, 'utf8'));
  const generatedSchemaPath = profile.generatedSchemaPath || DEFAULT_GENERATED_SCHEMA_PATH;

  const pr = await fetchJson(
    `https://api.github.com/repos/${profile.sourceRepository}/pulls/${profile.sourcePullRequest}`,
    githubHeaders(),
  );

  const currentHeadSha = pr?.head?.sha;
  const currentHeadRepository = pr?.head?.repo?.full_name;
  const pinnedHeadRepository = profile.sourceHeadRepository || currentHeadRepository;

  if (!currentHeadSha || !currentHeadRepository || !pinnedHeadRepository) {
    throw new Error('upstream PR head repository or SHA is unavailable');
  }

  const [pinnedGeneratedSchema, currentGeneratedSchema] = await Promise.all([
    fetchJson(rawUrl(pinnedHeadRepository, profile.sourceHeadSha, generatedSchemaPath)),
    fetchJson(rawUrl(currentHeadRepository, currentHeadSha, generatedSchemaPath)),
  ]);

  const pinnedUpstreamComponent = extractGeneratedComponent(pinnedGeneratedSchema);
  const currentUpstreamComponent = extractGeneratedComponent(currentGeneratedSchema);
  const classification = classifyDrift({
    pinnedHeadSha: profile.sourceHeadSha,
    currentHeadSha,
    localComponent,
    pinnedUpstreamComponent,
    currentUpstreamComponent,
  });

  const report = {
    schema_version: 'profile-drift-report-v1',
    source: `${profile.sourceRepository}#${profile.sourcePullRequest}`,
    component: profile.sourceComponent,
    generated_schema_path: generatedSchemaPath,
    pinned: {
      head_repository: pinnedHeadRepository,
      head_sha: profile.sourceHeadSha,
      contract_sha256: classification.pinnedContractHash,
    },
    current: {
      head_repository: currentHeadRepository,
      head_sha: currentHeadSha,
      contract_sha256: classification.currentContractHash,
    },
    local: {
      schema_path: LOCAL_SCHEMA_PATH,
      contract_sha256: classification.localContractHash,
      matches_pinned_upstream: classification.status !== 'LOCAL_PIN_MISMATCH',
    },
    status: classification.status,
    safe_to_continue_with_pinned_profile: classification.safe,
    upstream_component_content_changed: classification.componentContentChanged,
    action:
      classification.safe
        ? 'KEEP_PINNED_PROFILE'
        : 'STOP_AND_REVIEW_VERSIONED_PROFILE_UPDATE',
  };

  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) await writeFile(outputPath, serialized, 'utf8');
  process.stdout.write(serialized);
  return report;
}

function outputArg(argv) {
  const index = argv.indexOf('--output');
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value) throw new Error('--output requires a path');
  return value;
}

async function main() {
  try {
    const report = await runSentinel({ outputPath: outputArg(process.argv.slice(2)) });
    process.exitCode = report.safe_to_continue_with_pinned_profile ? 0 : 1;
  } catch (error) {
    const report = {
      schema_version: 'profile-drift-report-v1',
      status: 'UNKNOWN',
      safe_to_continue_with_pinned_profile: false,
      action: 'STOP_AND_INVESTIGATE_SENTINEL_FAILURE',
      error: error instanceof Error ? error.message : String(error),
    };
    const path = outputArg(process.argv.slice(2));
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    if (path) await writeFile(path, serialized, 'utf8');
    process.stderr.write(serialized);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
