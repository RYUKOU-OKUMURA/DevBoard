import { useState } from 'react';
import { RepoBoard, RepoInputForm } from './components';
import { Repo } from './types';
import { mockRepos } from './mocks/mockRepos';
import { fetchUserRepos, fetchRepositoriesByUrls } from './api/repos';

type DataSource = 'mock' | 'viewer' | 'custom';

function App() {
  const [repos, setRepos] = useState<Repo[]>(mockRepos);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('mock');
  const [customInput, setCustomInput] = useState('');
  const [customRepoSources, setCustomRepoSources] = useState<string[]>([]);

  const parseCustomInput = (value: string): string[] => {
    return value
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, 25);
  };

  const loadCustomRepos = async (sources: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const { repos: fetched, failed } = await fetchRepositoriesByUrls(sources);
      if (fetched.length === 0) {
        const message = failed.length
          ? `指定されたリポジトリを読み込めませんでした: ${failed.join(', ')}`
          : '有効なリポジトリを入力してください。';
        setError(message);
        return;
      }

      const uniqueNames = Array.from(new Set(fetched.map((repo) => repo.nameWithOwner)));
      setRepos(fetched);
      setDataSource('custom');
      setCustomRepoSources(uniqueNames);
      setCustomInput(uniqueNames.join('\n'));

      if (failed.length > 0) {
        setError(`一部のリポジトリを読み込めませんでした: ${failed.join(', ')}`);
      }
    } catch (err) {
      console.error('Failed to load custom repositories:', err);
      setError(err instanceof Error ? err.message : 'リポジトリの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRealData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const realRepos = await fetchUserRepos();
      setRepos(realRepos);
      setDataSource('viewer');
    } catch (err) {
      console.error('Failed to load repositories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
      // Fall back to mock data on error
      setRepos(mockRepos);
      setDataSource('mock');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (dataSource === 'mock') {
      // Just refresh mock data
      setRepos([...mockRepos]);
    } else if (dataSource === 'viewer') {
      // Reload from API
      loadRealData();
    } else if (dataSource === 'custom') {
      if (customRepoSources.length > 0) {
        loadCustomRepos(customRepoSources);
      }
    }
  };

  const handleCustomSubmit = async () => {
    const sources = parseCustomInput(customInput);
    if (sources.length === 0) {
      setError('リポジトリ URL または `owner/repo` を入力してください');
      return;
    }
    await loadCustomRepos(sources);
  };

  return (
    <div className="App min-h-screen bg-gray-100">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-red-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mock Data Banner */}
      {dataSource === 'mock' && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-blue-400 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-blue-800">
                Using mock data. Click "Load Real Data" to fetch from GitHub.
              </span>
            </div>
            <button
              onClick={loadRealData}
              disabled={isLoading}
              className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Load Real Data
            </button>
          </div>
        </div>
      )}

      {/* Custom Data Banner */}
      {dataSource === 'custom' && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-green-900">
                指定したリポジトリ ({customRepoSources.length} 件) を表示中です。
              </span>
            </div>
            <button
              onClick={() => {
                setDataSource('mock');
                setRepos(mockRepos);
                setCustomRepoSources([]);
                setCustomInput('');
              }}
              className="text-sm font-medium text-green-700 hover:text-green-900"
            >
              モックデータに戻す
            </button>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <RepoInputForm
            value={customInput}
            onChange={setCustomInput}
            onSubmit={handleCustomSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Main Board */}
      <RepoBoard repos={repos} isLoading={isLoading} onRefresh={handleRefresh} />
    </div>
  );
}

export default App;
