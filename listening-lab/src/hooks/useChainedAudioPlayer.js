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
 * Hook that chains multiple audio sources for sequential playback.
 * @param {string[]} sources - Array of audio URLs to play in order.
 *   e.g. [passageAudio, q1Audio, q2Audio]
 * Returns a combined timeline (seekbar spans all audio files).
 */
export default function useChainedAudioPlayer(sources) {
  const audioRefs = useRef([]);
  const activeIndexRef = useRef(0);
  const isSeekingRef = useRef(false);
  const rafRef = useRef(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durations, setDurations] = useState([]);
  const [currentTimes, setCurrentTimes] = useState([]);
  const [playbackRate, setPlaybackRateState] = useState(getSavedSpeed);
  const [volume, setVolumeState] = useState(getSavedVolume);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [isLooping, setIsLooping] = useState(false);

  // Stable serialized key for sources array
  const sourcesKey = (sources || []).join('|');

  const totalDuration = durations.reduce((sum, d) => sum + d, 0);

  // Combined current time = sum of durations before activeIndex + currentTime of active
  const combinedTime = durations.slice(0, activeIndex).reduce((sum, d) => sum + d, 0)
    + (currentTimes[activeIndex] || 0);

  const progress = totalDuration > 0 ? (combinedTime / totalDuration) * 100 : 0;

  const setIsSeeking = useCallback((v) => { isSeekingRef.current = v; }, []);

  // Create / recreate Audio elements when sources change
  useEffect(() => {
    setIsPlaying(false);
    setIsLoaded(false);
    setError(null);
    setIsLooping(false);
    setActiveIndex(0);
    activeIndexRef.current = 0;

    const srcs = (sources || []).filter(Boolean);
    if (srcs.length === 0) {
      audioRefs.current = [];
      setDurations([]);
      setCurrentTimes([]);
      return;
    }

    setDurations(new Array(srcs.length).fill(0));
    setCurrentTimes(new Array(srcs.length).fill(0));

    const audios = srcs.map((src) => {
      const a = new Audio(src);
      a.playbackRate = playbackRate;
      a.volume = volume;
      return a;
    });
    audioRefs.current = audios;

    // Track how many have loaded metadata
    let loadedCount = 0;

    const handlers = audios.map((audio, i) => {
      const onLoadedMetadata = () => {
        setDurations((prev) => {
          const next = [...prev];
          next[i] = audio.duration;
          return next;
        });
        loadedCount++;
        if (loadedCount >= srcs.length) setIsLoaded(true);
        else if (i === 0) setIsLoaded(true); // allow interaction once first is loaded
      };

      const onTimeUpdate = () => {
        if (isSeekingRef.current || activeIndexRef.current !== i) return;
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (!isSeekingRef.current && activeIndexRef.current === i) {
            setCurrentTimes((prev) => {
              const next = [...prev];
              next[i] = audio.currentTime;
              return next;
            });
          }
        });
      };

      const onEnded = () => {
        const nextIndex = i + 1;
        if (nextIndex < audios.length) {
          // Chain to next audio
          setActiveIndex(nextIndex);
          activeIndexRef.current = nextIndex;
          // Finalize current time for completed track
          setCurrentTimes((prev) => {
            const next = [...prev];
            next[i] = audio.duration;
            return next;
          });
          audios[nextIndex].currentTime = 0;
          audios[nextIndex].play().then(() => setIsPlaying(true)).catch(() => {});
        } else {
          setIsPlaying(false);
        }
      };

      const onError = () => {
        setError('音声ファイルの読み込みに失敗しました');
        setIsPlaying(false);
      };

      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      return { onLoadedMetadata, onTimeUpdate, onEnded, onError };
    });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      audios.forEach((audio, i) => {
        audio.removeEventListener('loadedmetadata', handlers[i].onLoadedMetadata);
        audio.removeEventListener('timeupdate', handlers[i].onTimeUpdate);
        audio.removeEventListener('ended', handlers[i].onEnded);
        audio.removeEventListener('error', handlers[i].onError);
        audio.pause();
        audio.src = '';
      });
      audioRefs.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcesKey]);

  // Loop: when last audio ends, restart from beginning
  useEffect(() => {
    const audios = audioRefs.current;
    if (!isLooping || audios.length === 0) return;

    const lastAudio = audios[audios.length - 1];
    const handler = () => {
      setActiveIndex(0);
      activeIndexRef.current = 0;
      setCurrentTimes(new Array(audios.length).fill(0));
      audios[0].currentTime = 0;
      audios[0].play().catch(() => {});
    };

    lastAudio.addEventListener('ended', handler);
    return () => lastAudio.removeEventListener('ended', handler);
  }, [isLooping]);

  const toggle = useCallback(() => {
    const audios = audioRefs.current;
    const active = audios[activeIndexRef.current];
    if (!active) {
      if (audios[0]) {
        audios[0].play().then(() => setIsPlaying(true)).catch(() => {});
      }
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
    const active = audioRefs.current[activeIndexRef.current];
    if (!active) return;
    active.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  const pause = useCallback(() => {
    const active = audioRefs.current[activeIndexRef.current];
    if (!active) return;
    active.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback((time) => {
    const audios = audioRefs.current;
    if (audios.length === 0 || !isFinite(time)) return;

    // Build durations from actual audio elements
    const ds = audios.map((a) => a.duration || 0);
    const total = ds.reduce((s, d) => s + d, 0);
    const clamped = Math.max(0, Math.min(time, total));

    // Determine which audio and position
    const prevActive = audios[activeIndexRef.current];
    const wasPlaying = prevActive && !prevActive.paused;

    // Pause current
    if (prevActive) prevActive.pause();

    let accumulated = 0;
    let targetIndex = audios.length - 1;
    let targetTime = 0;

    for (let i = 0; i < audios.length; i++) {
      if (clamped < accumulated + ds[i]) {
        targetIndex = i;
        targetTime = clamped - accumulated;
        break;
      }
      accumulated += ds[i];
      if (i === audios.length - 1) {
        targetTime = ds[i]; // end of last track
      }
    }

    // Reset all other audios
    audios.forEach((a, i) => {
      if (i !== targetIndex) {
        a.pause();
        a.currentTime = i < targetIndex ? (a.duration || 0) : 0;
      }
    });

    // Set target
    setActiveIndex(targetIndex);
    activeIndexRef.current = targetIndex;
    audios[targetIndex].currentTime = targetTime;

    // Update times
    setCurrentTimes(audios.map((a, i) => {
      if (i < targetIndex) return a.duration || 0;
      if (i === targetIndex) return targetTime;
      return 0;
    }));

    if (wasPlaying) audios[targetIndex].play().catch(() => {});
  }, []);

  const setSpeed = useCallback((rate) => {
    setPlaybackRateState(rate);
    audioRefs.current.forEach((a) => { a.playbackRate = rate; });
    try { localStorage.setItem(SPEED_KEY, String(rate)); } catch {}
  }, []);

  const setVolume = useCallback((val) => {
    const v = Math.max(0, Math.min(1, val));
    setVolumeState(v);
    audioRefs.current.forEach((a) => { a.volume = v; });
    try { localStorage.setItem(VOLUME_KEY, String(v)); } catch {}
  }, []);

  const reset = useCallback(() => {
    audioRefs.current.forEach((a) => { a.pause(); a.currentTime = 0; });
    setActiveIndex(0);
    activeIndexRef.current = 0;
    setIsPlaying(false);
    setCurrentTimes((prev) => new Array(prev.length).fill(0));
  }, []);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  return {
    isPlaying,
    currentTime: combinedTime,
    duration: totalDuration,
    durations,
    activeIndex,
    progress,
    playbackRate,
    volume,
    isLoaded,
    error,
    isLooping,
    play,
    pause,
    toggle,
    seek,
    setSpeed,
    setVolume,
    reset,
    toggleLoop,
    setIsSeeking,
  };
}
