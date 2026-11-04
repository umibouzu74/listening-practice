import { useRef, useState } from 'react';
import { formatTime, SKIP_SEC } from '../utils/audio';
import styles from './SeekBar.module.css';

/**
 * ドラッグ・クリック・キーボード（←/→/Home/End）で操作できるシークバー。
 * Pointer Capture を使うので、指がバーの外に出てもドラッグが途切れない。
 */
export default function SeekBar({
  currentTime,
  duration,
  onSeek,
  accentColor,
  boundaries = [],
  size = 'sm',
  disabled = false,
}) {
  const trackRef = useRef(null);
  const [dragRatio, setDragRatio] = useState(null);
  const enabled = !disabled && duration > 0;

  const ratioAt = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handlePointerDown = (e) => {
    if (!enabled || e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragRatio(ratioAt(e.clientX));
  };

  const handlePointerMove = (e) => {
    if (dragRatio === null) return;
    setDragRatio(ratioAt(e.clientX));
  };

  const handlePointerUp = (e) => {
    if (dragRatio === null) return;
    const ratio = ratioAt(e.clientX);
    setDragRatio(null);
    onSeek(ratio * duration);
  };

  const handleKeyDown = (e) => {
    if (!enabled) return;
    const actions = {
      ArrowLeft: () => onSeek(currentTime - SKIP_SEC),
      ArrowRight: () => onSeek(currentTime + SKIP_SEC),
      Home: () => onSeek(0),
      End: () => onSeek(duration),
    };
    if (actions[e.key]) {
      e.preventDefault();
      actions[e.key]();
    }
  };

  const ratio = dragRatio ?? (duration > 0 ? Math.min(1, currentTime / duration) : 0);
  const percent = `${ratio * 100}%`;

  return (
    <div
      ref={trackRef}
      className={`${styles.track} ${size === 'lg' ? styles.lg : ''} ${enabled ? '' : styles.disabled}`}
      style={{ '--accent': accentColor || 'var(--color-accent)' }}
      role="slider"
      tabIndex={enabled ? 0 : -1}
      aria-label="再生位置"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(ratio * duration)}
      aria-valuetext={`${formatTime(ratio * duration)} / ${formatTime(duration)}`}
      aria-disabled={!enabled}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDragRatio(null)}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.rail} />
      <div className={styles.fill} style={{ width: percent }} />
      {boundaries.map((pos, i) => (
        <div key={i} className={styles.boundary} style={{ left: `${pos}%` }} />
      ))}
      <div className={`${styles.thumb} ${dragRatio !== null ? styles.dragging : ''}`} style={{ left: percent }} />
    </div>
  );
}
