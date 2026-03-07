import { useCallback, useRef, useEffect, useState } from 'react';
import useAudioPlayer from '../hooks/useAudioPlayer';
import styles from './MiniAudioPlayer.module.css';

const SPEEDS = [0.75, 1.0, 1.25, 1.5];
const SKIP_SEC = 5;

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MiniAudioPlayer({ src, label, accentColor }) {
  const accent = accentColor || 'var(--color-accent)';
  const progressRef = useRef(null);
  const draggingRef = useRef(false);
  const [dragProgress, setDragProgress] = useState(null);

  const {
    isPlaying, currentTime, duration, progress,
    playbackRate, error, toggle, seek, setSpeed, setIsSeeking,
  } = useAudioPlayer(src);

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
    setIsSeeking(false);
    const ratio = calcRatio(e.clientX);
    seek(ratio * (duration || 0));
    setDragProgress(null);
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  }, [calcRatio, duration, seek, handlePointerMove, setIsSeeking]);

  const handlePointerDown = useCallback((e) => {
    if (!duration) return;
    e.preventDefault();
    draggingRef.current = true;
    setIsSeeking(true);
    const ratio = calcRatio(e.clientX);
    setDragProgress(ratio * 100);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [duration, calcRatio, handlePointerMove, handlePointerUp, setIsSeeking]);

  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleProgressClick = useCallback((e) => {
    if (!duration || draggingRef.current) return;
    const ratio = calcRatio(e.clientX);
    seek(ratio * duration);
  }, [duration, seek, calcRatio]);

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(playbackRate);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
  }, [playbackRate, setSpeed]);

  const skipBack = useCallback(() => {
    seek(Math.max(0, currentTime - SKIP_SEC));
  }, [currentTime, seek]);

  const skipForward = useCallback(() => {
    seek(Math.min(duration || 0, currentTime + SKIP_SEC));
  }, [currentTime, duration, seek]);

  if (!src) return null;

  if (error) {
    return (
      <div className={styles.wrapper}>
        {label && <span className={styles.label}>{label}</span>}
        <span className={styles.errorText}>音声を読み込めません</span>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Row 1: Seekbar */}
      <div className={styles.seekRow}>
        <div
          className={styles.seekTrack}
          ref={progressRef}
          onClick={handleProgressClick}
          onPointerDown={handlePointerDown}
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
      </div>

      {/* Row 1.5: Time */}
      <div className={styles.timeRow}>
        <span className={styles.time}>{formatTime(currentTime)}</span>
        <span className={styles.time}>{formatTime(duration)}</span>
      </div>

      {/* Row 2: Controls */}
      <div className={styles.controlsRow}>
        {label && <span className={styles.label}>{label}</span>}
        <button
          className={styles.speedBtn}
          onClick={cycleSpeed}
          aria-label={`再生速度 ${playbackRate}x`}
        >
          {playbackRate}x
        </button>
        <button
          className={styles.skipBtn}
          onClick={skipBack}
          aria-label="5秒戻る"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 3.5V1L5.5 4.5L10 8V5.5C13.04 5.5 15.5 7.96 15.5 11C15.5 14.04 13.04 16.5 10 16.5C6.96 16.5 4.5 14.04 4.5 11H2.5C2.5 15.14 5.86 18.5 10 18.5C14.14 18.5 17.5 15.14 17.5 11C17.5 6.86 14.14 3.5 10 3.5Z" fill="currentColor"/>
            <text x="10" y="12.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor">5</text>
          </svg>
        </button>
        <button
          className={styles.playBtn}
          onClick={toggle}
          style={{ background: accent }}
          aria-label={isPlaying ? '一時停止' : '再生'}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="4" y="3" width="3" height="12" rx="0.5" fill="white" />
              <rect x="11" y="3" width="3" height="12" rx="0.5" fill="white" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M5 3V15L15 9L5 3Z" fill="white" />
            </svg>
          )}
        </button>
        <button
          className={styles.skipBtn}
          onClick={skipForward}
          aria-label="5秒進む"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 3.5V1L14.5 4.5L10 8V5.5C6.96 5.5 4.5 7.96 4.5 11C4.5 14.04 6.96 16.5 10 16.5C13.04 16.5 15.5 14.04 15.5 11H17.5C17.5 15.14 14.14 18.5 10 18.5C5.86 18.5 2.5 15.14 2.5 11C2.5 6.86 5.86 3.5 10 3.5Z" fill="currentColor"/>
            <text x="10" y="12.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor">5</text>
          </svg>
        </button>
      </div>
    </div>
  );
}
