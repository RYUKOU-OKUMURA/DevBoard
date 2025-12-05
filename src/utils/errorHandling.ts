/**
 * Error handling utilities for TODO/Issue sync operations
 */

import type { ToastMessage } from '../types';
import { devError, devInfo } from './logger';

/**
 * Custom error types for better error handling
 */
export class NetworkError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class PermissionError extends Error {
  constructor(message: string, public readonly resource?: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string, public readonly resource?: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public readonly resetAt?: Date) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class SyncConflictError extends Error {
  constructor(message: string, public readonly conflictData?: unknown) {
    super(message);
    this.name = 'SyncConflictError';
  }
}

type ErrorToastPayload = Omit<ToastMessage, 'id'>;

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[]; // Error names that should trigger retry
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['NetworkError', 'RateLimitError'],
};

/**
 * AbortError 判定（ブラウザ/Node 両対応のゆるいチェック）
 */
export function isAbortError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const anyError = error as { name?: string; code?: number; message?: string };
  if (anyError.name === 'AbortError') return true;
  // 一部環境では code=20 で Abort を表す
  if (anyError.code === 20) return true;
  // DOMException が利用可能な場合は名前を確認
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  return false;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error, config: RetryConfig): boolean {
  return config.retryableErrors.includes(error.name);
}

/**
 * Execute an async function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let delay = retryConfig.initialDelay;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if this is the last attempt
      if (attempt === retryConfig.maxAttempts) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(lastError, retryConfig)) {
        break;
      }

      // For rate limit errors, use the reset time if available
      if (lastError instanceof RateLimitError && lastError.resetAt) {
        const waitTime = Math.max(0, lastError.resetAt.getTime() - Date.now());
        delay = Math.min(waitTime, retryConfig.maxDelay);
      }

      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, lastError.message);
      await sleep(delay);

      // Exponential backoff
      delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Parse GraphQL errors and convert to appropriate error types
 */
export function parseGraphQLError(error: unknown): Error {
  const normalized = normalizeError(error);
  const message = normalized.message.toLowerCase();

  // Check for authentication errors
  if (message.includes('unauthorized') || message.includes('authentication')) {
    return new AuthenticationError('Authentication failed. Please check your GitHub token.');
  }

  // Check for permission errors
  if (message.includes('permission') || message.includes('forbidden')) {
    return new PermissionError('Permission denied. You may not have access to this resource.');
  }

  // Check for not found errors
  if (message.includes('not found') || message.includes('404')) {
    return new NotFoundError('Resource not found.');
  }

  // Check for rate limit errors
  if (message.includes('rate limit') || message.includes('api rate')) {
    return new RateLimitError('GitHub API rate limit exceeded. Please try again later.');
  }

  // Check for network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('econnrefused')
  ) {
    return new NetworkError('Network error occurred. Please check your connection.', normalized);
  }

  return normalized;
}

/**
 * Safe error message extraction
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Normalize unknown errors into Error
 */
export function normalizeError(error: unknown, fallbackMessage = 'Unexpected error'): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error || fallbackMessage);
  }
  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(fallbackMessage);
  }
}

/**
 * User-friendly error messages
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (isAbortError(error)) {
    return '操作をキャンセルしました。';
  }

  if (error instanceof AuthenticationError) {
    return 'Authentication failed. Please sign in again.';
  }

  if (error instanceof PermissionError) {
    return `Permission denied${error.resource ? ` for ${error.resource}` : ''}. Check your access rights.`;
  }

  if (error instanceof NotFoundError) {
    return `Resource not found${error.resource ? `: ${error.resource}` : ''}`;
  }

  if (error instanceof RateLimitError) {
    if (error.resetAt) {
      const resetTime = error.resetAt.toLocaleTimeString();
      return `GitHub API rate limit exceeded. Resets at ${resetTime}.`;
    }
    return 'GitHub API rate limit exceeded. Please try again later.';
  }

  if (error instanceof NetworkError) {
    return 'Network error. Please check your internet connection and try again.';
  }

  if (error instanceof SyncConflictError) {
    return 'Sync conflict detected. Please resolve the conflict manually.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Error logging utility
 */
export function logError(context: string, error: unknown): void {
  const normalized = normalizeError(error);
  console.error(`[${context}]`, normalized);

  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry, LogRocket, etc.
    // Sentry.captureException(error);
  }
}

/**
 * Build a standardized toast payload for errors
 */
export function buildErrorToast(
  error: unknown,
  context: string,
  options: { fallbackDescription?: string; defaultTitle?: string } = {}
): ErrorToastPayload {
  const normalized = normalizeError(error);
  const description = options.fallbackDescription ?? getUserFriendlyErrorMessage(normalized);
  const title = options.defaultTitle ?? context;

  return {
    variant: 'error',
    title,
    description,
    duration: 4000,
  };
}

/**
 * Handle an error by logging and (optionally) showing a toast.
 * Returns a user-facing message for UI usage.
 */
export function handleErrorWithToast(
  error: unknown,
  context: string,
  options: {
    showToast?: (toast: ErrorToastPayload) => void;
    fallbackDescription?: string;
    defaultTitle?: string;
    logger?: (ctx: string, err: unknown) => void;
    skipToastForAbort?: boolean;
  } = {}
): string {
  if (isAbortError(error)) {
    devInfo(`[${context}] request aborted`);
    return '操作をキャンセルしました。';
  }

  const normalized = normalizeError(error);
  const message = options.fallbackDescription ?? getUserFriendlyErrorMessage(normalized);

  const log = options.logger ?? logError;
  log(context, normalized);
  devError(`[${context}]`, normalized);

  if (options.showToast && !(options.skipToastForAbort && isAbortError(error))) {
    options.showToast(
      buildErrorToast(normalized, options.defaultTitle ?? context, {
        fallbackDescription: message,
        defaultTitle: options.defaultTitle,
      })
    );
  }

  return message;
}

/**
 * Wrap async operations with comprehensive error handling
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: string,
  options: {
    retry?: boolean;
    retryConfig?: Partial<RetryConfig>;
    onError?: (error: Error) => void;
    fallback?: T;
  } = {}
): Promise<T | undefined> {
  try {
    const operation = async () => {
      try {
        return await fn();
      } catch (error) {
        throw parseGraphQLError(error);
      }
    };

    if (options.retry) {
      return await withRetry(operation, options.retryConfig);
    }

    return await operation();
  } catch (error) {
    const normalized = normalizeError(error);
    logError(context, normalized);

    if (options.onError) {
      options.onError(normalized);
    }

    if (options.fallback !== undefined) {
      return options.fallback;
    }

    throw normalized;
  }
}
