import styles from './ExamTypeCard.module.css';

export default function ExamTypeCard({ examType, count, onClick }) {
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
      </div>
    </button>
  );
}
