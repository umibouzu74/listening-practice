import { useId, useState } from 'react';
import styles from './SelfScore.module.css';

/**
 * 自己採点（0〜max 点）と、採点の目安になる観点のチェックリスト。
 * もう一度同じ点を押すと未採点に戻る。チェックリストは採点の手がかりで、保存はしない。
 */
export default function SelfScore({ max, value, onChange, checkpoints = [], previous, accentColor }) {
  const accent = accentColor || 'var(--color-accent)';
  const [checked, setChecked] = useState(() => new Set());
  const labelId = useId();
  const scale = Array.from({ length: max + 1 }, (_, i) => i);

  const toggleCheck = (i) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className={styles.box} style={{ '--score-accent': accent }}>
      <div className={styles.head}>
        <span id={labelId} className={styles.label}>
          自己採点
        </span>
        <span className={styles.value}>
          {value ?? '–'}
          <small> / {max}</small>
        </span>
        {typeof previous === 'number' && <span className={styles.previous}>前回 {previous}/{max}</span>}
      </div>

      <div className={styles.columns}>
        <div className={styles.scale} role="radiogroup" aria-labelledby={labelId}>
          {scale.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              className={`${styles.point} ${value === n ? styles.pointOn : ''}`}
              onClick={() => onChange(value === n ? null : n)}
            >
              {n}
            </button>
          ))}
        </div>

        {checkpoints.length > 0 && (
          <ul className={styles.checklist} aria-label="採点の観点">
            {checkpoints.map((c, i) => (
              <li key={i}>
                <label className={styles.check}>
                  <input type="checkbox" checked={checked.has(i)} onChange={() => toggleCheck(i)} />
                  <span>{c}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
