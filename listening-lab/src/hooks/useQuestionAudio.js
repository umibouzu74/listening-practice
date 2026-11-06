import { useCallback, useEffect, useRef } from 'react';
import { claimPlayback, releasePlayback } from '../utils/audio';

// 無音の短い WAV。再生の許可を取るためだけに、開始ボタンの中で鳴らす
const SILENCE =
  'data:audio/wav;base64,UklGRoQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YWAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA=';
// 読み込みや自動再生の制限で再生が始まらないときは、この時間であきらめる
const START_TIMEOUT_MS = 6000;
// 再生が止まったまま終わらないときの保険（音声の長さにこの時間を足して打ち切る）
const END_MARGIN_MS = 5000;

/**
 * 面接官の発話の音声ファイルを1本ずつ流すためのフック。
 *
 * - playFile(src) は再生し終わったら true、再生できなければ false で解決する Promise を返す
 *   （false のときは呼び出し側で読み上げに切り替える）
 * - audio 要素を1つだけ使い回す。iPhone などは、ユーザー操作の中で再生した要素でないと
 *   あとから自動で鳴らせないので、開始ボタンのクリック処理で unlock() を呼んでおく
 * - 速度はいつも等倍（リスニング画面の速度設定は受け継がない）
 */
export default function useQuestionAudio() {
  const audioRef = useRef(null);
  const finishRef = useRef(null);
  const ownerRef = useRef({ pause: () => finishRef.current?.(false) });

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  /** 再生を止め、待っている playFile を false で終わらせる */
  const stop = useCallback(() => {
    finishRef.current?.(false);
  }, []);

  const playFile = useCallback(
    (src) =>
      new Promise((resolve) => {
        finishRef.current?.(false);
        const audio = getAudio();
        const owner = ownerRef.current;
        let timer = null;

        const finish = (ok) => {
          if (finishRef.current !== finish) return;
          finishRef.current = null;
          clearTimeout(timer);
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          audio.removeEventListener('playing', onPlaying);
          audio.removeEventListener('pause', onPause);
          audio.pause();
          releasePlayback(owner);
          resolve(ok);
        };
        const onEnded = () => finish(true);
        const onError = () => finish(false);
        // OS のメディア操作や着信などで止められたときは、待ち続けずに読み上げへ切り替える
        const onPause = () => {
          if (!audio.ended) finish(false);
        };
        const onPlaying = () => {
          clearTimeout(timer);
          const seconds = Number.isFinite(audio.duration) ? audio.duration : 60;
          timer = setTimeout(() => finish(true), seconds * 1000 + END_MARGIN_MS);
        };

        finishRef.current = finish;
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);
        audio.addEventListener('playing', onPlaying);
        audio.addEventListener('pause', onPause);
        timer = setTimeout(() => finish(false), START_TIMEOUT_MS);

        claimPlayback(owner);
        audio.src = src;
        audio.playbackRate = 1;
        audio.play().catch((err) => {
          // pause() や src の差し替えによる中断（AbortError）は正常系なので無視
          if (err?.name !== 'AbortError') finish(false);
        });
      }),
    [getAudio]
  );

  /** ユーザー操作の中で呼び、あとから自動で鳴らせるようにする */
  const unlock = useCallback(() => {
    if (finishRef.current) return;
    const audio = getAudio();
    audio.src = SILENCE;
    audio.play().catch(() => {
      // 許可が取れなくても、再生時に読み上げへ切り替わるだけなので無視
    });
  }, [getAudio]);

  useEffect(() => {
    const audio = getAudio();
    return () => {
      stop();
      audio.pause();
      audio.removeAttribute('src');
      audio.load(); // ダウンロードを中断
    };
  }, [getAudio, stop]);

  return { playFile, stop, unlock };
}
