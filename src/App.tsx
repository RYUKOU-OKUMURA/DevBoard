import { useState } from 'react';
import { RepoBoard } from './components';
import { Repo } from './types';
import { mockRepos } from './mocks/mockRepos';
import { fetchUserRepos } from './api/repos';

function App() {
  const [repos, setRepos] = useState<Repo[]>(mockRepos);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(true);

  const loadRealData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const realRepos = await fetchUserRepos();
      setRepos(realRepos);
      setUseMockData(false);
    } catch (err) {
      console.error('Failed to load repositories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
      // Fall back to mock data on error
      setRepos(mockRepos);
      setUseMockData(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (useMockData) {
      // Just refresh mock data
      setRepos([...mockRepos]);
    } else {
      // Reload from API
      loadRealData();
    }
  };

  return (
    <div className="App">
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
      {useMockData && (
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

      {/* Main Board */}
      <RepoBoard
        repos={repos}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />
    </div>
  );
}

export default App;
