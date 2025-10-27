import React from 'react';

interface RepoInputFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const RepoInputForm: React.FC<RepoInputFormProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading,
}) => {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-secondary border border-[color:var(--border-subtle)] rounded-lg shadow-sm p-3 space-y-2 transition-colors"
    >
      <div>
        <label htmlFor="repo-input" className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">
          リポジトリ URL または owner/repo
        </label>
        <textarea
          id="repo-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="例: facebook/react (複数の場合は改行)"
          rows={2}
          className="block w-full rounded-md border border-[color:var(--border-subtle)] bg-surface-primary text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] px-3 py-1.5 text-sm shadow-sm focus:border-[color:var(--accent-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-blue)] transition-colors"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[color:var(--text-muted)] flex-1">
          複数入力可。無効な入力は自動スキップされます。
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center rounded-md bg-[color:var(--accent-blue)] px-3 py-1.5 text-xs font-medium text-text-inverse shadow-sm transition-colors hover:bg-[color:var(--accent-blue-emphasis)] disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-[color:var(--text-muted)] whitespace-nowrap"
        >
          {isLoading ? '読み込み中...' : 'リポジトリを読み込む'}
        </button>
      </div>
    </form>
  );
};
