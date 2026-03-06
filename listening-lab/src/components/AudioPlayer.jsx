import { useRef, useCallback } from 'react';
import styles from './AudioPlayer.module.css';

const SPEEDS = [0.75, 1.0, 1.25, 1.5];
const SKIP_SEC = 5;

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ src, disabled = false, accentColor, audio }) {
  const progressRef = useRef(null);

  const accent = accentColor || 'var(--color-accent)';
  const {
    isPlaying, currentTime, duration, progress,
    playbackRate, error, play, pause, seek, reset, setSpeed,
  } = audio;

  const handleProgressClick = useCallback(
    (e) => {
      if (disabled || !duration) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seek(ratio * duration);
    },
    [disabled, duration, seek]
  );

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
      {/* Progress bar */}
      <div
        className={styles.progressTrack}
        ref={progressRef}
        onClick={handleProgressClick}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%`, background: accent }}
        />
        <div
          className={styles.progressThumb}
          style={{ left: `${progress}%`, borderColor: accent }}
        />
      </div>

      {/* Time display */}
      <div className={styles.timeRow}>
        <span className={styles.time}>{formatTime(currentTime)}</span>
        <span className={styles.time}>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button
          className={styles.speedButton}
          onClick={cycleSpeed}
          disabled={disabled}
          aria-label={`再生速度 ${playbackRate}x`}
        >
          {playbackRate}x
        </button>

        <button
          className={styles.skipButton}
          onClick={skipBack}
          disabled={disabled}
          aria-label="5秒戻る"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3.5V1L5.5 4.5L10 8V5.5C13.04 5.5 15.5 7.96 15.5 11C15.5 14.04 13.04 16.5 10 16.5C6.96 16.5 4.5 14.04 4.5 11H2.5C2.5 15.14 5.86 18.5 10 18.5C14.14 18.5 17.5 15.14 17.5 11C17.5 6.86 14.14 3.5 10 3.5Z" fill="currentColor"/>
            <text x="10" y="12.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor">5</text>
          </svg>
        </button>

        <button
          className={styles.playButton}
          onClick={isPlaying ? pause : play}
          disabled={disabled}
          style={{ background: accent }}
          aria-label={isPlaying ? '一時停止' : '再生'}
        >
          {isPlaying ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="6" y="5" width="3.5" height="12" rx="1" fill="white" />
              <rect x="12.5" y="5" width="3.5" height="12" rx="1" fill="white" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M8 5.5V16.5L17 11L8 5.5Z" fill="white" />
            </svg>
          )}
        </button>

        <button
          className={styles.skipButton}
          onClick={skipForward}
          disabled={disabled}
          aria-label="5秒進む"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3.5V1L14.5 4.5L10 8V5.5C6.96 5.5 4.5 7.96 4.5 11C4.5 14.04 6.96 16.5 10 16.5C13.04 16.5 15.5 14.04 15.5 11H17.5C17.5 15.14 14.14 18.5 10 18.5C5.86 18.5 2.5 15.14 2.5 11C2.5 6.86 5.86 3.5 10 3.5Z" fill="currentColor"/>
            <text x="10" y="12.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor">5</text>
          </svg>
        </button>

        <button
          className={styles.resetButton}
          onClick={reset}
          disabled={disabled}
          aria-label="リセット"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M3 9C3 5.68629 5.68629 3 9 3C12.3137 3 15 5.68629 15 9C15 12.3137 12.3137 15 9 15C7.10929 15 5.42767 14.1046 4.35 12.7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path d="M3 4V8H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
