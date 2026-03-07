import styles from './ExamTypeCard.module.css';

export default function ExamTypeCard({ examType, count, isExternal, onClick }) {
  return (
    <button
      className={styles.card}
      onClick={onClick}
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
        {isExternal ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={styles.externalIcon}>
            <path
              d="M14 10V14.5C14 15.0523 13.5523 15.5 13 15.5H3.5C2.94772 15.5 2.5 15.0523 2.5 14.5V5C2.5 4.44772 2.94772 4 3.5 4H8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11 2.5H15.5V7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.5 10.5L15.5 2.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <>
            {count > 0 && <span className={styles.count}>{count}件</span>}
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
