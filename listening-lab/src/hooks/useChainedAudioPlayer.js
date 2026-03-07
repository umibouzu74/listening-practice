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

/**
 * Hook that chains two audio sources for sequential playback.
 * Plays primarySrc first, then automatically continues to secondarySrc.
 * Returns a combined timeline (seekbar spans both audio files).
 */
export default function useChainedAudioPlayer(primarySrc, secondarySrc) {
  const audio1Ref = useRef(null);
  const audio2Ref = useRef(null);
  const activeIndexRef = useRef(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime1, setCurrentTime1] = useState(0);
  const [currentTime2, setCurrentTime2] = useState(0);
  const [duration1, setDuration1] = useState(0);
  const [duration2, setDuration2] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(getSavedSpeed);
  const [volume, setVolumeState] = useState(getSavedVolume);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [isLooping, setIsLooping] = useState(false);
  const isSeekingRef = useRef(false);
  const rafRef = useRef(null);

  const totalDuration = duration1 + duration2;
  const combinedTime = activeIndex === 0 ? currentTime1 : duration1 + currentTime2;
  const progress = totalDuration > 0 ? (combinedTime / totalDuration) * 100 : 0;

  // 'passage' when playing primary, 'question' when playing secondary
  const activePhase = activeIndex === 0 ? 'passage' : 'question';

  const setIsSeeking = useCallback((v) => { isSeekingRef.current = v; }, []);

  // Create / recreate Audio elements when sources change
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime1(0);
    setCurrentTime2(0);
    setDuration1(0);
    setDuration2(0);
    setIsLoaded(false);
    setError(null);
    setIsLooping(false);
    setActiveIndex(0);
    activeIndexRef.current = 0;

    if (!primarySrc) {
      audio1Ref.current = null;
      audio2Ref.current = null;
      return;
    }

    const a1 = new Audio(primarySrc);
    a1.playbackRate = playbackRate;
    a1.volume = volume;
    audio1Ref.current = a1;

    let a2 = null;
    if (secondarySrc) {
      a2 = new Audio(secondarySrc);
      a2.playbackRate = playbackRate;
      a2.volume = volume;
      audio2Ref.current = a2;
    } else {
      audio2Ref.current = null;
    }

    const onLoad1 = () => {
      setDuration1(a1.duration);
      setIsLoaded(true);
    };
    const onLoad2 = () => {
      if (a2) setDuration2(a2.duration);
    };

    const onTimeUpdate1 = () => {
      if (isSeekingRef.current || activeIndexRef.current !== 0) return;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!isSeekingRef.current && activeIndexRef.current === 0) {
          setCurrentTime1(a1.currentTime);
        }
      });
    };

    const onTimeUpdate2 = () => {
      if (!a2 || isSeekingRef.current || activeIndexRef.current !== 1) return;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!isSeekingRef.current && activeIndexRef.current === 1) {
          setCurrentTime2(a2.currentTime);
        }
      });
    };

    const onEnded1 = () => {
      if (a2) {
        // Chain: passage ended → start question audio
        setActiveIndex(1);
        activeIndexRef.current = 1;
        setCurrentTime1(a1.duration);
        a2.currentTime = 0;
        a2.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        setIsPlaying(false);
      }
    };

    const onEnded2 = () => {
      setIsPlaying(false);
    };

    const onError = () => {
      setError('音声ファイルの読み込みに失敗しました');
      setIsPlaying(false);
    };

    a1.addEventListener('loadedmetadata', onLoad1);
    a1.addEventListener('timeupdate', onTimeUpdate1);
    a1.addEventListener('ended', onEnded1);
    a1.addEventListener('error', onError);

    if (a2) {
      a2.addEventListener('loadedmetadata', onLoad2);
      a2.addEventListener('timeupdate', onTimeUpdate2);
      a2.addEventListener('ended', onEnded2);
      a2.addEventListener('error', onError);
    }

    return () => {
      a1.removeEventListener('loadedmetadata', onLoad1);
      a1.removeEventListener('timeupdate', onTimeUpdate1);
      a1.removeEventListener('ended', onEnded1);
      a1.removeEventListener('error', onError);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      a1.pause();
      a1.src = '';
      audio1Ref.current = null;

      if (a2) {
        a2.removeEventListener('loadedmetadata', onLoad2);
        a2.removeEventListener('timeupdate', onTimeUpdate2);
        a2.removeEventListener('ended', onEnded2);
        a2.removeEventListener('error', onError);
        a2.pause();
        a2.src = '';
        audio2Ref.current = null;
      }
    };
    // playbackRate, volume intentionally excluded — synced separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primarySrc, secondarySrc]);

  // Loop: when last audio ends, restart from beginning
  useEffect(() => {
    const a1 = audio1Ref.current;
    const a2 = audio2Ref.current;
    if (!isLooping) return;

    const lastAudio = a2 || a1;
    if (!lastAudio) return;

    const handler = () => {
      setActiveIndex(0);
      activeIndexRef.current = 0;
      setCurrentTime2(0);
      if (a1) {
        a1.currentTime = 0;
        a1.play().catch(() => {});
      }
    };

    lastAudio.addEventListener('ended', handler);
    return () => lastAudio.removeEventListener('ended', handler);
  }, [isLooping]);

  const toggle = useCallback(() => {
    const active = activeIndexRef.current === 0 ? audio1Ref.current : audio2Ref.current;
    if (!active) {
      const a1 = audio1Ref.current;
      if (!a1) return;
      a1.play().then(() => setIsPlaying(true)).catch(() => {});
      return;
    }
    if (active.paused) {
      active.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      active.pause();
      setIsPlaying(false);
    }
  }, []);

  const play = useCallback(() => {
    const active = activeIndexRef.current === 0 ? audio1Ref.current : audio2Ref.current;
    if (!active) return;
    active.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  const pause = useCallback(() => {
    const active = activeIndexRef.current === 0 ? audio1Ref.current : audio2Ref.current;
    if (!active) return;
    active.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback((time) => {
    const a1 = audio1Ref.current;
    const a2 = audio2Ref.current;
    if (!a1 || !isFinite(time)) return;

    const d1 = a1.duration || 0;
    const d2 = a2?.duration || 0;
    const total = d1 + d2;
    const clamped = Math.max(0, Math.min(time, total));

    const prevActive = activeIndexRef.current === 0 ? a1 : a2;
    const wasPlaying = prevActive && !prevActive.paused;

    if (clamped < d1 || !a2) {
      // Seek within primary audio
      if (a2 && activeIndexRef.current === 1) {
        a2.pause();
        a2.currentTime = 0;
      }
      setActiveIndex(0);
      activeIndexRef.current = 0;
      a1.currentTime = Math.min(clamped, d1);
      setCurrentTime1(a1.currentTime);
      setCurrentTime2(0);
      if (wasPlaying) a1.play().catch(() => {});
    } else {
      // Seek within secondary audio
      if (activeIndexRef.current === 0) {
        a1.pause();
        a1.currentTime = d1;
      }
      setActiveIndex(1);
      activeIndexRef.current = 1;
      setCurrentTime1(d1);
      a2.currentTime = Math.min(clamped - d1, d2);
      setCurrentTime2(a2.currentTime);
      if (wasPlaying) a2.play().catch(() => {});
    }
  }, []);

  const setSpeed = useCallback((rate) => {
    setPlaybackRateState(rate);
    if (audio1Ref.current) audio1Ref.current.playbackRate = rate;
    if (audio2Ref.current) audio2Ref.current.playbackRate = rate;
    try { localStorage.setItem(SPEED_KEY, String(rate)); } catch {}
  }, []);

  const setVolume = useCallback((val) => {
    const v = Math.max(0, Math.min(1, val));
    setVolumeState(v);
    if (audio1Ref.current) audio1Ref.current.volume = v;
    if (audio2Ref.current) audio2Ref.current.volume = v;
    try { localStorage.setItem(VOLUME_KEY, String(v)); } catch {}
  }, []);

  const reset = useCallback(() => {
    const a1 = audio1Ref.current;
    const a2 = audio2Ref.current;
    if (a1) { a1.pause(); a1.currentTime = 0; }
    if (a2) { a2.pause(); a2.currentTime = 0; }
    setActiveIndex(0);
    activeIndexRef.current = 0;
    setIsPlaying(false);
    setCurrentTime1(0);
    setCurrentTime2(0);
  }, []);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  // Play only passage (primary) audio
  const playPassageOnly = useCallback(() => {
    const a1 = audio1Ref.current;
    const a2 = audio2Ref.current;
    if (!a1) return;
    // Stop secondary if playing
    if (a2) { a2.pause(); a2.currentTime = 0; }
    setActiveIndex(0);
    activeIndexRef.current = 0;
    setCurrentTime2(0);
    a1.currentTime = 0;
    setCurrentTime1(0);
    a1.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  return {
    isPlaying,
    currentTime: combinedTime,
    duration: totalDuration,
    duration1,
    progress,
    playbackRate,
    volume,
    isLoaded,
    error,
    isLooping,
    activePhase,
    play,
    pause,
    toggle,
    seek,
    setSpeed,
    setVolume,
    reset,
    toggleLoop,
    setIsSeeking,
    playPassageOnly,
  };
}
