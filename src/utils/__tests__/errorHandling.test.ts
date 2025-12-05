import { describe, it, expect, vi } from 'vitest';
import {
  AuthenticationError,
  RateLimitError,
  buildErrorToast,
  handleErrorWithToast,
} from '../errorHandling';

describe('errorHandling helpers', () => {
  it('buildErrorToast returns user-friendly rate limit message', () => {
    const resetAt = new Date('2024-01-01T00:00:00Z');
    const toast = buildErrorToast(new RateLimitError('rate limited', resetAt), '取得失敗');

    expect(toast.variant).toBe('error');
    expect(toast.title).toBe('取得失敗');
    expect(toast.description).toContain('rate limit');
  });

  it('handleErrorWithToast notifies via toast and returns message', () => {
    const showToast = vi.fn();
    const message = handleErrorWithToast(new AuthenticationError('bad token'), 'API呼び出し', {
      showToast,
    });

    expect(message).toContain('Authentication failed');
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast.mock.calls[0][0].title).toBe('API呼び出し');
  });
});
