// 英文の読み上げ（Web Speech API の speechSynthesis）
// 面接官の質問に音声ファイルがないときの代わりに使う。
// 音声プレイヤーと同じく claimPlayback に参加し、ほかの音声と同時に鳴らないようにする。

import { claimPlayback, releasePlayback } from './audio';

export function isSpeechSupported() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

// 他のプレイヤーが再生を始めたら読み上げを止める
const owner = {
  pause: () => {
    if (isSpeechSupported()) window.speechSynthesis.cancel();
  },
};

function voiceRank(voice) {
  const lang = voice.lang.replace('_', '-').toLowerCase();
  const region = lang.startsWith('en-us') ? 0 : lang.startsWith('en-gb') ? 1 : 2;
  // 端末内の音声のほうが途中で止まりにくい
  return region * 2 + (voice.localService ? 0 : 1);
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
  voices.sort((a, b) => voiceRank(a) - voiceRank(b));
  return voices[0] || null;
}

/** 音声の一覧は非同期に読み込まれるので、画面を開いた時点で読み込みを始めておく */
export function primeVoices() {
  if (isSpeechSupported()) window.speechSynthesis.getVoices();
}

/**
 * iPhone などでは、最初の読み上げをユーザー操作の中で行わないと音が出ない。
 * 開始ボタンのクリック処理の中で呼んでおく（無音の読み上げ）。
 */
export function unlockSpeech() {
  if (!isSpeechSupported()) return;
  const u = new window.SpeechSynthesisUtterance(' ');
  u.volume = 0;
  window.speechSynthesis.speak(u);
}

export function cancelSpeech() {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  releasePlayback(owner);
}

/**
 * 英文を読み上げ、読み終わったら true で解決する Promise を返す。
 * 非対応・エラー・中断（cancelSpeech や他の音声の再生開始）の場合は false で解決する。
 */
export function speak(text, { rate = 1 } = {}) {
  return new Promise((resolve) => {
    if (!isSpeechSupported() || !text?.trim()) {
      resolve(false);
      return;
    }
    const synth = window.speechSynthesis;
    const u = new window.SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    u.lang = voice?.lang || 'en-US';
    if (voice) u.voice = voice;
    u.rate = rate;

    let done = false;
    let timer = null;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      releasePlayback(owner);
      resolve(ok);
    };
    u.onend = () => finish(true);
    u.onerror = () => finish(false);

    // end イベントが届かないブラウザがあるので、語数から見積もった時間で打ち切る
    const words = text.trim().split(/\s+/).length;
    timer = setTimeout(() => finish(true), ((words / 2.2) / rate) * 1000 + 4000);

    claimPlayback(owner);
    if (synth.speaking || synth.pending) synth.cancel();
    synth.speak(u);
  });
}
