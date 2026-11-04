import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEligibleProviders, inMemoryProviders } from '../src/server/aiRouter.ts';

const snapshot = Object.fromEntries(Object.entries(inMemoryProviders).map(([id, provider]) => [id, { ...provider }]));
function restoreProviders() {
  for (const [id, saved] of Object.entries(snapshot)) Object.assign(inMemoryProviders[id], saved);
}

test('registry includes ten configured provider adapters', () => {
  assert.equal(Object.keys(inMemoryProviders).length, 10);
});

test('router filters disabled providers and providers without credentials', () => {
  restoreProviders();
  for (const provider of Object.values(inMemoryProviders)) {
    provider.enabled = false;
    provider.apiKey = '';
  }
  assert.deepEqual(getEligibleProviders('auto', false), []);
});

test('router orders eligible providers by priority and tries a preferred provider first', () => {
  restoreProviders();
  for (const provider of Object.values(inMemoryProviders)) {
    provider.enabled = true;
    provider.apiKey = `test-${provider.id}`;
  }
  inMemoryProviders.openai.priority = 1;
  inMemoryProviders.gemini.priority = 2;
  inMemoryProviders.claude.priority = 3;
  assert.equal(getEligibleProviders('auto', false)[0].id, 'openai');
  assert.equal(getEligibleProviders('claude', false)[0].id, 'claude');
  restoreProviders();
});
