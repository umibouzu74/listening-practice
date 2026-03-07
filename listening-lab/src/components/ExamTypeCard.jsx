import styles from './ExamTypeCard.module.css';

export default function ExamTypeCard({ examType, count, onClick }) {
  const isComingSoon = examType.comingSoon;
  const isEmpty = !isComingSoon && count === 0;
  const isDisabled = isComingSoon || isEmpty;

  return (
    <button
      className={`${styles.card} ${isDisabled ? styles.disabled : ''}`}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      style={{ '--card-accent': examType.color }}
    >
      <div className={styles.iconWrapper}>
        <span className={styles.icon}>{examType.icon}</span>
      </div>
      <div className={styles.body}>
        <span className={styles.label}>{examType.label}</span>
        <span className={styles.description}>{examType.description}</span>
      </div>
      <div className={styles.meta}>
        {isComingSoon ? (
          <span className={styles.preparing}>準備中</span>
        ) : isEmpty ? (
          <span className={styles.preparing}>準備中</span>
        ) : (
          <>
            <span className={styles.count}>{count}件</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.arrow}>
              <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </div>
    </button>
  );
}
