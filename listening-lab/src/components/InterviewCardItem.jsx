import { ChevronIcon } from './AudioIcons';
import styles from './InterviewCardItem.module.css';

/**
 * 面接（英検二次試験）の問題カード1枚分の行。
 * カードの話題を見せ、「練習形式」「本番形式」のどちらで始めるかを選ばせる。
 */
export default function InterviewCardItem({ title, story, accentColor, onPractice, onExam, children }) {
  const accent = accentColor || 'var(--color-accent)';

  return (
    <div className={styles.container} style={{ '--item-accent': accent }}>
      <div className={styles.body}>
        <span className={styles.title}>{title}</span>
        {story && <span className={styles.story}>{story}</span>}
        <span className={styles.stat}>ナレーション・No.1〜4</span>
        {children}
      </div>
      <div className={styles.actions}>
        <button className={styles.action} onClick={onPractice}>
          <span className={styles.actionText}>
            <span className={styles.actionLabel}>練習形式</span>
            <span className={styles.actionHint}>1つずつ何度でも</span>
          </span>
          <ChevronIcon />
        </button>
        <button className={styles.action} onClick={onExam}>
          <span className={styles.actionText}>
            <span className={styles.actionLabel}>本番形式</span>
            <span className={styles.actionHint}>本番どおりの流れで</span>
          </span>
          <ChevronIcon />
        </button>
      </div>
    </div>
  );
}
