import React, { Component, ReactNode } from 'react';
import { getUserFriendlyErrorMessage, logError } from '../utils/errorHandling';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    logError('ErrorBoundary', error);
    console.error('[ErrorBoundary] component stack', info.componentStack);
    this.props.onError?.(error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const message = getUserFriendlyErrorMessage(this.state.error);

    return (
      <div className="min-h-screen bg-surface-app flex items-center justify-center px-inset-lg">
        <div className="w-full max-w-xl rounded-2xl border border-[var(--border-strong)] bg-surface-primary shadow-lg p-inset-xl space-y-4 text-[var(--text-primary)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--accent-red-muted)] text-[var(--accent-red)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <p className="text-title-4 font-semibold">画面の表示で問題が発生しました</p>
              <p className="text-body-sm text-[var(--text-secondary)]">{message}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-text-inverse font-semibold shadow-sm transition-colors hover:bg-[var(--accent-blue-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2"
            >
              再読み込み
            </button>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-surface-secondary px-4 py-2 text-[var(--text-primary)] font-semibold shadow-sm transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    );
  }
}
