import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const PROFILE_PATH = 'src/profiles/registry-pr-1404/profile.json';
const LOCAL_SCHEMA_PATH = 'src/profiles/registry-pr-1404/security-scan-receipt.schema.json';
const DEFAULT_GENERATED_SCHEMA_PATH = 'docs/reference/server-json/draft/server.schema.json';
const COMPONENT = 'SecurityScanReceipt';
const ANNOTATION_KEYS = new Set([
  '$comment',
  'description',
  'example',
  'examples',
  'title',
]);
const ORDER_INSENSITIVE_ARRAY_KEYS = new Set(['enum', 'required']);

function projectValue(value, parentKey, depth, options) {
  if (Array.isArray(value)) {
    const projected = value.map((item) => projectValue(item, parentKey, depth + 1, options));
    if (ORDER_INSENSITIVE_ARRAY_KEYS.has(parentKey)) {
      return projected.sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
    }
    return projected;
  }

  if (value !== null && typeof value === 'object') {
    const output = {};
    for (const key of Object.keys(value).sort()) {
      if (ANNOTATION_KEYS.has(key)) continue;
      if (depth === 0 && options.stripRootIdentity && (key === '$id' || key === '$schema')) continue;
      output[key] = projectValue(value[key], key, depth + 1, options);
    }
    return output;
  }

  return value;
}

export function projectContract(value, options = {}) {
  return projectValue(value, '', 0, { stripRootIdentity: false, ...options });
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

export function sha256Text(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function extractGeneratedComponent(schema, component = COMPONENT) {
  const definition = schema?.definitions?.[component];
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    throw new Error(`generated schema is missing definitions.${component}`);
  }
  return definition;
}

export function extractYamlComponentBlock(source, component = COMPONENT) {
  const lines = source.replaceAll('\r\n', '\n').split('\n');
  const header = new RegExp(`^(\\s*)${component}:\\s*(?:#.*)?$`);
  const start = lines.findIndex((line) => header.test(line));
  if (start === -1) throw new Error(`OpenAPI source is missing component ${component}`);

  const match = lines[start].match(header);
  const indent = match?.[1] ?? '';
  const sibling = new RegExp(`^${indent}[^\\s#][^:]*:\\s*(?:#.*)?$`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (sibling.test(line)) {
      end = index;
      break;
    }
  }

  return `${lines
    .slice(start, end)
    .map((line) => line.replace(/\s+$/u, ''))
    .join('\n')}\n`;
}

export function classifyDrift({
  pinnedHeadSha,
  currentHeadSha,
  localComponent,
  pinnedUpstreamComponent,
  currentUpstreamComponent,
  pinnedSourceComponent,
  currentSourceComponent,
}) {
  // The local schema is a standalone compatibility artifact and therefore has
  // its own root $id/$schema wrapper. Strip only those local root identities.
  // Upstream component $id/$schema values remain contract-significant because
  // they can affect dialect/ref resolution semantics.
  const localContract = projectContract(localComponent, { stripRootIdentity: true });
  const pinnedContract = projectContract(pinnedUpstreamComponent);
  const currentContract = projectContract(currentUpstreamComponent);

  const localContractHash = sha256Json(localContract);
  const pinnedContractHash = sha256Json(pinnedContract);
  const currentContractHash = sha256Json(currentContract);
  const pinnedFullHash = sha256Json(pinnedUpstreamComponent);
  const currentFullHash = sha256Json(currentUpstreamComponent);
  const pinnedSourceHash = pinnedSourceComponent ? sha256Text(pinnedSourceComponent) : undefined;
  const currentSourceHash = currentSourceComponent ? sha256Text(currentSourceComponent) : undefined;
  const sourceComponentChanged =
    pinnedSourceHash !== undefined && currentSourceHash !== undefined && pinnedSourceHash !== currentSourceHash;
  const generatedComponentChanged = pinnedFullHash !== currentFullHash;

  const base = {
    localContractHash,
    pinnedContractHash,
    currentContractHash,
    pinnedSourceHash,
    currentSourceHash,
    sourceComponentChanged,
    componentContentChanged: generatedComponentChanged,
  };

  if (localContractHash !== pinnedContractHash) {
    return { status: 'LOCAL_PIN_MISMATCH', safe: false, ...base };
  }

  // An explicit generated consumer-contract change is the strongest signal and
  // is classified before source-text drift so the required response is clear.
  if (pinnedContractHash !== currentContractHash) {
    return { status: 'CONTRACT_CHANGE', safe: false, ...base };
  }

  // We intentionally do not infer semantic equivalence between OpenAPI YAML and
  // the generated JSON Schema. Without a complete OpenAPI/YAML semantic parser,
  // any change to the canonical SecurityScanReceipt source component requires a
  // separately reviewed profile decision, even when generated output appears
  // non-contractual or unchanged.
  if (sourceComponentChanged) {
    return { status: 'SOURCE_COMPONENT_CHANGE', safe: false, ...base };
  }

  if (pinnedHeadSha === currentHeadSha) {
    return { status: 'NO_CHANGE', safe: true, ...base };
  }

  return { status: 'NON_CONTRACT_CHANGE', safe: true, ...base };
}

export function enforceUpstreamLifecycle(classification, { state, mergedAt }) {
  if (!classification.safe) return classification;
  if (state !== 'open' || mergedAt) {
    return {
      ...classification,
      status: 'UPSTREAM_LIFECYCLE_CHANGE',
      safe: false,
    };
  }
  return classification;
}

export function actionForStatus(status, safe) {
  if (safe) return 'KEEP_PINNED_PROFILE';
  switch (status) {
    case 'LOCAL_PIN_MISMATCH':
      return 'STOP_AND_RECONCILE_PINNED_PROFILE';
    case 'SOURCE_COMPONENT_CHANGE':
      return 'STOP_AND_REVIEW_UPSTREAM_SOURCE_COMPONENT';
    case 'UPSTREAM_LIFECYCLE_CHANGE':
      return 'STOP_AND_REVIEW_UPSTREAM_LIFECYCLE_TRANSITION';
    case 'CONTRACT_CHANGE':
      return 'STOP_AND_REVIEW_VERSIONED_PROFILE_UPDATE';
    default:
      return 'STOP_AND_INVESTIGATE_SENTINEL_FAILURE';
  }
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

async function fetchResponse(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`fetch failed ${response.status} ${response.statusText}: ${url}`);
  }
  return response;
}

async function fetchJson(url, headers = {}) {
  return (await fetchResponse(url, headers)).json();
}

async function fetchText(url, headers = {}) {
  return (await fetchResponse(url, headers)).text();
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

  const [pinnedGeneratedSchema, currentGeneratedSchema, pinnedOpenApi, currentOpenApi] = await Promise.all([
    fetchJson(rawUrl(pinnedHeadRepository, profile.sourceHeadSha, generatedSchemaPath)),
    fetchJson(rawUrl(currentHeadRepository, currentHeadSha, generatedSchemaPath)),
    fetchText(rawUrl(pinnedHeadRepository, profile.sourceHeadSha, profile.sourcePath)),
    fetchText(rawUrl(currentHeadRepository, currentHeadSha, profile.sourcePath)),
  ]);

  const pinnedUpstreamComponent = extractGeneratedComponent(pinnedGeneratedSchema);
  const currentUpstreamComponent = extractGeneratedComponent(currentGeneratedSchema);
  const pinnedSourceComponent = extractYamlComponentBlock(pinnedOpenApi);
  const currentSourceComponent = extractYamlComponentBlock(currentOpenApi);
  const schemaClassification = classifyDrift({
    pinnedHeadSha: profile.sourceHeadSha,
    currentHeadSha,
    localComponent,
    pinnedUpstreamComponent,
    currentUpstreamComponent,
    pinnedSourceComponent,
    currentSourceComponent,
  });
  const classification = enforceUpstreamLifecycle(schemaClassification, {
    state: pr?.state,
    mergedAt: pr?.merged_at,
  });

  const report = {
    schema_version: 'profile-drift-report-v1',
    source: `${profile.sourceRepository}#${profile.sourcePullRequest}`,
    component: profile.sourceComponent,
    source_path: profile.sourcePath,
    generated_schema_path: generatedSchemaPath,
    pinned: {
      head_repository: pinnedHeadRepository,
      head_sha: profile.sourceHeadSha,
      source_component_sha256: classification.pinnedSourceHash,
      contract_sha256: classification.pinnedContractHash,
    },
    current: {
      head_repository: currentHeadRepository,
      head_sha: currentHeadSha,
      pr_state: pr?.state,
      merged_at: pr?.merged_at,
      source_component_sha256: classification.currentSourceHash,
      contract_sha256: classification.currentContractHash,
    },
    local: {
      schema_path: LOCAL_SCHEMA_PATH,
      contract_sha256: classification.localContractHash,
      matches_pinned_upstream: classification.status !== 'LOCAL_PIN_MISMATCH',
    },
    status: classification.status,
    safe_to_continue_with_pinned_profile: classification.safe,
    upstream_source_component_changed: classification.sourceComponentChanged,
    upstream_generated_component_changed: classification.componentContentChanged,
    action: actionForStatus(classification.status, classification.safe),
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
