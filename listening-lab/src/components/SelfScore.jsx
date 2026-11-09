import { useId, useState } from 'react';
import styles from './SelfScore.module.css';

/** チェックした観点の数から出す点数の目安（観点がないときは null） */
function suggestScore(checkedCount, total, max) {
  if (!total) return null;
  return Math.round((checkedCount / total) * max);
}

/**
 * 自己採点（0〜max 点）と、採点の目安になる観点のチェックリスト。
 * 観点にチェックを入れると、チェックした割合から点数の目安を自動で入れる。
 * 点数ボタンを押して直した後は自動では変えず、「目安を入れる」で入れ直せる。
 * もう一度同じ点を押すと未採点に戻る。チェックリストは採点の手がかりで、保存はしない。
 */
export default function SelfScore({ title = '自己採点', max, value, onChange, checkpoints = [], previous, accentColor, id }) {
  const accent = accentColor || 'var(--color-accent)';
  const [checked, setChecked] = useState(() => new Set());
  // 最後に自動で入れた点（この点のままなら、チェックを変えたときに入れ直す）
  const [autoValue, setAutoValue] = useState(null);
  const labelId = useId();
  const scale = Array.from({ length: max + 1 }, (_, i) => i);
  const suggestion = suggestScore(checked.size, checkpoints.length, max);

  const toggleCheck = (i) => {
    const next = new Set(checked);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setChecked(next);
    // まだ点を入れていないか、自動で入れた点のままなら目安を入れ直す
    const isAuto = value === null || value === undefined || value === autoValue;
    if (!isAuto) return;
    const s = next.size > 0 ? suggestScore(next.size, checkpoints.length, max) : null;
    setAutoValue(s);
    if (s !== value) onChange(s);
  };

  const pick = (n) => {
    setAutoValue(null);
    onChange(value === n ? null : n);
  };

  const applySuggestion = () => {
    setAutoValue(suggestion);
    onChange(suggestion);
  };

  const manual = typeof value === 'number' && value !== autoValue;

  return (
    <div className={styles.box} style={{ '--score-accent': accent }} id={id}>
      <div className={styles.head}>
        <span id={labelId} className={styles.label}>
          {title}
        </span>
        <span className={styles.value}>
          {value ?? '–'}
          <small> / {max}</small>
        </span>
        {typeof previous === 'number' && <span className={styles.previous}>前回 {previous}/{max}</span>}
      </div>

      <div className={styles.columns}>
        {checkpoints.length > 0 && (
          <div className={styles.checks}>
            <p className={styles.hint}>当てはまる観点にチェックすると、点数の目安が入ります</p>
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
            {checked.size > 0 && (
              <p className={styles.suggestion}>
                観点 {checked.size}/{checkpoints.length} → 目安 {suggestion}点
                {manual && value !== suggestion && (
                  <button type="button" className={styles.applyButton} onClick={applySuggestion}>
                    目安を入れる
                  </button>
                )}
              </p>
            )}
          </div>
        )}

        <div className={styles.scaleBox}>
          <span className={styles.scaleLabel}>点数（押して直せます）</span>
          <div className={styles.scale} role="radiogroup" aria-labelledby={labelId}>
            {scale.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={value === n}
                className={`${styles.point} ${value === n ? styles.pointOn : ''}`}
                onClick={() => pick(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
