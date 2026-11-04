// 学習履歴（localStorage）
// キー: `${examId}__${sectionId}`（全問通しは sectionId = "all"）
// 値:   { lastAttempt, attempts, bestScore, lastScore, lastWrong }

const STORAGE_KEY = 'listening-lab-history';

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function writeStore(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 容量超過・プライベートモードなどでは保存をあきらめる（演習自体は続けられる）
  }
}

export function recordKey(examId, sectionId) {
  return `${examId}__${sectionId}`;
}

export function getRecord(key) {
  const rec = readStore()[key];
  return rec && rec.bestScore ? rec : null;
}

/**
 * 演習結果を保存する
 * @param {string} key
 * @param {{correct:number, total:number, wrongIds:string[]}} result
 */
export function saveResult(key, { correct, total, wrongIds = [] }) {
  const store = readStore();
  const prev = store[key];
  const score = { correct, total };
  const isBetter = !prev?.bestScore || correct / total > prev.bestScore.correct / prev.bestScore.total;

  store[key] = {
    lastAttempt: new Date().toISOString(),
    attempts: (prev?.attempts || 0) + 1,
    bestScore: isBetter ? score : prev.bestScore,
    lastScore: score,
    lastWrong: wrongIds,
  };
  writeStore(store);
}

/** 「間違えた問題だけ解き直す」の結果で、間違いリストだけを更新する */
export function updateWrong(key, wrongIds) {
  const store = readStore();
  if (!store[key]) return;
  store[key] = { ...store[key], lastWrong: wrongIds };
  writeStore(store);
}

export function clearAll() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

// --- 解答途中の状態（タブを閉じるまで保持） ---
const PROGRESS_PREFIX = 'listening-lab-progress:';

export function loadProgress(key) {
  try {
    const raw = sessionStorage.getItem(PROGRESS_PREFIX + key);
    const data = raw ? JSON.parse(raw) : null;
    if (!data || typeof data.answers !== 'object' || !Array.isArray(data.checked)) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveProgress(key, answers, checked) {
  try {
    if (Object.keys(answers).length === 0) sessionStorage.removeItem(PROGRESS_PREFIX + key);
    else sessionStorage.setItem(PROGRESS_PREFIX + key, JSON.stringify({ answers, checked: [...checked] }));
  } catch {
    // noop
  }
}

export function clearProgress(key) {
  try {
    sessionStorage.removeItem(PROGRESS_PREFIX + key);
  } catch {
    // noop
  }
}
