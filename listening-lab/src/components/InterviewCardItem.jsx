import { ChevronIcon } from './AudioIcons';
import { relativeTime } from '../utils/time';
import styles from './InterviewCardItem.module.css';

/** 本番形式の結果（「本番 2回・最新 27/38・最高 30/38」など） */
function examText(h) {
  if (h.examCount === 0) return null;
  const parts = [`本番 ${h.examCount}回`];
  if (h.lastExam) {
    parts.push(`${h.lastExamScored ? '最新' : '最新の採点'} ${h.lastExam.total}/${h.lastExam.maxTotal}`);
    const best = h.bestExam;
    if (best && (best.total !== h.lastExam.total || best.maxTotal !== h.lastExam.maxTotal)) {
      parts.push(`最高 ${best.total}/${best.maxTotal}`);
    }
  } else {
    parts.push('未採点');
  }
  return parts.join('・');
}

/**
 * 面接（英検二次試験）の問題カード1枚分の行。
 * カードの話題と練習履歴を見せ、「練習形式」「本番形式」のどちらで始めるかを選ばせる。
 * history: summarizeInterview() の結果（未練習なら null）
 *   全パート（ナレーション・No.1〜4）を練習したか本番形式を通したら「済」、途中なら「3/5」のように出す
 */
export default function InterviewCardItem({ title, story, accentColor, history, onPractice, onExam }) {
  const accent = accentColor || 'var(--color-accent)';
  const parts = [];
  if (history) {
    const exam = examText(history);
    if (exam) parts.push(exam);
    if (history.practiceCount > 0) parts.push(`練習 のべ${history.practiceCount}回（パートごとに数える）`);
    const when = relativeTime(history.lastAttempt);
    if (when) parts.push(when);
  }
  const done = history?.doneParts ?? 0;
  const total = history?.totalParts ?? 5;

  return (
    <div className={styles.container} style={{ '--item-accent': accent }}>
      <div className={styles.body}>
        <span className={styles.titleRow}>
          <span className={styles.title}>{title}</span>
          {history?.complete ? (
            <span className={styles.doneMark} style={{ color: accent }} aria-label="全パート練習済み">
              済
            </span>
          ) : (
            done > 0 && (
              <span className={styles.partialMark} aria-label={`${total}パート中 ${done}パート練習済み`}>
                {done}/{total}
              </span>
            )
          )}
        </span>
        {story && <span className={styles.story}>{story}</span>}
        <span className={styles.stat}>
          ナレーション・No.1〜4
          {history && (
            <span className={styles.partsDone}>
              （{done}/{total} パート実施）
            </span>
          )}
        </span>
        {history && (
          <span className={styles.partTrack} aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`${styles.partPip} ${i < done ? styles.partPipOn : ''}`} />
            ))}
          </span>
        )}
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
