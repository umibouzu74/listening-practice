import { useState, useRef, useCallback, useEffect } from 'react';
import styles from './MiniAudioPlayer.module.css';

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MiniAudioPlayer({ src, label, accentColor }) {
  const accent = accentColor || 'var(--color-accent)';
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(false);

    if (!src) {
      audioRef.current = null;
      return;
    }

    const audio = new Audio(src);
    audioRef.current = audio;

    const onMeta = () => setDuration(audio.duration);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => setIsPlaying(false);
    const onError = () => {
      setError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [src]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {
        setError(true);
      });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleProgressClick = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  }, [duration]);

  if (!src) return null;

  if (error) {
    return (
      <div className={styles.wrapper}>
        {label && <span className={styles.label}>{label}</span>}
        <span className={styles.errorText}>音声を読み込めません</span>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
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
