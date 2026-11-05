import { useCallback, useEffect, useRef } from 'react';
import useAudioPlayer from './useAudioPlayer';

/**
 * 面接官の質問の音声ファイル（データの audio）を useAudioPlayer で1回流すためのフック。
 * playFile() は再生し終わったら true、再生できなければ false で解決する Promise を返す
 * （false のときは呼び出し側で読み上げに切り替える）。src が null なら何もしない。
 */
export default function useQuestionAudio(src) {
  const { play, pause, isPlaying, isEnded, error } = useAudioPlayer(src);
  const waiterRef = useRef(null);
  const playingRef = useRef(false);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const resolve = waiterRef.current;
    if (!resolve) return;
    if (isEnded || error) {
      waiterRef.current = null;
      resolve(isEnded);
    }
  }, [isEnded, error]);

  const playFile = useCallback(
    () =>
      new Promise((resolve) => {
        waiterRef.current = resolve;
        play();
        // 自動再生の制限などで再生が始まらないときはあきらめる
        setTimeout(() => {
          if (waiterRef.current === resolve && !playingRef.current) {
            waiterRef.current = null;
            pause();
            resolve(false);
          }
        }, 4000);
      }),
    [play, pause]
  );

  /** 再生を止め、待っている playFile を false で終わらせる */
  const stop = useCallback(() => {
    const resolve = waiterRef.current;
    waiterRef.current = null;
    pause();
    resolve?.(false);
  }, [pause]);

  return { playFile, stop };
}
