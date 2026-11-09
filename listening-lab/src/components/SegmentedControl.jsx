import { useId } from 'react';
import styles from './SegmentedControl.module.css';

/**
 * いくつかの中から1つを選ぶ切り替え（「音声のみ / 英文 / 英文＋和訳」など）。
 * options: [{ value, label }]
 * hideLabelOnNarrow: 狭い画面では見出しを画面から隠す（読み上げには残す）
 */
export default function SegmentedControl({ label, options, value, onChange, disabled = false, hideLabelOnNarrow = false }) {
  const labelId = useId();
  const select = (i) => {
    const next = options[(i + options.length) % options.length];
    onChange(next.value);
  };
  const current = options.findIndex((o) => o.value === value);

  // 矢印キーで選び直せるようにする（ラジオボタンと同じ操作）
  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      select(current + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      select(current - 1);
    }
  };

  return (
    <div className={styles.wrap}>
      {label && (
        <span id={labelId} className={`${styles.label} ${hideLabelOnNarrow ? styles.labelNarrowHidden : ''}`}>
          {label}
        </span>
      )}
      <div
        className={styles.group}
        role="radiogroup"
        aria-labelledby={label ? labelId : undefined}
        onKeyDown={onKeyDown}
      >
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className={`${styles.option} ${on ? styles.on : ''}`}
              onClick={() => onChange(o.value)}
              disabled={disabled}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
