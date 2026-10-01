import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db, isConfigured } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { ms } from '../lib/utils';

const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

// One live subscription to all active listings + the tenant's saved list.
// Every page reads from here, so a change made anywhere appears everywhere instantly.
export function DataProvider({ children }) {
  const { user, role } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(isConfigured);
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    if (!isConfigured) return undefined;
    return onSnapshot(
      query(collection(db, 'properties'), where('status', '==', 'active')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
        setProperties(list);
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    if (!user || role !== 'tenant') {
      setSavedIds(new Set());
      return undefined;
    }
    return onSnapshot(collection(db, 'users', user.uid, 'saved'), (snap) => setSavedIds(new Set(snap.docs.map((d) => d.id))));
  }, [user, role]);

  const toggleSave = useCallback(
    async (propertyId) => {
      if (!user) return false;
      const r = doc(db, 'users', user.uid, 'saved', propertyId);
      if (savedIds.has(propertyId)) await deleteDoc(r);
      else await setDoc(r, { createdAt: serverTimestamp() });
      return true;
    },
    [user, savedIds],
  );

  const value = useMemo(() => ({ properties, loading, savedIds, toggleSave }), [properties, loading, savedIds, toggleSave]);
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}
