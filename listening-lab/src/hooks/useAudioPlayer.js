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

  // A-B repeat state
  const [abRepeat, setAbRepeat] = useState({ a: null, b: null });

  // Seeking state (suppress timeupdate while dragging)
  const [isSeeking, setIsSeeking] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Create / recreate Audio when src changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoaded(false);
    setError(null);
    setAbRepeat({ a: null, b: null });

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
      setCurrentTime(audio.currentTime);
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
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
    // playbackRate, volume intentionally excluded — synced separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // A-B repeat: loop back to A when reaching B
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || abRepeat.a === null || abRepeat.b === null) return;

    const onTime = () => {
      if (audio.currentTime >= abRepeat.b) {
        audio.currentTime = abRepeat.a;
        setCurrentTime(abRepeat.a);
      }
    };

    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, [abRepeat]);

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

  // A-B repeat controls
  const toggleABPoint = useCallback(() => {
    setAbRepeat((prev) => {
      if (prev.a === null) {
        // Set point A
        return { a: currentTime, b: null };
      } else if (prev.b === null) {
        // Set point B (must be after A)
        const b = currentTime;
        if (b <= prev.a) return prev; // B must be after A
        return { ...prev, b };
      } else {
        // Clear both
        return { a: null, b: null };
      }
    });
  }, [currentTime]);

  const clearAB = useCallback(() => {
    setAbRepeat({ a: null, b: null });
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
    isSeeking,
    setIsSeeking,
    abRepeat,
    play,
    pause,
    toggle,
    seek,
    seekByPercent,
    setSpeed,
    setVolume,
    reset,
    toggleABPoint,
    clearAB,
  };
}
