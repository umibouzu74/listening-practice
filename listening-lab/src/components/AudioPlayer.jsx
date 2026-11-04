import SeekBar from './SeekBar';
import PhaseIndicator from './PhaseIndicator';
import { PlayIcon, PauseIcon, SkipIcon, LoopIcon } from './AudioIcons';
import { formatTime, nextSpeed, segmentBoundaries, SKIP_SEC } from '../utils/audio';
import styles from './AudioPlayer.module.css';

/**
 * 大きめの音声プレイヤー（セクション音声、1問ずつモードの下部バー）。
 * 状態は useAudioPlayer の戻り値を audio として受け取る。
 *
 * @param {'card'|'bare'} variant - card: 枠付き / bare: 枠なし（親が背景を持つ場合）
 * @param {React.ReactNode} extraControls - 再生ボタンの右に並べる追加ボタン
 */
export default function AudioPlayer({ audio, accentColor, phaseLabels, extraControls, variant = 'card' }) {
  const accent = accentColor || 'var(--color-accent)';
  const {
    hasSource, isPlaying, currentTime, duration, durations, activeIndex,
    playbackRate, isLooping, error, toggle, seek, skip, setSpeed, toggleLoop,
  } = audio;

  const wrapperClass = variant === 'bare' ? styles.bare : styles.wrapper;

  if (!hasSource || error) {
    return (
      <div className={wrapperClass}>
        <div className={styles.fallback}>{error || 'この問題には音声がありません'}</div>
        {extraControls && <div className={styles.controlsRow}>{extraControls}</div>}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <PhaseIndicator
        labels={phaseLabels}
        activeIndex={activeIndex}
        isPlaying={isPlaying}
        accentColor={accent}
        center
      />

      <div className={styles.seekRow}>
        <button className={styles.iconBtn} onClick={() => skip(-SKIP_SEC)} aria-label={`${SKIP_SEC}秒戻る`}>
          <SkipIcon direction="back" size={20} />
        </button>
        <SeekBar
          size="lg"
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
          accentColor={accent}
          boundaries={segmentBoundaries(durations)}
        />
        <button className={styles.iconBtn} onClick={() => skip(SKIP_SEC)} aria-label={`${SKIP_SEC}秒進む`}>
          <SkipIcon direction="forward" size={20} />
        </button>
      </div>

      <div className={styles.timeRow}>
        <span className={styles.time}>{formatTime(currentTime)}</span>
        <span className={styles.time}>{formatTime(duration)}</span>
      </div>

      <div className={styles.controlsRow}>
        <button
          className={styles.iconBtn}
          onClick={toggleLoop}
          aria-label="ループ再生"
          aria-pressed={isLooping}
          style={isLooping ? { color: accent } : undefined}
        >
          <LoopIcon />
        </button>

        <button
          className={styles.speedBtn}
          onClick={() => setSpeed(nextSpeed(playbackRate))}
          aria-label={`再生速度 ${playbackRate}倍（タップで変更）`}
        >
          {playbackRate}x
        </button>

        <button
          className={styles.mainPlayBtn}
          onClick={toggle}
          style={{ background: accent }}
          aria-label={isPlaying ? '一時停止' : '再生'}
        >
          {isPlaying ? <PauseIcon size={28} /> : <PlayIcon size={28} />}
        </button>

        {extraControls}
      </div>
    </div>
  );
}
