import { useState, useEffect, useRef, useCallback } from 'react';

const SPEED_KEY = 'listening-lab-speed';
const VOLUME_KEY = 'listening-lab-volume';

function getSavedSpeed() {
  try {
    const v = parseFloat(localStorage.getItem(SPEED_KEY));
    return v && isFinite(v) ? v : 1.0;
  } catch {
    return 1.0;
  }
}

function getSavedVolume() {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY));
    return v >= 0 && v <= 1 ? v : 1.0;
  } catch {
    return 1.0;
  }
}

export default function useAudioPlayer(src) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(getSavedSpeed);
  const [volume, setVolumeState] = useState(getSavedVolume);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Loop (repeat) state
  const [isLooping, setIsLooping] = useState(false);

  // Seeking state — use ref for synchronous access in timeupdate handler
  const isSeekingRef = useRef(false);
  const setIsSeeking = useCallback((v) => { isSeekingRef.current = v; }, []);

  // RAF throttle for timeupdate
  const rafRef = useRef(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Create / recreate Audio when src changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoaded(false);
    setError(null);
    setIsLooping(false);

    if (!src) {
      audioRef.current = null;
      return;
    }

    const audio = new Audio(src);
    audio.playbackRate = playbackRate;
    audio.volume = volume;
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };

    const onTimeUpdate = () => {
      if (isSeekingRef.current) return;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!isSeekingRef.current) {
          setCurrentTime(audio.currentTime);
        }
      });
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    const onError = () => {
      setError('音声ファイルの読み込みに失敗しました');
      setIsPlaying(false);
      setIsLoaded(false);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
    // playbackRate, volume intentionally excluded — synced separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Loop: replay from start when audio ends
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isLooping) return;

    const onEnded = () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [isLooping]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setError('再生できませんでした');
    });
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {
        setError('再生できませんでした');
      });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((time) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(time)) return;
    const clamped = Math.max(0, Math.min(time, audio.duration || 0));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const seekByPercent = useCallback((percent) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const clamped = Math.max(0, Math.min(percent, 100));
    const time = (clamped / 100) * audio.duration;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setSpeed = useCallback((rate) => {
    setPlaybackRate(rate);
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = rate;
    }
    try { localStorage.setItem(SPEED_KEY, String(rate)); } catch {}
  }, []);

  const setVolume = useCallback((val) => {
    const v = Math.max(0, Math.min(1, val));
    setVolumeState(v);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = v;
    }
    try { localStorage.setItem(VOLUME_KEY, String(v)); } catch {}
  }, []);

  const reset = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  // Loop toggle
  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    progress,
    playbackRate,
    volume,
    isLoaded,
    error,
    isSeeking: isSeekingRef.current,
    setIsSeeking,
    isLooping,
    play,
    pause,
    toggle,
    seek,
    seekByPercent,
    setSpeed,
    setVolume,
    reset,
    toggleLoop,
  };
}
