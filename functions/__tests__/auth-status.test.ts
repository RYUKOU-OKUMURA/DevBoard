import { describe, expect, it } from 'vitest';
import { onRequest } from '../api/auth/status';

const validSessionSecret = 'ab'.repeat(32);
const validEncryptionKey = 'cd'.repeat(32);

const createKV = () => {
  const store = new Map<string, string>();
  return {
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
};

const getStatus = async (overrides: Record<string, unknown> = {}) => {
  const env = {
    GITHUB_CLIENT_ID: 'client-id',
    GITHUB_CLIENT_SECRET: 'client-secret',
    SESSION_SECRET: validSessionSecret,
    ENCRYPTION_KEY: validEncryptionKey,
    SESSIONS: createKV(),
    ...overrides,
  };
  const response = await onRequest({
    request: new Request('https://devboard.test/api/auth/status'),
    env,
  } as any);

  return { response, body: await response.json() as any };
};

describe('/api/auth/status secret readiness', () => {
  it('reports valid secrets without returning their values', async () => {
    const { body } = await getStatus();

    expect(body.ok).toBe(true);
    expect(body.environment.hasSessionSecret).toBe(true);
    expect(body.environment.sessionSecretValid).toBe(true);
    expect(body.environment.hasEncryptionKey).toBe(true);
    expect(body.environment.encryptionKeyValid).toBe(true);
    expect(JSON.stringify(body)).not.toContain(validSessionSecret);
    expect(JSON.stringify(body)).not.toContain(validEncryptionKey);
  });

  it.each([
    {
      name: 'short SESSION_SECRET',
      overrides: { SESSION_SECRET: 'ab'.repeat(31) },
      expected: { hasSessionSecret: true, sessionSecretValid: false },
    },
    {
      name: 'non-hex SESSION_SECRET',
      overrides: { SESSION_SECRET: 'zz'.repeat(32) },
      expected: { hasSessionSecret: true, sessionSecretValid: false },
    },
    {
      name: 'odd-length SESSION_SECRET',
      overrides: { SESSION_SECRET: 'a'.repeat(63) },
      expected: { hasSessionSecret: true, sessionSecretValid: false },
    },
    {
      name: 'missing SESSION_SECRET',
      overrides: { SESSION_SECRET: undefined },
      expected: { hasSessionSecret: false, sessionSecretValid: false },
    },
    {
      name: 'short ENCRYPTION_KEY',
      overrides: { ENCRYPTION_KEY: 'ab'.repeat(31) },
      expected: { encryptionKeyValid: false },
    },
    {
      name: '33-byte ENCRYPTION_KEY',
      overrides: { ENCRYPTION_KEY: 'ab'.repeat(33) },
      expected: { hasEncryptionKey: true, encryptionKeyValid: false },
    },
    {
      name: 'non-hex ENCRYPTION_KEY',
      overrides: { ENCRYPTION_KEY: 'zz'.repeat(32) },
      expected: { encryptionKeyValid: false },
    },
    {
      name: 'odd-length ENCRYPTION_KEY',
      overrides: { ENCRYPTION_KEY: 'a'.repeat(63) },
      expected: { encryptionKeyValid: false },
    },
    {
      name: 'missing ENCRYPTION_KEY',
      overrides: { ENCRYPTION_KEY: undefined },
      expected: { hasEncryptionKey: false, encryptionKeyValid: false },
    },
  ])('marks $name as not ready', async ({ overrides, expected }) => {
    const { body } = await getStatus(overrides);

    expect(body.ok).toBe(false);
    expect(body.environment).toMatchObject(expected);
  });
});
