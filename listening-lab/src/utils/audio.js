// 音声プレイヤー共通の定数・ユーティリティ

export const SPEEDS = [0.75, 1.0, 1.25, 1.5];
export const SKIP_SEC = 5;

const SPEED_KEY = 'listening-lab-speed';

export function formatTime(seconds) {
  if (!seconds || !isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 再生速度ボタン用: 次の速度を返す */
export function nextSpeed(rate) {
  const idx = SPEEDS.indexOf(rate);
  return SPEEDS[(idx + 1) % SPEEDS.length];
}

export function loadSpeed() {
  try {
    const v = parseFloat(localStorage.getItem(SPEED_KEY));
    return SPEEDS.includes(v) ? v : 1.0;
  } catch {
    return 1.0;
  }
}

export function saveSpeed(rate) {
  try {
    localStorage.setItem(SPEED_KEY, String(rate));
  } catch {
    // localStorage が使えない環境（プライベートモード等）では保存しない
  }
}

/** 各トラック長から、連結シークバー上の区切り位置（%）を返す */
export function segmentBoundaries(durations) {
  const total = durations.reduce((sum, d) => sum + d, 0);
  if (total <= 0 || durations.length < 2) return [];
  const result = [];
  let acc = 0;
  for (let i = 0; i < durations.length - 1; i++) {
    acc += durations[i];
    result.push((acc / total) * 100);
  }
  return result;
}

// --- 同時再生の防止 ---
// 画面内のどこかで再生が始まったら、それまで再生していたプレイヤーを止める
let currentOwner = null;

export function claimPlayback(owner) {
  if (currentOwner && currentOwner !== owner) currentOwner.pause();
  currentOwner = owner;
}

export function releasePlayback(owner) {
  if (currentOwner === owner) currentOwner = null;
}
