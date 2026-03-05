import { useCallback, useRef } from 'react';

const STORAGE_KEY = 'listening-lab-history';

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function useHistory() {
  // Keep a ref so callbacks always read the latest without re-renders
  const cacheRef = useRef(null);

  const getStore = useCallback(() => {
    if (cacheRef.current === null) {
      cacheRef.current = readStore();
    }
    return cacheRef.current;
  }, []);

  const getRecord = useCallback(
    (sectionId) => {
      return getStore()[sectionId] || null;
    },
    [getStore]
  );

  const saveRecord = useCallback(
    (sectionId, score) => {
      const store = getStore();
      const existing = store[sectionId];

      const bestScore = existing
        ? (score.correct / score.total) > (existing.bestScore.correct / existing.bestScore.total)
          ? { correct: score.correct, total: score.total }
          : existing.bestScore
        : { correct: score.correct, total: score.total };

      store[sectionId] = {
        lastAttempt: new Date().toISOString(),
        attempts: existing ? existing.attempts + 1 : 1,
        bestScore,
        lastScore: { correct: score.correct, total: score.total },
      };

      cacheRef.current = store;
      writeStore(store);
    },
    [getStore]
  );

  const getAllRecords = useCallback(() => {
    return { ...getStore() };
  }, [getStore]);

  const clearAll = useCallback(() => {
    cacheRef.current = {};
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { getRecord, saveRecord, getAllRecords, clearAll };
}
