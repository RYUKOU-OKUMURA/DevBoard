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
      className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3"
    >
      <div>
        <label htmlFor="repo-input" className="block text-sm font-medium text-gray-700">
          リポジトリ URL または `owner/repo`
        </label>
        <textarea
          id="repo-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            '例: https://github.com/facebook/react\nまたは: facebook/react\n複数入力する場合は改行してください'
          }
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          最大 10 件程度を推奨。重複や無効な入力は自動的にスキップされます。
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isLoading ? '読み込み中...' : '指定リポジトリを読み込む'}
        </button>
      </div>
    </form>
  );
};
