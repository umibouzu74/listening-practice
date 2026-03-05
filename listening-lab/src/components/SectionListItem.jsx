import styles from './SectionListItem.module.css';

export default function SectionListItem({ section, accentColor, onClick, history }) {
  const accent = accentColor || 'var(--color-accent)';
  const questionCount = section.questions?.length || 0;

  return (
    <button
      className={styles.item}
      onClick={onClick}
      style={{ '--item-accent': accent }}
    >
      <div className={styles.body}>
        <span className={styles.title}>{section.title}</span>
        {(section.subtitle || section.description) && (
          <span className={styles.subtitle}>{section.subtitle || section.description}</span>
        )}
        <div className={styles.meta}>
          <span className={styles.stat}>{questionCount}問</span>
          {section.playCount && (
            <>
              <span className={styles.dot}>·</span>
              <span className={styles.stat}>{section.playCount}</span>
            </>
          )}
          {history && (
            <>
              <span className={styles.dot}>·</span>
              <span className={styles.historyBadge}>
                最高 {history.bestScore.correct}/{history.bestScore.total}
              </span>
              <span className={styles.dot}>·</span>
              <span className={styles.attempts}>{history.attempts}回</span>
            </>
          )}
        </div>
      </div>
      {history && (
        <span
          className={styles.doneMark}
          style={{ color: accent }}
        >
          済
        </span>
      )}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.arrow}>
        <path
          d="M6 4L10 8L6 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
