// Session management utilities

import { encryptToken, decryptToken } from './crypto';
import type { Env, SessionData } from './types';

// Session expiration: 30 days in seconds
const SESSION_TTL = 30 * 24 * 60 * 60;

/**
 * Generates a unique session ID using crypto.randomUUID()
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Saves a session to KV storage with encrypted access token
 * @param sessionId - Unique session identifier
 * @param sessionData - Session data to save
 * @param env - Environment variables with KV binding and encryption key
 */
export async function saveSession(
  sessionId: string,
  sessionData: SessionData,
  env: Env
): Promise<void> {
  // Encrypt the access token
  const encryptedToken = await encryptToken(
    sessionData.accessToken,
    env.ENCRYPTION_KEY
  );

  // Create session data with encrypted token
  const dataToStore = {
    userId: sessionData.userId,
    username: sessionData.username,
    accessToken: encryptedToken,
    createdAt: sessionData.createdAt,
  };

  // Store in KV with TTL (30 days)
  await env.SESSIONS.put(
    `session:${sessionId}`,
    JSON.stringify(dataToStore),
    { expirationTtl: SESSION_TTL }
  );
}

/**
 * Retrieves a session from KV storage and decrypts the access token
 * @param sessionId - Unique session identifier
 * @param env - Environment variables with KV binding and encryption key
 * @returns Session data with decrypted token, or null if not found
 */
export async function getSession(
  sessionId: string,
  env: Env
): Promise<SessionData | null> {
  const data = await env.SESSIONS.get(`session:${sessionId}`, 'text');

  if (!data) {
    return null;
  }

  try {
    const parsed = JSON.parse(data);

    // Decrypt the access token
    const decryptedToken = await decryptToken(
      parsed.accessToken,
      env.ENCRYPTION_KEY
    );

    return {
      userId: parsed.userId,
      username: parsed.username,
      accessToken: decryptedToken,
      createdAt: parsed.createdAt,
    };
  } catch (error) {
    console.error('Failed to parse or decrypt session:', error);
    return null;
  }
}

/**
 * Deletes a session from KV storage
 * @param sessionId - Unique session identifier
 * @param env - Environment variables with KV binding
 */
export async function deleteSession(
  sessionId: string,
  env: Env
): Promise<void> {
  await env.SESSIONS.delete(`session:${sessionId}`);
}

/**
 * Extracts session ID from request cookies
 * @param request - The incoming request
 * @returns Session ID if found, null otherwise
 */
export function getSessionIdFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith('session_id='));

  if (!sessionCookie) {
    return null;
  }

  return sessionCookie.split('=')[1];
}

/**
 * Creates a session cookie header
 * @param sessionId - Session ID to set in cookie
 * @param maxAge - Cookie max age in seconds (default: 30 days)
 * @returns Set-Cookie header value
 */
export function createSessionCookie(
  sessionId: string,
  maxAge: number = SESSION_TTL
): string {
  return `session_id=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

/**
 * Creates a cookie header to delete the session cookie
 * @returns Set-Cookie header value that expires the cookie
 */
export function deleteSessionCookie(): string {
  return 'session_id=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}
