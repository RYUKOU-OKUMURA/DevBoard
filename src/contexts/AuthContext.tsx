import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createApiClient } from '@/services/apiClient';
import { devError } from '../utils/logger';

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
  const isMountedRef = useRef(true);
  const requestControllerRef = useRef<AbortController | null>(null);
  const authClient = createApiClient('/api/auth');

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
    return () => {
      isMountedRef.current = false;
      requestControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const accountsData = await authClient.get<AccountsResponse>('/accounts', {
        signal: controller.signal,
      });
      if (!isMountedRef.current) return;
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
    } catch (error) {
      devError('Auth check failed:', error);
      if (controller.signal.aborted || !isMountedRef.current) return;
      setUser(null);
      setAccounts([]);
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const login = () => {
    // Redirect to login endpoint (will add new account to session)
    window.location.href = '/api/auth/login';
  };

  const switchAccount = async (userId: string) => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const data = await authClient.post<AccountsResponse>(
        '/switch',
        { userId },
        { signal: controller.signal }
      );
      if (!isMountedRef.current) return;
      setAccounts(data.accounts);

      const activeUser = data.accounts.find(
        (acc) => acc.userId === data.activeUserId
      );
      setUser(activeUser || null);

      // Reload page to fetch new account's repositories
      window.location.reload();
    } catch (error) {
      devError('Switch account failed:', error);
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
    }
  };

  const removeAccount = async (userId: string) => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const data = await authClient.post<AccountsResponse>(
        '/remove',
        { userId },
        { signal: controller.signal }
      );
      if (!isMountedRef.current) return;
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
    } catch (error) {
      devError('Remove account failed:', error);
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
    }
  };

  const logout = async () => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      await authClient.post('/logout', undefined, { signal: controller.signal });
      if (isMountedRef.current) {
        setUser(null);
        setAccounts([]);
      }
      window.location.href = '/';
    } catch (error) {
      devError('Logout failed:', error);
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
