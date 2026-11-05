import { ChevronIcon } from './AudioIcons';
import { relativeTime } from '../utils/time';
import styles from './SectionListItem.module.css';

export default function SectionListItem({ title, subtitle, questionCount, playCount, accentColor, onClick, history, onReviewWrong }) {
  const accent = accentColor || 'var(--color-accent)';
  const wrongCount = history?.lastWrong?.length || 0;

  return (
    <div className={styles.container} style={{ '--item-accent': accent }}>
      <button className={styles.item} onClick={onClick}>
        <div className={styles.body}>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          <div className={styles.meta}>
            <span className={styles.stat}>{questionCount}問</span>
            {playCount && (
              <>
                <span className={styles.dot}>·</span>
                <span className={styles.stat}>{playCount}</span>
              </>
            )}
            {history && (
              <>
                <span className={styles.dot}>·</span>
                <span className={styles.historyBadge}>
                  最高 {history.bestScore.correct}/{history.bestScore.total}
                </span>
                <span className={styles.dot}>·</span>
                <span className={styles.attempts}>挑戦{history.attempts}回</span>
                {history.lastAttempt && (
                  <>
                    <span className={styles.dot}>·</span>
                    <span className={styles.lastTime}>{relativeTime(history.lastAttempt)}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        {history && (
          <span className={styles.doneMark} style={{ color: accent }}>
            済
          </span>
        )}
        <span className={styles.arrow}>
          <ChevronIcon />
        </span>
      </button>

      {onReviewWrong && wrongCount > 0 && (
        <button className={styles.reviewButton} onClick={onReviewWrong}>
          前回間違えた {wrongCount}問を解き直す
        </button>
      )}
    </div>
  );
}
