import { ChevronIcon } from './AudioIcons';
import { relativeTime } from '../utils/time';
import styles from './InterviewCardItem.module.css';

/**
 * 面接（英検二次試験）の問題カード1枚分の行。
 * カードの話題と練習履歴を見せ、「練習形式」「本番形式」のどちらで始めるかを選ばせる。
 * history: summarizeInterview() の結果（未練習なら null）
 */
export default function InterviewCardItem({ title, story, accentColor, history, onPractice, onExam }) {
  const accent = accentColor || 'var(--color-accent)';
  const parts = [];
  if (history) {
    if (history.examCount > 0) {
      parts.push(
        history.bestTotal !== null
          ? `本番 ${history.examCount}回（最高 ${history.bestTotal}/${history.maxTotal}）`
          : `本番 ${history.examCount}回`
      );
    }
    if (history.practiceCount > 0) parts.push(`練習 ${history.practiceCount}回`);
    const when = relativeTime(history.lastAttempt);
    if (when) parts.push(when);
  }

  return (
    <div className={styles.container} style={{ '--item-accent': accent }}>
      <div className={styles.body}>
        <span className={styles.titleRow}>
          <span className={styles.title}>{title}</span>
          {history && (
            <span className={styles.doneMark} style={{ color: accent }}>
              済
            </span>
          )}
        </span>
        {story && <span className={styles.story}>{story}</span>}
        <span className={styles.stat}>ナレーション・No.1〜4</span>
        {parts.length > 0 && <span className={styles.history}>{parts.join(' · ')}</span>}
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
