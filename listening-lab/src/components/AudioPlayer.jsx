import { useRef, useCallback, useEffect, useState } from 'react';
import styles from './AudioPlayer.module.css';

const SPEEDS = [0.75, 1.0, 1.25, 1.5];

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ src, disabled = false, accentColor, audio }) {
  const progressRef = useRef(null);
  const draggingRef = useRef(false);
  const [dragProgress, setDragProgress] = useState(null);

  const accent = accentColor || 'var(--color-accent)';
  const {
    isPlaying, currentTime, duration, progress,
    playbackRate, error, play, pause, seek, reset,
    setSpeed, isLooping, toggleLoop,
  } = audio;

  const displayProgress = dragProgress !== null ? dragProgress : progress;

  // --- Seekbar drag ---
  const calcRatio = useCallback((clientX) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!draggingRef.current) return;
    const ratio = calcRatio(e.clientX);
    setDragProgress(ratio * 100);
  }, [calcRatio]);

  const handlePointerUp = useCallback((e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const ratio = calcRatio(e.clientX);
    seek(ratio * (duration || 0));
    setDragProgress(null);
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  }, [calcRatio, duration, seek, handlePointerMove]);

  const handlePointerDown = useCallback((e) => {
    if (disabled || !duration) return;
    e.preventDefault();
    draggingRef.current = true;
    const ratio = calcRatio(e.clientX);
    setDragProgress(ratio * 100);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [disabled, duration, calcRatio, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleProgressClick = useCallback(
    (e) => {
      if (disabled || !duration || draggingRef.current) return;
      const ratio = calcRatio(e.clientX);
      seek(ratio * duration);
    },
    [disabled, duration, seek, calcRatio]
  );

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(playbackRate);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
  }, [playbackRate, setSpeed]);

  const skipBack = useCallback(() => {
    seek(Math.max(0, currentTime - 5));
  }, [currentTime, seek]);

  const skipForward = useCallback(() => {
    seek(Math.min(duration || 0, currentTime + 5));
  }, [currentTime, duration, seek]);

  if (!src) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.fallback}>音声ファイルが設定されていません</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.fallback}>音声ファイルの読み込みに失敗しました</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Seek row: [skip back] [seekbar] [skip forward] */}
      <div className={styles.seekRow}>
        <button
          className={styles.seekBtn}
          onClick={skipBack}
          disabled={disabled}
          aria-label="5秒戻る"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 10C3 6.13 6.13 3 10 3C13.87 3 17 6.13 17 10C17 13.87 13.87 17 10 17C8.11 17 6.42 16.2 5.2 14.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M3 5V9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div
          className={styles.seekTrack}
          ref={progressRef}
          onClick={handleProgressClick}
          onPointerDown={handlePointerDown}
          role="slider"
          aria-valuenow={Math.round(displayProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="再生位置"
        >
          <div
            className={styles.seekFill}
            style={{ width: `${displayProgress}%`, background: accent }}
          />
          <div
            className={styles.seekThumb}
            style={{ left: `${displayProgress}%`, background: accent }}
          />
        </div>

        <button
          className={styles.seekBtn}
          onClick={skipForward}
          disabled={disabled}
          aria-label="5秒進む"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3.5V1L14.5 4.5L10 8V5.5C6.96 5.5 4.5 7.96 4.5 11C4.5 14.04 6.96 16.5 10 16.5C13.04 16.5 15.5 14.04 15.5 11H17.5C17.5 15.14 14.14 18.5 10 18.5C5.86 18.5 2.5 15.14 2.5 11C2.5 6.86 5.86 3.5 10 3.5Z" fill="currentColor"/>
            <text x="10" y="12.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor">5</text>
          </svg>
        </button>
      </div>

      {/* Time display */}
      <div className={styles.timeRow}>
        <span className={styles.time}>{formatTime(currentTime)}</span>
        <span className={styles.time}>{formatTime(duration)}</span>
      </div>

      {/* Controls row: [loop] [speed] [BIG play] */}
      <div className={styles.controlsRow}>
        <button
          className={styles.loopBtn}
          onClick={toggleLoop}
          disabled={disabled}
          aria-label="ループ再生"
          style={isLooping ? { color: accent } : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M14 3L17 6L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 10V8C3 6.34 4.34 5 6 5H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M6 17L3 14L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17 10V12C17 13.66 15.66 15 14 15H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <button
          className={styles.speedBtn}
          onClick={cycleSpeed}
          disabled={disabled}
          aria-label={`再生速度 ${playbackRate}x`}
        >
          {playbackRate}x
        </button>

        <button
          className={styles.mainPlayBtn}
          onClick={isPlaying ? pause : play}
          disabled={disabled}
          style={{ background: accent }}
          aria-label={isPlaying ? '一時停止' : '再生'}
        >
          {isPlaying ? (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="8" y="6" width="4" height="16" rx="1" fill="white"/>
              <rect x="16" y="6" width="4" height="16" rx="1" fill="white"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M10 6V22L22 14L10 6Z" fill="white"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
