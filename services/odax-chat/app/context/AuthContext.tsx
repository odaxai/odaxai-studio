// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  updateProfile,
  UserCredential,
  signInWithCredential, // Native Auth
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// User profile interface matching OdaxAI cloud
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  photoURL?: string | null;
  bio?: string;
  plan: 'free' | 'community' | 'enterprise';
  isVerified: boolean;

  // Stats (Root level in DB based on dump)
  totalTokens?: number;
  totalInferences?: number;

  // Maps
  modelsUsed?: Record<string, number>; // Map of model_name -> count
  tokensPerModel?: Record<string, number>; // Map of model_name -> tokens

  // Hardware Info
  hardware?: {
    cpu?: string;
    gpu?: string;
    memory?: string;
    platform?: string;
    cores?: number;
    renderer?: string;
  };

  // Legacy or specific stats
  usageStats?: {
    modelsUsed?: string[] | Record<string, number>;
    totalTokensUsed?: number;
    monthlyTokensUsed?: number;
    totalInferenceCalls?: number;
    requestCount?: number;
    lastActivity?: any;
  };

  createdAt: any;
  updatedAt: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<UserCredential>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load user profile from Firestore (with LocalStorage Cache First)
  const loadUserProfile = async (uid: string): Promise<UserProfile | null> => {
    let cachedProfile: UserProfile | null = null;

    // 1. Try Local Cache First (Instant Load)
    try {
      const cached = localStorage.getItem(`odax_profile_${uid}`);
      if (cached) {
        cachedProfile = JSON.parse(cached) as UserProfile;
        console.log('📦 Loaded profile from local cache:', cachedProfile.email);
      }
    } catch (e) {
      console.warn('⚠️ Failed to load local profile cache', e);
    }

    // 2. Try Server Fetch (Background Sync)
    try {
      console.log(`🔍 Loading profile from server for UID: ${uid}`);
      const userRef = doc(db, 'users', uid);

      // 2s Timeout Race (reduced from 5s)
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve('TIMEOUT'), 2000)
      );

      let userSnap;
      try {
        // Try server fetch with timeout
        const result = (await Promise.race([
          getDoc(userRef),
          timeoutPromise,
        ])) as any;

        if (result === 'TIMEOUT') throw new Error('TIMEOUT');
        userSnap = result;
      } catch (e: any) {
        // Suppress "Client is offline" error matching
        const isOffline =
          e?.message?.includes('offline') || e?.code?.includes('offline');

        if (!isOffline) {
          console.warn(
            '⚠️ Direct Firestore blocked/timed out. Trying API Proxy...'
          );
        } else {
          // calculated silence for expected offline error
        }

        // 3. Try API Proxy (Server-Side Fetch)
        try {
          const res = await fetch(`/api/user/profile/${uid}`);
          if (res.ok) {
            const proxyData = await res.json();
            console.log('✅ Profile loaded via API Proxy:', proxyData.email);
            localStorage.setItem(
              `odax_profile_${uid}`,
              JSON.stringify(proxyData)
            );
            return proxyData as UserProfile;
          } else {
            console.warn('⚠️ API Proxy failed:', res.status);
          }
        } catch (proxyErr) {
          console.error('❌ API Proxy error:', proxyErr);
        }

        console.warn(
          '⚠️ All network attempts failed, trying cache/fallback...'
        );

        // 4. Try Local Cache
        if (cachedProfile) return cachedProfile;

        // 5. EMERGENCY FALLBACK
        console.log('🚨 Using EMERGENCY FALLBACK');
        return {
          uid: uid,
          email: 'local@odaxai.com',
          displayName: 'Local User',
          username: 'local_user',
          photoURL: null,
          bio: 'Local AI Workspace User',
          plan: 'free',
          isVerified: true,
          usageStats: {
            modelsUsed: {},
            totalTokensUsed: 0,
            totalInferenceCalls: 0,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        } as UserProfile;

        return null;
      }

      if (userSnap && userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        console.log('✅ Profile loaded from server:', data.email);

        // Update Cache
        localStorage.setItem(`odax_profile_${uid}`, JSON.stringify(data));
        return data;
      }

      console.warn('⚠️ No profile document on server.');
      return cachedProfile; // Fallback to cache if doc missing (rare) or return null
    } catch (error) {
      console.error('❌ Server load failed/timed out:', error);
      if (cachedProfile) {
        console.log('⚠️ Using cached profile as fallback.');
        return cachedProfile;
      }
      return null;
    }
  };

  // Create user profile in Firestore (first time login)
  const createUserProfile = async (
    user: User,
    displayName?: string
  ): Promise<UserProfile> => {
    const userRef = doc(db, 'users', user.uid);

    const username =
      (user.email?.split('@')[0] || 'user') + Math.floor(Math.random() * 1000);

    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: displayName || user.displayName || 'User',
      username,
      photoURL: user.photoURL || null,
      plan: 'free',
      isVerified: user.emailVerified,
      usageStats: {
        modelsUsed: {}, // Initialize as empty map
        totalTokensUsed: 0,
        totalInferenceCalls: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, newProfile);
    console.log('✅ User profile created:', user.uid);
    return newProfile;
  };

  // refresh profile manually
  const refreshProfile = async () => {
    if (user) {
      console.log('🔄 Refreshing profile manually...');
      setLoading(true);
      const userProfile = await loadUserProfile(user.uid);
      if (userProfile) {
        setProfile(userProfile);
      }
      setLoading(false);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        // OPTIMISTIC CACHE LOAD: Check cache immediately to unblock UI
        const cacheKey = `odax_profile_${user.uid}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setProfile(parsed);
            setLoading(false); // ✨ Instant Interaction
            console.log('⚡️ Optimistically loaded profile from cache');
          } catch (e) {
            console.warn('Invalid cache', e);
          }
        }

        // Load or create profile (Background Sync)
        let userProfile = await loadUserProfile(user.uid);

        if (!userProfile) {
          // If neither cache nor server returned a profile, create one
          // (Only if we really failed everything)
          if (!cached) {
            // First time login - create profile
            userProfile = await createUserProfile(user);
          }
        }

        if (userProfile) {
          setProfile(userProfile);
          // Update cache just in case loadUserProfile didn't (if we created new)
          localStorage.setItem(cacheKey, JSON.stringify(userProfile));
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Listen for native google auth tokens from macOS app
  useEffect(() => {
    const handleNativeAuth = async (event: any) => {
      console.log('Received native auth event:', event.detail);
      const { idToken, accessToken } = event.detail || {};

      if (idToken && accessToken) {
        try {
          // Force Session Persistence
          await setPersistence(auth, browserSessionPersistence);
          const credential = GoogleAuthProvider.credential(
            idToken,
            accessToken
          );
          await signInWithCredential(auth, credential);
          console.log('Successfully signed in with native credentials');

          // Soft redirect to home (no reload)
          router.push('/');
        } catch (error) {
          console.error('Error signing in with native credentials:', error);
        }
      }
    };

    window.addEventListener('odax-native-auth', handleNativeAuth);

    // Check for existing tokens on global window object (robustness for race conditions)
    const globalTokens = (window as any).__odax_tokens;
    if (globalTokens && globalTokens.idToken) {
      console.log('Found existing global tokens on mount');
      handleNativeAuth({ detail: globalTokens });
      // Clear them to prevent reuse loop
      (window as any).__odax_tokens = null;
    }

    return () =>
      window.removeEventListener('odax-native-auth', handleNativeAuth);
  }, []);

  // Google Sign In - use popup for immediate Google login dialog
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Use popup for immediate Google login
    // Force persistence for this action specifically to be safe
    try {
      await setPersistence(auth, browserSessionPersistence);
    } catch (e) {
      console.warn('Failed to set persistence before login:', e);
    }
    return await signInWithPopup(auth, provider);
  };

  // Email/Password Sign In
  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Sign Up with Email/Password
  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name
    await updateProfile(result.user, { displayName });

    // Create profile in Firestore
    await createUserProfile(result.user, displayName);
  };

  // Sign Out
  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUp,
        signOut,
        refreshProfile,
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
