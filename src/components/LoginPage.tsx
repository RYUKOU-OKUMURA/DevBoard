import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
  onBack?: () => void;
}

export default function LoginPage({ onBack }: LoginPageProps) {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-app)] via-[var(--bg-secondary)] to-[var(--bg-app)] flex items-center justify-center p-4 transition-colors">
      <div className="max-w-md w-full bg-surface-primary rounded-lg shadow-lg p-8 border border-[var(--border-subtle)] transition-colors">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            トップページに戻る
          </button>
        )}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">
            DevBoard
          </h1>
          <p className="text-[var(--text-muted)] text-sm">
            Visualize and organize your GitHub repositories
          </p>
        </div>

        <div className="mb-6">
          <div className="bg-surface-secondary rounded-lg p-4 mb-6 border border-[var(--border-subtle)] transition-colors">
            <h3 className="text-[var(--text-primary)] font-semibold mb-2 text-sm">
              This app will request:
            </h3>
            <ul className="text-[var(--text-secondary)] text-sm space-y-1">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Access to your repositories (including private)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Read your user profile information</span>
              </li>
            </ul>
          </div>

          <button
            onClick={login}
            className="w-full bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-emphasis)] text-text-inverse font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3 shadow-sm"
          >
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            Sign in with GitHub
          </button>
        </div>

        <div className="text-center text-[var(--text-muted)] text-xs">
          <p>
            By signing in, you agree to allow this app to access your GitHub
            data.
          </p>
          <p className="mt-2">
            Your access token is encrypted and stored securely for 30 days.
          </p>
        </div>
      </div>
    </div>
  );
}
