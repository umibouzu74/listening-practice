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

// 最後に始めた読み上げ（前の読み上げが止まったときに、再生の権利を手放してしまわないように）
let latest = null;
// 読み上げを始めたり止めたりするたびに増える番号。続けて読む途中で止められたかを見分ける
// （止めたときに end イベントが届くブラウザがあり、完了と区別できないため）
let generation = 0;

// 他のプレイヤーが再生を始めたら読み上げを止める
const owner = {
  pause: () => {
    generation++;
    if (isSpeechSupported()) window.speechSynthesis.cancel();
  },
};

/**
 * 読み上げ用に英文を整える（画面の表示はそのまま）。
 * 「He told her that ...」「I'd be thinking, "..."」の「...」や空の引用符は読まず、
 * 残った文末の読点なども落とす。
 */
export function speechText(text) {
  return (text || '')
    .replace(/["“”]\s*(?:\.{3}|…)?\s*["“”]/g, ' ')
    .replace(/\.{3}|…/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/[\s,;:]+$/, '')
    .trim();
}

/**
 * 読み上げ・ハイライト用に英文を文に分ける。
 * 「"I should ... tired. From now on, ..."」のように引用符の中で文が終わる場合も、閉じる引用符までを1文にする。
 */
export function splitSentences(text) {
  // 「7.5」のような数字の中の点では分けない（文末の記号のあとに空白か文の終わりが来るところで分ける）
  const sentences = (text || '').replace(/\s+/g, ' ').match(/\S.*?(?:[.!?]+["”’)]*(?=\s|$)|$)/g) || [];
  return sentences.map((s) => s.trim()).filter(Boolean);
}

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
  generation++;
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  releasePlayback(owner);
}

/**
 * 英文を読み上げ、読み終わったら true で解決する Promise を返す。
 * 非対応・エラー・中断（cancelSpeech や他の音声の再生開始）の場合は false で解決する。
 */
export function speak(text, { rate = 1 } = {}) {
  generation++;
  return utter(text, rate);
}

/**
 * 複数の文を1つずつ続けて読み上げる（長い文章でも途中で切れにくく、今読んでいる文が分かる）。
 * onIndex(i) で読み始めた文の番号を知らせる。最後まで読めたら true、
 * 途中で止められた（cancelSpeech・別の読み上げや音声の再生開始）・読めなかったら false で解決する。
 */
export async function speakAll(texts, { rate = 1, onIndex } = {}) {
  const gen = ++generation;
  for (let i = 0; i < texts.length; i++) {
    if (gen !== generation) return false;
    onIndex?.(i);
    const ok = await utter(texts[i], rate);
    if (gen !== generation || !ok) return false;
  }
  return true;
}

function utter(rawText, rate) {
  const text = speechText(rawText);
  return new Promise((resolve) => {
    if (!isSpeechSupported() || !text) {
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
      // 次の読み上げに切り替わって止まったときは、再生の権利をその読み上げに残す
      if (latest === u) {
        latest = null;
        releasePlayback(owner);
      }
      resolve(ok);
    };
    u.onend = () => finish(true);
    u.onerror = () => finish(false);

    // end イベントが届かないブラウザがあるので、語数から見積もった時間で打ち切る
    const words = text.trim().split(/\s+/).length;
    timer = setTimeout(() => finish(true), ((words / 2.2) / rate) * 1000 + 4000);

    latest = u;
    claimPlayback(owner);
    if (synth.speaking || synth.pending) synth.cancel();
    synth.speak(u);
  });
}
