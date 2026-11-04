import useAudioPlayer from '../hooks/useAudioPlayer';
import SeekBar from './SeekBar';
import PhaseIndicator from './PhaseIndicator';
import { PlayIcon, PauseIcon, SkipIcon } from './AudioIcons';
import { formatTime, nextSpeed, segmentBoundaries, SKIP_SEC } from '../utils/audio';
import styles from './MiniAudioPlayer.module.css';

/**
 * 問題カード内のコンパクトな音声プレイヤー。
 * sources に配列を渡すと連続再生（例: 本文 → Q13 → Q14）になり、
 * phaseLabels で現在どこを再生中か表示する。
 */
export default function MiniAudioPlayer({ src, sources, phaseLabels, label, accentColor }) {
  const accent = accentColor || 'var(--color-accent)';
  const audio = useAudioPlayer(sources ?? src);
  const {
    hasSource, isPlaying, currentTime, duration, durations, activeIndex,
    playbackRate, error, toggle, seek, skip, setSpeed,
  } = audio;

  if (!hasSource) return null;

  if (error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.controlsRow}>
          {label && <span className={styles.label}>{label}</span>}
          <span className={styles.errorText}>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <PhaseIndicator
        labels={phaseLabels}
        activeIndex={activeIndex}
        isPlaying={isPlaying}
        accentColor={accent}
      />

      <SeekBar
        currentTime={currentTime}
        duration={duration}
        onSeek={seek}
        accentColor={accent}
        boundaries={segmentBoundaries(durations)}
      />

      <div className={styles.timeRow}>
        <span className={styles.time}>{formatTime(currentTime)}</span>
        <span className={styles.time}>{formatTime(duration)}</span>
      </div>

      <div className={styles.controlsRow}>
        {label && <span className={styles.label}>{label}</span>}
        <button
          className={styles.speedBtn}
          onClick={() => setSpeed(nextSpeed(playbackRate))}
          aria-label={`再生速度 ${playbackRate}倍（タップで変更）`}
        >
          {playbackRate}x
        </button>
        <button className={styles.skipBtn} onClick={() => skip(-SKIP_SEC)} aria-label={`${SKIP_SEC}秒戻る`}>
          <SkipIcon direction="back" />
        </button>
        <button
          className={styles.playBtn}
          onClick={toggle}
          style={{ background: accent }}
          aria-label={isPlaying ? '一時停止' : '再生'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button className={styles.skipBtn} onClick={() => skip(SKIP_SEC)} aria-label={`${SKIP_SEC}秒進む`}>
          <SkipIcon direction="forward" />
        </button>
      </div>
    </div>
  );
}
