import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const MAX_ACCOUNTS = 5;

export default function AccountSwitcher() {
  const { user, accounts, login, logout, switchAccount, removeAccount } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSwitchAccount = async (userId: string) => {
    if (userId !== user?.userId) {
      await switchAccount(userId);
    }
    setIsOpen(false);
  };

  const handleRemoveAccount = async (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const accountToRemove = accounts.find(a => a.userId === userId);

    // If this is the last account, confirm complete logout
    if (accounts.length === 1) {
      if (window.confirm(`最後のアカウント "${accountToRemove?.username}" を削除すると、全アカウントからログアウトします。よろしいですか？`)) {
        await logout();
      }
    } else {
      if (window.confirm(`アカウント "${accountToRemove?.username}" を削除しますか?`)) {
        await removeAccount(userId);
        setIsOpen(false);
      }
    }
  };

  const handleAddAccount = () => {
    login();
  };

  if (!user) {
    return null;
  }

  const canAddMoreAccounts = accounts.length < MAX_ACCOUNTS;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Account Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          {/* Avatar placeholder */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-gray-900 dark:text-gray-100 hidden sm:inline">
            {user.username}
          </span>
          {accounts.length > 1 && (
            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
              {accounts.length}
            </span>
          )}
        </div>
        {/* Dropdown arrow */}
        <svg
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          {/* Account List */}
          <div className="px-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 uppercase tracking-wide">
              アカウント ({accounts.length}/{MAX_ACCOUNTS})
            </p>
            {accounts.map((account) => (
              <div
                key={account.userId}
                className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  account.userId === user.userId ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
                onClick={() => handleSwitchAccount(account.userId)}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {account.username.charAt(0).toUpperCase()}
                </div>
                {/* Username */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {account.username}
                  </p>
                  {account.userId === user.userId && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">アクティブ</p>
                  )}
                </div>
                {/* Remove button - always show */}
                <button
                  onClick={(e) => handleRemoveAccount(account.userId, e)}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                  title={accounts.length === 1 ? "アカウントを削除（ログアウト）" : "アカウントを削除"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add Account Button */}
          {canAddMoreAccounts && (
            <button
              onClick={handleAddAccount}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              別のアカウントを追加
            </button>
          )}

          {/* Account limit warning */}
          {!canAddMoreAccounts && (
            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
              最大 {MAX_ACCOUNTS} アカウントまで
            </div>
          )}

          {/* Logout Button */}
          <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
            <button
              onClick={logout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              全アカウントからログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
