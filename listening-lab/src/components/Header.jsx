import styles from './Header.module.css';

export default function Header({ onBack, accentColor, showSubtitle = false }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.left}>
          {onBack && (
            <button
              className={styles.backButton}
              onClick={onBack}
              aria-label="戻る"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M12.5 15L7.5 10L12.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        <div className={styles.center}>
          <svg
            className={styles.icon}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: accentColor || 'var(--color-accent)' }}
          >
            <path
              d="M3 18V12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12V18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M3 14V18C3 19.1046 3.89543 20 5 20H6C7.10457 20 8 19.1046 8 18V14C8 12.8954 7.10457 12 6 12H5C3.89543 12 3 12.8954 3 14Z"
              fill="currentColor"
            />
            <path
              d="M16 14V18C16 19.1046 16.8954 20 18 20H19C20.1046 20 21 19.1046 21 18V14C21 12.8954 20.1046 12 19 12H18C16.8954 12 16 12.8954 16 14Z"
              fill="currentColor"
            />
          </svg>
          <div className={styles.titleGroup}>
            <span className={styles.title}>Listening Lab</span>
            {showSubtitle && (
              <span className={styles.subtitle}>英語リスニング演習</span>
            )}
          </div>
        </div>

        <div className={styles.right} />
      </div>
    </header>
  );
}
