import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { decryptApiKey, encryptApiKey, maskApiKey } from '../src/server/crypto.ts';

const previousSecret = process.env.ENCRYPTION_SECRET;
before(() => {
  process.env.ENCRYPTION_SECRET = 'sora-test-secret-that-is-longer-than-32-characters';
});
after(() => {
  if (previousSecret === undefined) delete process.env.ENCRYPTION_SECRET;
  else process.env.ENCRYPTION_SECRET = previousSecret;
});

test('AES-256-GCM encrypt/decrypt round trip', () => {
  const original = 'provider-secret-value-123456';
  const encrypted = encryptApiKey(original);
  assert.notEqual(encrypted, original);
  assert.equal(decryptApiKey(encrypted), original);
});

test('encrypted values use a fresh IV', () => {
  const first = encryptApiKey('same-secret');
  const second = encryptApiKey('same-secret');
  assert.notEqual(first, second);
});

test('invalid or tampered ciphertext does not decrypt', () => {
  const encrypted = encryptApiKey('provider-secret-value');
  const [iv, tag, data] = encrypted.split(':');
  const changed = data[0] === '0' ? '1' : '0';
  const tampered = `${iv}:${tag}:${changed}${data.slice(1)}`;
  assert.equal(decryptApiKey(tampered), '');
  assert.equal(decryptApiKey('not-an-encrypted-value'), '');
});

test('API key masking never returns the full key', () => {
  const masked = maskApiKey('sk-live-1234567890');
  assert.notEqual(masked, 'sk-live-1234567890');
  assert.match(masked, /••••/);
});
