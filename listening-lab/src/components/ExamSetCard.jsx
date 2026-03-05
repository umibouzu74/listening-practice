import styles from './ExamSetCard.module.css';

export default function ExamSetCard({ examSet, accentColor, onClick }) {
  const accent = accentColor || 'var(--color-accent)';
  const { meta, sections } = examSet;
  const totalQuestions = sections.reduce(
    (sum, s) => sum + (s.questions?.length || 0),
    0
  );

  return (
    <button
      className={styles.card}
      onClick={onClick}
      style={{ '--card-accent': accent }}
    >
      <div className={styles.header}>
        <span className={styles.title}>{meta.title}</span>
        {meta.subtitle && (
          <span className={styles.subtitle}>{meta.subtitle}</span>
        )}
      </div>
      <div className={styles.footer}>
        <span className={styles.stat}>
          {sections.length}セクション・{totalQuestions}問
        </span>
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
