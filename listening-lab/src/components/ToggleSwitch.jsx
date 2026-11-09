import styles from './ToggleSwitch.module.css';

/**
 * オン・オフを切り替えるスイッチ（「質問文を表示」「英語を隠す」など）。
 * オフでも押せるボタンだと分かるよう、つまみの位置と色で状態を示し、文字は薄くしない。
 * label は「何が起きるか」が分かる言い方にする（例: 「フレーズを表示」）。
 */
export default function ToggleSwitch({ checked, onChange, label, disabled = false, className = '' }) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${checked ? styles.on : ''} ${className}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      disabled={disabled}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.knob} />
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
