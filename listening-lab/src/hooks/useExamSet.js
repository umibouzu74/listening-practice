import { useEffect, useState } from 'react';
import { loadExamSet } from '../data/registry';

/**
 * 問題本文を含む試験データを非同期に読み込む。
 * @returns {{ status: 'loading'|'ready'|'notfound'|'error', examSet: object|null, retry: () => void }}
 */
export default function useExamSet(examId) {
  const [state, setState] = useState({ examId, status: 'loading', examSet: null });
  const [attempt, setAttempt] = useState(0);

  // examId が変わったら読み込み中に戻す（レンダー中に調整するパターン）
  if (state.examId !== examId) {
    setState({ examId, status: 'loading', examSet: null });
  }

  useEffect(() => {
    let cancelled = false;
    loadExamSet(examId)
      .then((data) => {
        if (!cancelled) setState({ examId, status: data ? 'ready' : 'notfound', examSet: data });
      })
      .catch(() => {
        if (!cancelled) setState({ examId, status: 'error', examSet: null });
      });
    return () => {
      cancelled = true;
    };
  }, [examId, attempt]);

  const retry = () => {
    setState({ examId, status: 'loading', examSet: null });
    setAttempt((n) => n + 1);
  };

  return { ...state, retry };
}
