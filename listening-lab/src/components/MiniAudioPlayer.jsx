import { useCallback, useRef } from 'react';
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
  const {
    isPlaying, currentTime, duration, progress,
    playbackRate, error, toggle, seek, setSpeed,
  } = useAudioPlayer(src);

  const handleProgressClick = useCallback((e) => {
    if (!duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  }, [duration, seek]);

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
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 3V1L4.5 3.5L8 6V4C10.76 4 13 6.24 13 9C13 11.76 10.76 14 8 14C5.24 14 3 11.76 3 9H1.5C1.5 12.59 4.41 15.5 8 15.5C11.59 15.5 14.5 12.59 14.5 9C14.5 5.41 11.59 2.5 8 2.5V3Z" fill="currentColor"/>
          <text x="8" y="10.5" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="currentColor">5</text>
        </svg>
      </button>
      <button
        className={styles.playBtn}
        onClick={toggle}
        style={{ background: accent }}
        aria-label={isPlaying ? '一時停止' : '再生'}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="2" width="2.5" height="10" rx="0.5" fill="white" />
            <rect x="8.5" y="2" width="2.5" height="10" rx="0.5" fill="white" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M4 2.5V11.5L11 7L4 2.5Z" fill="white" />
          </svg>
        )}
      </button>
      <button
        className={styles.skipBtn}
        onClick={skipForward}
        aria-label="5秒進む"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 3V1L11.5 3.5L8 6V4C5.24 4 3 6.24 3 9C3 11.76 5.24 14 8 14C10.76 14 13 11.76 13 9H14.5C14.5 12.59 11.59 15.5 8 15.5C4.41 15.5 1.5 12.59 1.5 9C1.5 5.41 4.41 2.5 8 2.5V3Z" fill="currentColor"/>
          <text x="8" y="10.5" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="currentColor">5</text>
        </svg>
      </button>
      <div
        className={styles.progressTrack}
        ref={progressRef}
        onClick={handleProgressClick}
      >
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%`, background: accent }}
        />
      </div>
      <span className={styles.time}>{formatTime(currentTime)}/{formatTime(duration)}</span>
    </div>
  );
}
