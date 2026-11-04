import { useState, useEffect, useRef, useCallback } from 'react';
import { loadSpeed, saveSpeed, claimPlayback, releasePlayback } from '../utils/audio';

function normalize(sources) {
  if (!sources) return [];
  return (Array.isArray(sources) ? sources : [sources]).filter(Boolean);
}

function durationOf(audio) {
  return audio && isFinite(audio.duration) ? audio.duration : 0;
}

/**
 * 1つ以上の音声ファイルを「1本のトラック」として連続再生するフック。
 * 例: [本文, Q13, Q14] を渡すと、本文 → Q13 → Q14 と自動でつながり、
 *     シークバーも3つを合算した長さで扱える。単一ファイルなら文字列でOK。
 *
 * isPlaying は audio 要素の play / pause イベントから同期するので、
 * OS のメディア操作や他プレイヤーによる停止とも表示がずれない。
 */
export default function useAudioPlayer(sources) {
  const list = normalize(sources);
  const key = list.join('|');

  const audiosRef = useRef([]);
  const activeRef = useRef(0);
  const loopRef = useRef(false);
  const rateRef = useRef(null);

  const [trackKey, setTrackKey] = useState(key);
  const [durations, setDurations] = useState(() => list.map(() => 0));
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTime, setActiveTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [error, setError] = useState(null);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(loadSpeed);

  // 音源が変わったら表示用の状態をリセット（レンダー中に調整するパターン）
  if (trackKey !== key) {
    setTrackKey(key);
    setDurations(list.map(() => 0));
    setActiveIndex(0);
    setActiveTime(0);
    setIsPlaying(false);
    setIsEnded(false);
    setError(null);
  }

  const safePlay = useCallback((audio) => {
    audio.play().catch((err) => {
      // pause() による中断（AbortError）は正常系なので無視
      if (err?.name !== 'AbortError') setIsPlaying(false);
    });
  }, []);

  const goTo = useCallback((index, time, autoplay) => {
    const audios = audiosRef.current;
    const target = audios[index];
    if (!target) return;
    audios.forEach((a, i) => {
      if (i !== index && !a.paused) a.pause();
    });
    activeRef.current = index;
    setActiveIndex(index);
    try {
      target.currentTime = time;
    } catch {
      // メタデータ未読込の場合は位置指定できないので先頭から
    }
    setActiveTime(time);
    if (autoplay) safePlay(target);
  }, [safePlay]);

  // audio 要素の生成と破棄
  useEffect(() => {
    const srcs = key ? key.split('|') : [];
    if (rateRef.current === null) rateRef.current = loadSpeed();
    activeRef.current = 0;

    const audios = srcs.map((src) => {
      const a = new Audio();
      a.preload = 'metadata';
      a.src = src;
      a.defaultPlaybackRate = rateRef.current;
      a.playbackRate = rateRef.current;
      return a;
    });
    audiosRef.current = audios;

    const owner = { pause: () => audios.forEach((a) => a.pause()) };
    const last = audios.length - 1;

    const handlers = audios.map((audio, i) => {
      const onDuration = () => {
        setDurations((prev) => {
          const next = prev.length === audios.length ? [...prev] : audios.map(() => 0);
          next[i] = durationOf(audio);
          return next;
        });
      };
      const onTimeUpdate = () => {
        if (activeRef.current === i) setActiveTime(audio.currentTime);
      };
      const onPlay = () => {
        claimPlayback(owner);
        setIsPlaying(true);
        setIsEnded(false);
      };
      const onPause = () => {
        // トラック末尾での pause は、次トラックへの連結・ループ時は無視
        if (audio.ended && (i < last || loopRef.current)) return;
        if (activeRef.current === i) setIsPlaying(false);
      };
      const onEnded = () => {
        if (i < last) goTo(i + 1, 0, true);
        else if (loopRef.current) goTo(0, 0, true);
        else {
          setIsPlaying(false);
          setIsEnded(true);
        }
      };
      const onError = () => {
        setError('音声ファイルを読み込めませんでした');
        setIsPlaying(false);
      };

      const map = {
        loadedmetadata: onDuration,
        durationchange: onDuration,
        timeupdate: onTimeUpdate,
        play: onPlay,
        pause: onPause,
        ended: onEnded,
        error: onError,
      };
      for (const [type, fn] of Object.entries(map)) audio.addEventListener(type, fn);
      return map;
    });

    return () => {
      audios.forEach((audio, i) => {
        for (const [type, fn] of Object.entries(handlers[i])) audio.removeEventListener(type, fn);
        audio.pause();
        audio.removeAttribute('src');
        audio.load(); // ダウンロードを中断
      });
      releasePlayback(owner);
      audiosRef.current = [];
    };
  }, [key, goTo]);

  const currentCombinedTime = useCallback(() => {
    const audios = audiosRef.current;
    const idx = activeRef.current;
    let t = 0;
    for (let i = 0; i < idx; i++) t += durationOf(audios[i]);
    return t + (audios[idx]?.currentTime || 0);
  }, []);

  const play = useCallback(() => {
    const audios = audiosRef.current;
    const active = audios[activeRef.current];
    if (!active) return;
    // 最後まで再生し終わっていたら頭から
    if (active.ended && activeRef.current === audios.length - 1) goTo(0, 0, true);
    else safePlay(active);
  }, [goTo, safePlay]);

  const pause = useCallback(() => {
    audiosRef.current[activeRef.current]?.pause();
  }, []);

  const toggle = useCallback(() => {
    const active = audiosRef.current[activeRef.current];
    if (!active) return;
    if (active.paused) play();
    else pause();
  }, [play, pause]);

  /** 連結トラック全体での秒数を指定してシーク */
  const seek = useCallback((time) => {
    const audios = audiosRef.current;
    if (audios.length === 0 || !isFinite(time)) return;
    const ds = audios.map(durationOf);
    const total = ds.reduce((s, d) => s + d, 0);
    let t = Math.max(0, Math.min(time, total));
    let idx = 0;
    while (idx < audios.length - 1 && t >= ds[idx]) {
      t -= ds[idx];
      idx++;
    }
    t = Math.min(t, ds[idx]);
    const wasPlaying = !(audios[activeRef.current]?.paused ?? true);
    goTo(idx, t, wasPlaying);
  }, [goTo]);

  const skip = useCallback((delta) => {
    seek(currentCombinedTime() + delta);
  }, [seek, currentCombinedTime]);

  const setSpeed = useCallback((rate) => {
    rateRef.current = rate;
    setPlaybackRate(rate);
    audiosRef.current.forEach((a) => {
      a.defaultPlaybackRate = rate;
      a.playbackRate = rate;
    });
    saveSpeed(rate);
  }, []);

  const reset = useCallback(() => {
    audiosRef.current.forEach((a) => a.pause());
    goTo(0, 0, false);
    setIsPlaying(false);
    setIsEnded(false);
  }, [goTo]);

  const toggleLoop = useCallback(() => {
    loopRef.current = !loopRef.current;
    setIsLooping(loopRef.current);
  }, []);

  const offset = durations.slice(0, activeIndex).reduce((s, d) => s + d, 0);
  const duration = durations.reduce((s, d) => s + d, 0);

  return {
    hasSource: list.length > 0,
    isPlaying,
    /** 最後のトラックまで再生し終えたか */
    isEnded,
    currentTime: offset + activeTime,
    duration,
    durations,
    activeIndex,
    playbackRate,
    isLooping,
    error,
    play,
    pause,
    toggle,
    seek,
    skip,
    setSpeed,
    reset,
    toggleLoop,
  };
}
