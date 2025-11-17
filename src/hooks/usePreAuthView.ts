import { useEffect, useRef, useState } from 'react';
import type { User } from '../contexts/AuthContext';

export type PreAuthView = 'landing' | 'login';

export function usePreAuthView(user: User | null) {
  const [view, setView] = useState<PreAuthView>('landing');
  const previousUserRef = useRef<User | null>(user);

  useEffect(() => {
    if (previousUserRef.current && !user) {
      setView('landing');
    }
    previousUserRef.current = user;
  }, [user]);

  return {
    view,
    showLanding: () => setView('landing'),
    showLogin: () => setView('login'),
  };
}
