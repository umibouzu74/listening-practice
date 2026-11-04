import { ChevronIcon } from './AudioIcons';
import styles from './PhaseIndicator.module.css';

/** 連続再生の現在位置表示: 「Passage A → Q13 → Q14」 */
export default function PhaseIndicator({ labels, activeIndex, isPlaying, accentColor, center = false }) {
  if (!labels || labels.length < 2) return null;
  return (
    <div className={`${styles.row} ${center ? styles.center : ''}`}>
      {labels.map((label, i) => {
        const active = i === activeIndex && isPlaying;
        return (
          <span key={i} className={styles.group}>
            {i > 0 && (
              <span className={styles.arrow}>
                <ChevronIcon size={12} />
              </span>
            )}
            <span
              className={`${styles.tag} ${i === activeIndex ? styles.current : ''}`}
              style={active ? { color: accentColor } : undefined}
            >
              {label}
            </span>
          </span>
        );
      })}
    </div>
  );
}
