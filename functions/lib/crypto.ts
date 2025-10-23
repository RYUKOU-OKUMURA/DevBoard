// Token encryption/decryption utilities using AES-256-GCM

/**
 * Encrypts a token using AES-256-GCM
 * @param token - The plaintext token to encrypt
 * @param encryptionKey - The encryption key (must be 32 bytes/64 hex chars)
 * @returns Base64-encoded encrypted data with IV prepended
 */
export async function encryptToken(
  token: string,
  encryptionKey: string
): Promise<string> {
  // Convert encryption key from hex to bytes
  const keyData = hexToBytes(encryptionKey);

  // Import the key for AES-GCM
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Generate a random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encode the token as bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(token);

  // Encrypt the data
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedData), iv.length);

  // Return as base64
  return bytesToBase64(combined);
}

/**
 * Decrypts a token using AES-256-GCM
 * @param encryptedToken - Base64-encoded encrypted data with IV prepended
 * @param encryptionKey - The encryption key (must be 32 bytes/64 hex chars)
 * @returns The decrypted plaintext token
 */
export async function decryptToken(
  encryptedToken: string,
  encryptionKey: string
): Promise<string> {
  // Convert encryption key from hex to bytes
  const keyData = hexToBytes(encryptionKey);

  // Import the key for AES-GCM
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // Decode base64
  const combined = base64ToBytes(encryptedToken);

  // Extract IV (first 12 bytes) and encrypted data
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  // Decrypt the data
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encryptedData
  );

  // Decode bytes to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

// Helper functions

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
  return btoa(binString);
}

function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64);
  return Uint8Array.from(binString, (char) => char.charCodeAt(0));
}
