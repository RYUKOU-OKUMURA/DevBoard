/**
 * Encryption Utilities for API Key Protection
 *
 * Uses AES-256-GCM encryption with PBKDF2 key derivation.
 * This ensures API keys are stored securely in localStorage.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100_000;

/**
 * Derives an encryption key from a password and salt using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts an API key using AES-256-GCM
 *
 * @param apiKey - The API key to encrypt
 * @param accountId - The account ID used as part of the encryption password
 * @returns Base64-encoded encrypted string containing salt + iv + ciphertext
 */
export async function encryptAPIKey(apiKey: string, accountId: string): Promise<string> {
  const encoder = new TextEncoder();

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive key
  const key = await deriveKey(accountId, salt);

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(apiKey)
  );

  // Combine salt + iv + encrypted and encode to Base64
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts an encrypted API key
 *
 * @param encrypted - Base64-encoded encrypted string
 * @param accountId - The account ID used during encryption
 * @returns The decrypted API key
 * @throws Error if decryption fails (wrong key, corrupted data, etc.)
 */
export async function decryptAPIKey(encrypted: string, accountId: string): Promise<string> {
  try {
    const decoder = new TextDecoder();

    // Base64 decode
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

    // Extract salt, iv, and ciphertext
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

    // Derive key
    const key = await deriveKey(accountId, salt);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt API key. The data may be corrupted or the account ID may be incorrect.');
  }
}

/**
 * Validates that an API key is in the expected format
 *
 * @param apiKey - The API key to validate
 * @param provider - The AI provider ('claude' or 'copilot')
 * @returns true if the key appears to be valid
 */
export function validateAPIKeyFormat(apiKey: string, provider: 'claude' | 'copilot'): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Claude API keys start with 'sk-ant-'
  if (provider === 'claude') {
    return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
  }

  // GitHub tokens typically start with 'ghp_' or 'gho_'
  if (provider === 'copilot') {
    return (apiKey.startsWith('ghp_') || apiKey.startsWith('gho_')) && apiKey.length > 20;
  }

  return false;
}

/**
 * Masks an API key for display purposes
 *
 * @param apiKey - The API key to mask
 * @returns A masked version showing only the first 8 and last 4 characters
 */
export function maskAPIKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) {
    return '*'.repeat(apiKey?.length || 8);
  }

  const start = apiKey.slice(0, 8);
  const end = apiKey.slice(-4);
  const masked = '*'.repeat(Math.max(8, apiKey.length - 12));

  return `${start}${masked}${end}`;
}
