import { useRef, useCallback } from 'react';
import styles from './AudioPlayer.module.css';

const SPEEDS = [0.75, 1.0, 1.25, 1.5];

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ src, disabled = false, accentColor, audioState, audioActions }) {
  const progressRef = useRef(null);

  const accent = accentColor || 'var(--color-accent)';
  const { isPlaying, currentTime, duration, playbackRate, error } = audioState;
  const { play, pause, seek, reset, setPlaybackRate } = audioActions;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

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
    setPlaybackRate(next);
  }, [playbackRate, setPlaybackRate]);

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
