import assert from 'node:assert/strict';
import test from 'node:test';

import {
  actionForStatus,
  classifyDrift,
  enforceUpstreamLifecycle,
  extractYamlComponentBlock,
  projectContract,
} from './profile-drift-sentinel.mjs';

const base = {
  type: 'object',
  description: 'base docs',
  additionalProperties: true,
  required: ['scanner', 'verdict'],
  properties: {
    scanner: { type: 'string', description: 'scanner docs' },
    verdict: { type: 'string', enum: ['clean', 'findings'] },
  },
};

function classify(current, overrides = {}) {
  return classifyDrift({
    pinnedHeadSha: 'a'.repeat(40),
    currentHeadSha: 'b'.repeat(40),
    localComponent: structuredClone(base),
    pinnedUpstreamComponent: structuredClone(base),
    currentUpstreamComponent: current,
    ...overrides,
  });
}

test('documentation-only generated component edits do not change the contract when source is unchanged', () => {
  const current = structuredClone(base);
  current.description = 'new docs';
  current.properties.scanner.description = 'new scanner docs';
  const result = classify(current);
  assert.equal(result.status, 'NON_CONTRACT_CHANGE');
  assert.equal(result.safe, true);
  assert.equal(result.componentContentChanged, true);
});

test('required-field changes are contract changes', () => {
  const current = structuredClone(base);
  current.required.push('scanned_artifact_digest');
  const result = classify(current);
  assert.equal(result.status, 'CONTRACT_CHANGE');
  assert.equal(result.safe, false);
});

test('enum changes are contract changes', () => {
  const current = structuredClone(base);
  current.properties.verdict.enum.push('inconclusive');
  const result = classify(current);
  assert.equal(result.status, 'CONTRACT_CHANGE');
  assert.equal(result.safe, false);
});

test('required and enum order do not create false drift', () => {
  const current = structuredClone(base);
  current.required.reverse();
  current.properties.verdict.enum.reverse();
  const result = classify(current);
  assert.equal(result.status, 'NON_CONTRACT_CHANGE');
  assert.equal(result.safe, true);
});

test('same upstream head is NO_CHANGE after local pin verification', () => {
  const result = classify(structuredClone(base), { currentHeadSha: 'a'.repeat(40) });
  assert.equal(result.status, 'NO_CHANGE');
  assert.equal(result.safe, true);
});

test('local standalone root identity is ignored only for local pin comparison', () => {
  const local = structuredClone(base);
  local.$schema = 'https://json-schema.org/draft/2020-12/schema';
  local.$id = 'https://example.test/local-compatibility-schema';
  const result = classify(structuredClone(base), { localComponent: local });
  assert.equal(result.status, 'NON_CONTRACT_CHANGE');
  assert.equal(result.safe, true);
});

test('upstream component schema identity changes are contract changes', () => {
  const current = structuredClone(base);
  current.$id = 'https://example.test/upstream-component';
  const result = classify(current);
  assert.equal(result.status, 'CONTRACT_CHANGE');
  assert.equal(result.safe, false);
});

test('any source component change requires review even when generated component is unchanged', () => {
  const result = classify(structuredClone(base), {
    pinnedSourceComponent: '    SecurityScanReceipt:\n      type: object\n',
    currentSourceComponent: '    SecurityScanReceipt:\n      type: object\n      description: changed\n',
  });
  assert.equal(result.status, 'SOURCE_COMPONENT_CHANGE');
  assert.equal(result.safe, false);
  assert.equal(result.sourceComponentChanged, true);
  assert.equal(result.componentContentChanged, false);
  assert.equal(actionForStatus(result.status, result.safe), 'STOP_AND_REVIEW_UPSTREAM_SOURCE_COMPONENT');
});

test('source and generated documentation changes still require source review', () => {
  const current = structuredClone(base);
  current.description = 'new docs';
  const result = classify(current, {
    pinnedSourceComponent: '    SecurityScanReceipt:\n      description: old\n',
    currentSourceComponent: '    SecurityScanReceipt:\n      description: new\n',
  });
  assert.equal(result.status, 'SOURCE_COMPONENT_CHANGE');
  assert.equal(result.safe, false);
  assert.equal(result.sourceComponentChanged, true);
  assert.equal(result.componentContentChanged, true);
});

test('explicit generated contract drift takes precedence over source review classification', () => {
  const current = structuredClone(base);
  current.required.push('scanned_artifact_digest');
  const result = classify(current, {
    pinnedSourceComponent: '    SecurityScanReceipt:\n      required: [scanner]\n',
    currentSourceComponent: '    SecurityScanReceipt:\n      required: [scanner, scanned_artifact_digest]\n',
  });
  assert.equal(result.status, 'CONTRACT_CHANGE');
  assert.equal(result.safe, false);
  assert.equal(result.sourceComponentChanged, true);
});

test('local schema mismatch fails closed before interpreting upstream drift', () => {
  const local = structuredClone(base);
  local.required = ['scanner'];
  const result = classify(structuredClone(base), { localComponent: local });
  assert.equal(result.status, 'LOCAL_PIN_MISMATCH');
  assert.equal(result.safe, false);
});

test('upstream merge or closure invalidates an otherwise safe pinned profile state', () => {
  const safe = classify(structuredClone(base));
  const merged = enforceUpstreamLifecycle(safe, {
    state: 'closed',
    mergedAt: '2026-09-01T00:00:00Z',
  });
  assert.equal(merged.status, 'UPSTREAM_LIFECYCLE_CHANGE');
  assert.equal(merged.safe, false);
  assert.equal(actionForStatus(merged.status, merged.safe), 'STOP_AND_REVIEW_UPSTREAM_LIFECYCLE_TRANSITION');
});

test('open and unmerged upstream PR preserves a safe schema classification', () => {
  const safe = classify(structuredClone(base));
  const current = enforceUpstreamLifecycle(safe, { state: 'open', mergedAt: null });
  assert.equal(current.status, safe.status);
  assert.equal(current.safe, true);
});

test('YAML component extraction stops at the next sibling component', () => {
  const source = [
    'components:',
    '  schemas:',
    '    SecurityScanReceipt:',
    '      type: object  ',
    '      properties:',
    '        scanner:',
    '          type: string',
    '    ServerDetail:',
    '      type: object',
    '',
  ].join('\r\n');
  assert.equal(
    extractYamlComponentBlock(source),
    '    SecurityScanReceipt:\n      type: object\n      properties:\n        scanner:\n          type: string\n',
  );
});

test('projection strips annotations but preserves semantic schema identity by default', () => {
  const projected = projectContract({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://example.test/component',
    title: 'docs',
    description: 'docs',
    type: 'string',
    format: 'date-time',
    pattern: '^x$',
  });
  assert.deepEqual(projected, {
    $id: 'https://example.test/component',
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    format: 'date-time',
    pattern: '^x$',
    type: 'string',
  });
});
