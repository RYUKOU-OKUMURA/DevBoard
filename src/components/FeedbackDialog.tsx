/**
 * FeedbackDialog - フィードバック送信モーダル
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../hooks/useToast';
import { submitFeedback } from '../services/feedbackService';
import type { FeedbackCategory } from '../services/feedbackService';
import { GlassModal } from './ui/GlassModal';

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_OPTIONS: Array<{ value: FeedbackCategory; label: string }> = [
  { value: 'bug', label: 'バグ報告' },
  { value: 'feature', label: '機能要望' },
  { value: 'other', label: 'その他' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setCategory('bug');
      setContent('');
      setEmail('');
      setSubmitError(null);
      setHasSubmitted(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const normalizedContent = content.trim();
  const normalizedEmail = email.trim();
  const contentLength = normalizedContent.length;
  const emailError =
    normalizedEmail.length > 0 && !EMAIL_PATTERN.test(normalizedEmail)
      ? 'メールアドレスの形式が正しくありません'
      : null;
  const contentError =
    contentLength === 0
      ? '内容を入力してください'
      : contentLength < 10
      ? '10文字以上で入力してください'
      : contentLength > 2000
      ? '2000文字以内で入力してください'
      : null;
  const isFormValid = !emailError && !contentError;
  const showContentError = hasSubmitted || normalizedContent.length > 0;
  const showEmailError = hasSubmitted || normalizedEmail.length > 0;

  const contentDescribedBy = useMemo(() => {
    const ids = ['feedback-content-hint'];
    if (showContentError && contentError) {
      ids.push('feedback-content-error');
    }
    return ids.join(' ');
  }, [contentError, showContentError]);

  const emailDescribedBy = useMemo(() => {
    const ids = ['feedback-email-hint'];
    if (showEmailError && emailError) {
      ids.push('feedback-email-error');
    }
    return ids.join(' ');
  }, [emailError, showEmailError]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    setHasSubmitted(true);
    setSubmitError(null);
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
      await submitFeedback({
        category,
        content: normalizedContent,
        email: normalizedEmail || undefined,
        timestamp: new Date().toISOString(),
        userAgent,
      });
      showToast({
        variant: 'success',
        title: 'フィードバックを送信しました',
        description: 'ご協力ありがとうございます',
      });
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'フィードバックの送信に失敗しました';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={handleClose}
      title="フィードバックを送る"
      className="max-w-2xl"
      tone="light"
    >
      <div className="space-y-stack-lg">
        {/* 種別 */}
        <div>
          <label className="block text-body-sm text-[var(--text-secondary)] mb-stack-xs">
            種別
          </label>
          <div className="flex gap-inline-sm">
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value)}
                disabled={isSubmitting}
                className={`
                  px-inset-md py-inset-sm rounded-md text-body transition motion-reduce:transition-none
                  ${
                    category === option.value
                      ? 'bg-brand-purple text-white'
                      : 'bg-[var(--surface-tertiary)] text-[var(--text-primary)] hover:bg-[var(--surface-tertiary-hover)]'
                  }
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                  focus-visible:ring-brand-purple focus-visible:ring-offset-[var(--bg-secondary)]
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                aria-pressed={category === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 内容 */}
        <div>
          <label
            htmlFor="feedback-content"
            className="block text-body-sm text-[var(--text-secondary)] mb-stack-xs"
          >
            内容 <span className="text-[var(--accent-red)]">*</span>
          </label>
          <textarea
            id="feedback-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="10文字以上で具体的に入力してください"
            className={`
              w-full h-40 px-inset-md py-inset-sm
              bg-[var(--surface-tertiary)] rounded-md text-body
              text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
              resize-none border transition motion-reduce:transition-none
              ${
                showContentError && contentError
                  ? 'border-[var(--accent-red)]'
                  : 'border-[var(--border-subtle)]'
              }
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-brand-purple focus-visible:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            maxLength={2000}
            aria-required="true"
            aria-invalid={showContentError && !!contentError}
            aria-describedby={contentDescribedBy}
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between text-caption text-[var(--text-tertiary)] mt-stack-xs">
            <span id="feedback-content-hint">10〜2000文字で入力してください</span>
            <span aria-live="polite">{content.length} / 2000 文字</span>
          </div>
          {showContentError && contentError && (
            <p
              id="feedback-content-error"
              role="alert"
              className="text-body-sm text-[var(--accent-red)] mt-stack-xs"
            >
              {contentError}
            </p>
          )}
        </div>

        {/* メール */}
        <div>
          <label
            htmlFor="feedback-email"
            className="block text-body-sm text-[var(--text-secondary)] mb-stack-xs"
          >
            メールアドレス（任意）
          </label>
          <input
            id="feedback-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@email.com"
            className={`
              w-full px-inset-md py-inset-sm
              bg-[var(--surface-tertiary)] rounded-md text-body
              text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
              border transition motion-reduce:transition-none
              ${
                showEmailError && emailError
                  ? 'border-[var(--accent-red)]'
                  : 'border-[var(--border-subtle)]'
              }
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-brand-purple focus-visible:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-invalid={showEmailError && !!emailError}
            aria-describedby={emailDescribedBy}
            disabled={isSubmitting}
          />
          <p id="feedback-email-hint" className="text-caption text-[var(--text-tertiary)] mt-stack-xs">
            返信希望の場合のみご入力ください
          </p>
          {showEmailError && emailError && (
            <p
              id="feedback-email-error"
              role="alert"
              className="text-body-sm text-[var(--accent-red)] mt-stack-xs"
            >
              {emailError}
            </p>
          )}
        </div>

        {submitError && (
          <div className="p-inset-md bg-[#EF4444]/10 border border-[#EF4444] rounded-lg" role="alert">
            <p className="text-body-sm text-[#EF4444]">{submitError}</p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex justify-end gap-inline-sm pt-stack-sm">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className={`
              px-inset-lg py-inset-md rounded-md text-body
              bg-[var(--surface-tertiary)] text-[var(--text-primary)]
              hover:bg-[var(--surface-tertiary-hover)] transition motion-reduce:transition-none
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-[var(--bg-secondary)]
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`
              px-inset-lg py-inset-md rounded-md text-body font-medium
              bg-brand-purple text-white hover:bg-brand-purple-hover
              transition motion-reduce:transition-none
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              focus-visible:ring-brand-purple focus-visible:ring-offset-[var(--bg-secondary)]
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-live="polite"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-inline-xs">
                <span className="inline-block animate-spin">⏳</span>
                送信中...
              </span>
            ) : (
              '送信'
            )}
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
