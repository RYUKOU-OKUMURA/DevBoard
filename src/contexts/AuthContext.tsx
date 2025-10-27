import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  userId: string;
  username: string;
}

interface AccountsResponse {
  accounts: User[];
  activeUserId: string | null;
}

interface AuthContextType {
  user: User | null; // Active user
  accounts: User[]; // All logged-in accounts
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  switchAccount: (userId: string) => Promise<void>;
  removeAccount: (userId: string) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Fetch all accounts
      const accountsResponse = await fetch('/api/auth/accounts', {
        credentials: 'include',
      });

      if (accountsResponse.ok) {
        const accountsData: AccountsResponse = await accountsResponse.json();
        setAccounts(accountsData.accounts);

        // Find and set active user
        if (accountsData.activeUserId) {
          const activeUser = accountsData.accounts.find(
            (acc) => acc.userId === accountsData.activeUserId
          );
          setUser(activeUser || null);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
        setAccounts([]);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    // Redirect to login endpoint (will add new account to session)
    window.location.href = '/api/auth/login';
  };

  const switchAccount = async (userId: string) => {
    try {
      const response = await fetch('/api/auth/switch', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data: AccountsResponse = await response.json();
        setAccounts(data.accounts);

        const activeUser = data.accounts.find(
          (acc) => acc.userId === data.activeUserId
        );
        setUser(activeUser || null);

        // Reload page to fetch new account's repositories
        window.location.reload();
      } else {
        console.error('Failed to switch account');
      }
    } catch (error) {
      console.error('Switch account failed:', error);
    }
  };

  const removeAccount = async (userId: string) => {
    try {
      const response = await fetch('/api/auth/remove', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data: AccountsResponse = await response.json();
        setAccounts(data.accounts);

        if (data.activeUserId) {
          const activeUser = data.accounts.find(
            (acc) => acc.userId === data.activeUserId
          );
          setUser(activeUser || null);

          // Reload if we removed the active account
          if (userId === user?.userId) {
            window.location.reload();
          }
        } else {
          // All accounts removed
          setUser(null);
          window.location.href = '/';
        }
      } else {
        console.error('Failed to remove account');
      }
    } catch (error) {
      console.error('Remove account failed:', error);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      setAccounts([]);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accounts,
        loading,
        login,
        logout,
        switchAccount,
        removeAccount,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
