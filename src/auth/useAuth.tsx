import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { auth, googleProvider } from '../config/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  localOnly: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  continueLocally: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const LOCAL_MODE_KEY = 'study-os-local-mode';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [localOnly, setLocalOnly] = useState(() => localStorage.getItem(LOCAL_MODE_KEY) === 'true');

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser) {
        setLocalOnly(false);
        localStorage.removeItem(LOCAL_MODE_KEY);
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      localOnly,
      signIn: async () => {
        setLocalOnly(false);
        localStorage.removeItem(LOCAL_MODE_KEY);
        await signInWithPopup(auth, googleProvider);
      },
      signOut: async () => {
        await firebaseSignOut(auth);
        setLocalOnly(false);
        localStorage.removeItem(LOCAL_MODE_KEY);
      },
      continueLocally: () => {
        setLocalOnly(true);
        localStorage.setItem(LOCAL_MODE_KEY, 'true');
      },
    }),
    [loading, localOnly, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
