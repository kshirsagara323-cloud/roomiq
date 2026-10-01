import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, isConfigured } from '../lib/firebase';
import { clean } from '../lib/utils';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const MAX_TRIES = 5;
const LOCK_MS = 30000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(!isConfigured);
  const [profileReady, setProfileReady] = useState(true);
  const [checking, setChecking] = useState(false); // role check in progress during login
  const fails = useRef({ n: 0, until: 0 });

  useEffect(() => {
    if (!isConfigured) return undefined;
    let unsubProfile = () => {};
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      unsubProfile();
      setUser(u);
      if (!u) {
        setProfile(null);
        setProfileReady(true);
        setAuthReady(true);
        return;
      }
      setProfileReady(false);
      // live profile: edits from any tab/device show up everywhere at once
      unsubProfile = onSnapshot(
        doc(db, 'users', u.uid),
        (snap) => {
          setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
          setProfileReady(true);
          setAuthReady(true);
        },
        () => {
          setProfile(null);
          setProfileReady(true);
          setAuthReady(true);
        },
      );
    });
    return () => {
      unsubProfile();
      unsubAuth();
    };
  }, []);

  const guardLock = () => {
    if (Date.now() < fails.current.until) {
      const s = Math.ceil((fails.current.until - Date.now()) / 1000);
      throw new Error(`Too many failed attempts. Try again in ${s}s.`);
    }
  };
  const recordFail = () => {
    fails.current.n += 1;
    if (fails.current.n >= MAX_TRIES) fails.current = { n: 0, until: Date.now() + LOCK_MS };
  };

  const ensureRole = async (u, role, createIfMissing, extra = {}) => {
    const snap = await getDoc(doc(db, 'users', u.uid));
    if (snap.exists()) {
      if (snap.data().role !== role) {
        await signOut(auth);
        const other = snap.data().role === 'owner' ? 'house owner' : 'tenant';
        throw new Error(`This account is registered as a ${other}. Please use the ${other} login page.`);
      }
      return;
    }
    if (!createIfMissing) {
      await signOut(auth);
      throw new Error('No RoomIQ profile found for this account. Please sign up first.');
    }
    await setDoc(doc(db, 'users', u.uid), {
      uid: u.uid,
      name: clean(extra.name || u.displayName || 'RoomIQ user', 80),
      email: u.email,
      role,
      ...(extra.phone ? { phone: clean(extra.phone, 20) } : {}),
      createdAt: serverTimestamp(),
    });
  };

  const register = useCallback(async (role, { name, email, password, phone }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: clean(name, 80) });
    await ensureRole(cred.user, role, true, { name, phone });
  }, []);

  const login = useCallback(async (role, email, password) => {
    guardLock();
    setChecking(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      fails.current.n = 0;
      await ensureRole(cred.user, role, false);
    } catch (e) {
      if (String(e?.code).startsWith('auth/')) recordFail();
      throw e;
    } finally {
      setChecking(false);
    }
  }, []);

  const googleLogin = useCallback(async (role, allowCreate) => {
    setChecking(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await ensureRole(cred.user, role, allowCreate);
    } finally {
      setChecking(false);
    }
  }, []);

  const logout = useCallback(() => signOut(auth), []);
  const resetPassword = useCallback((email) => sendPasswordResetEmail(auth, email), []);

  const updateMyProfile = useCallback(
    async (data) => {
      if (!user) return;
      const patch = { name: clean(data.name, 80), phone: clean(data.phone, 20), city: clean(data.city, 60) };
      await updateDoc(doc(db, 'users', user.uid), patch);
      if (patch.name) await updateProfile(user, { displayName: patch.name });
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      role: profile?.role || null,
      loading: !authReady || !profileReady,
      checking,
      register,
      login,
      googleLogin,
      logout,
      resetPassword,
      updateMyProfile,
    }),
    [user, profile, authReady, profileReady, checking, register, login, googleLogin, logout, resetPassword, updateMyProfile],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
