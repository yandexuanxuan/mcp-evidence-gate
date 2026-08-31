import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyDrift, projectContract } from './profile-drift-sentinel.mjs';

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

test('documentation-only component edits do not change the contract', () => {
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
  const result = classify(structuredClone(base), {
    currentHeadSha: 'a'.repeat(40),
  });
  assert.equal(result.status, 'NO_CHANGE');
  assert.equal(result.safe, true);
});

test('local schema mismatch fails closed before interpreting upstream drift', () => {
  const local = structuredClone(base);
  local.required = ['scanner'];

  const result = classify(structuredClone(base), { localComponent: local });
  assert.equal(result.status, 'LOCAL_PIN_MISMATCH');
  assert.equal(result.safe, false);
});

test('projection strips only non-contract documentation metadata', () => {
  const projected = projectContract({
    $schema: 'example',
    $id: 'example-id',
    title: 'docs',
    description: 'docs',
    type: 'string',
    format: 'date-time',
    pattern: '^x$',
  });

  assert.deepEqual(projected, {
    format: 'date-time',
    pattern: '^x$',
    type: 'string',
  });
});
