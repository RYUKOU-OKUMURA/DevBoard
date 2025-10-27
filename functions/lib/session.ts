// Session management utilities

import { encryptToken, decryptToken } from './crypto';
import type { Env, SessionData, MultiAccountSession, AccountMetadata } from './types';
import { MAX_ACCOUNTS } from './types';

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

/**
 * Get multi-account session metadata from KV
 * @param masterSessionId - Master session ID from cookie
 * @param env - Environment variables with KV binding
 * @returns Multi-account session or null if not found
 */
export async function getMultiAccountSession(
  masterSessionId: string,
  env: Env
): Promise<MultiAccountSession | null> {
  const data = await env.SESSIONS.get(`multi:${masterSessionId}`, 'text');

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as MultiAccountSession;
  } catch (error) {
    console.error('Failed to parse multi-account session:', error);
    return null;
  }
}

/**
 * Save multi-account session metadata to KV
 * @param masterSessionId - Master session ID from cookie
 * @param session - Multi-account session data
 * @param env - Environment variables with KV binding
 */
export async function saveMultiAccountSession(
  masterSessionId: string,
  session: MultiAccountSession,
  env: Env
): Promise<void> {
  await env.SESSIONS.put(
    `multi:${masterSessionId}`,
    JSON.stringify(session),
    { expirationTtl: SESSION_TTL }
  );
}

/**
 * Add account to multi-account session
 * @param masterSessionId - Master session ID
 * @param sessionData - Session data for the new account
 * @param env - Environment variables
 * @returns Updated multi-account session or null if limit reached
 */
export async function addAccountToSession(
  masterSessionId: string,
  sessionData: SessionData,
  env: Env
): Promise<MultiAccountSession | null> {
  let multiSession = await getMultiAccountSession(masterSessionId, env);

  if (!multiSession) {
    // Create new multi-account session
    multiSession = {
      accounts: [],
      activeUserId: sessionData.userId,
      lastUpdated: Date.now(),
    };
  }

  // Check if account already exists
  const existingIndex = multiSession.accounts.findIndex(
    (acc) => acc.userId === sessionData.userId
  );

  if (existingIndex >= 0) {
    // Update existing account
    multiSession.accounts[existingIndex] = {
      userId: sessionData.userId,
      username: sessionData.username,
      createdAt: sessionData.createdAt,
    };
    multiSession.activeUserId = sessionData.userId;
  } else {
    // Check account limit
    if (multiSession.accounts.length >= MAX_ACCOUNTS) {
      return null;
    }

    // Add new account
    multiSession.accounts.push({
      userId: sessionData.userId,
      username: sessionData.username,
      createdAt: sessionData.createdAt,
    });
    multiSession.activeUserId = sessionData.userId;
  }

  multiSession.lastUpdated = Date.now();

  // Save individual session data
  await saveSession(`${masterSessionId}:${sessionData.userId}`, sessionData, env);

  // Save multi-account session
  await saveMultiAccountSession(masterSessionId, multiSession, env);

  return multiSession;
}

/**
 * Get active account session from multi-account session
 * @param masterSessionId - Master session ID
 * @param env - Environment variables
 * @returns Active account session data or null
 */
export async function getActiveAccountSession(
  masterSessionId: string,
  env: Env
): Promise<SessionData | null> {
  const multiSession = await getMultiAccountSession(masterSessionId, env);

  if (!multiSession || !multiSession.activeUserId) {
    return null;
  }

  return await getSession(`${masterSessionId}:${multiSession.activeUserId}`, env);
}

/**
 * Switch active account in multi-account session
 * @param masterSessionId - Master session ID
 * @param userId - User ID to switch to
 * @param env - Environment variables
 * @returns Updated multi-account session or null if account not found
 */
export async function switchActiveAccount(
  masterSessionId: string,
  userId: string,
  env: Env
): Promise<MultiAccountSession | null> {
  const multiSession = await getMultiAccountSession(masterSessionId, env);

  if (!multiSession) {
    return null;
  }

  // Check if account exists
  const accountExists = multiSession.accounts.some((acc) => acc.userId === userId);

  if (!accountExists) {
    return null;
  }

  multiSession.activeUserId = userId;
  multiSession.lastUpdated = Date.now();

  await saveMultiAccountSession(masterSessionId, multiSession, env);

  return multiSession;
}

/**
 * Remove account from multi-account session
 * @param masterSessionId - Master session ID
 * @param userId - User ID to remove
 * @param env - Environment variables
 * @returns Updated multi-account session or null
 */
export async function removeAccountFromSession(
  masterSessionId: string,
  userId: string,
  env: Env
): Promise<MultiAccountSession | null> {
  const multiSession = await getMultiAccountSession(masterSessionId, env);

  if (!multiSession) {
    return null;
  }

  // Remove account from list
  multiSession.accounts = multiSession.accounts.filter(
    (acc) => acc.userId !== userId
  );

  // Delete individual session
  await deleteSession(`${masterSessionId}:${userId}`, env);

  // If active account was removed, switch to first available or null
  if (multiSession.activeUserId === userId) {
    multiSession.activeUserId = multiSession.accounts[0]?.userId || '';
  }

  multiSession.lastUpdated = Date.now();

  if (multiSession.accounts.length === 0) {
    // Delete multi-account session if no accounts left
    await env.SESSIONS.delete(`multi:${masterSessionId}`);
    return null;
  }

  await saveMultiAccountSession(masterSessionId, multiSession, env);

  return multiSession;
}
