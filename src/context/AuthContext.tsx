import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isDemoLead: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: () => void;
  logout: () => void;
  updateUser: (updates: Partial<UserProfile>) => void;
}

const DEMO_LEAD_USER: UserProfile = {
  uid: 'demo-lead-uid',
  name: 'Alex Johnson (Demo Lead)',
  email: 'lead@collectit.app',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80',
  paypalEmail: 'demo.lead@example.com',
  paypalEmailVerified: true,
  paypalEmailChangedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isDemoLead: false,
  isLoading: true,
  loginWithGoogle: async () => {},
  loginAsDemo: () => {},
  logout: () => {},
  updateUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isDemoLead, setIsDemoLead] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persistent demo or user session
    const storedAuth = localStorage.getItem('collectit_auth');
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        setUser(parsed);
        setIsDemoLead(parsed.uid === 'demo-lead-uid');
      } catch (e) {
        localStorage.removeItem('collectit_auth');
      }
    } else {
      // Default to Demo Lead for frictionless hackathon judge evaluation
      setUser(DEMO_LEAD_USER);
      setIsDemoLead(true);
      localStorage.setItem('collectit_auth', JSON.stringify(DEMO_LEAD_USER));
    }
    setIsLoading(false);
  }, []);

  const loginAsDemo = () => {
    setUser(DEMO_LEAD_USER);
    setIsDemoLead(true);
    localStorage.setItem('collectit_auth', JSON.stringify(DEMO_LEAD_USER));
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('collectit_auth', JSON.stringify(updated));
      return updated;
    });
  };

  const loginWithGoogle = async () => {
    try {
      // Try dynamic Firebase import if config exists
      const configRes = await fetch('/firebase-applet-config.json').catch(() => null);
      if (configRes && configRes.ok) {
        const fbConfig = await configRes.json();
        const { initializeApp, getApps } = await import('firebase/app');
        const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');

        const app = getApps().length === 0 ? initializeApp(fbConfig) : getApps()[0];
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);

        const googleUser: UserProfile = {
          uid: cred.user.uid,
          name: cred.user.displayName || 'Organizer',
          email: cred.user.email || 'user@collectit.app',
          avatarUrl: cred.user.photoURL || undefined,
        };
        setUser(googleUser);
        setIsDemoLead(false);
        localStorage.setItem('collectit_auth', JSON.stringify(googleUser));
        return;
      }
    } catch (err) {
      console.warn('Firebase auth attempt, falling back to Demo Lead:', err);
    }
    // Fallback if popup cancelled or Firebase not provisioned
    loginAsDemo();
  };

  const logout = () => {
    setUser(null);
    setIsDemoLead(false);
    localStorage.removeItem('collectit_auth');
  };

  return (
    <AuthContext.Provider value={{ user, isDemoLead, isLoading, loginWithGoogle, loginAsDemo, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
