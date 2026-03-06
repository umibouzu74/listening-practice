import styles from './SectionListItem.module.css';

function relativeTime(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  const months = Math.floor(days / 30);
  return `${months}ヶ月前`;
}

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
