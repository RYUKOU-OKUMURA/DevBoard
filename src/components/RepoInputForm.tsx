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
      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm p-3 space-y-2"
    >
      <div>
        <label htmlFor="repo-input" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          リポジトリ URL または owner/repo
        </label>
        <textarea
          id="repo-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="例: facebook/react (複数の場合は改行)"
          rows={2}
          className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
          複数入力可。無効な入力は自動スキップされます。
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-600 whitespace-nowrap"
        >
          {isLoading ? '読み込み中...' : 'リポジトリを読み込む'}
        </button>
      </div>
    </form>
  );
};
