import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

// Live query: every change in Firestore is pushed here instantly, so all pages stay in sync.
export function useLive(makeQuery, deps) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    const q = makeQuery();
    if (!q) {
      setState({ data: [], loading: false, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false, error: null }),
      (error) => {
        console.error(error);
        setState({ data: [], loading: false, error });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useLiveDoc(makeRef, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    const r = makeRef();
    if (!r) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      r,
      (snap) => setState({ data: snap.exists() ? { id: snap.id, ...snap.data() } : null, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
