import { ChevronIcon } from './AudioIcons';
import { countQuestions, isDraft, isInterview } from '../data/registry';
import styles from './ExamSetCard.module.css';

export default function ExamSetCard({ examSet, accentColor, completedSections = 0, onClick }) {
  const accent = accentColor || 'var(--color-accent)';
  const { meta, sections } = examSet;
  const draft = isDraft(examSet);
  const progress = sections.length > 0 ? completedSections / sections.length : 0;

  return (
    <button
      className={`${styles.card} ${draft ? styles.draft : ''}`}
      onClick={draft ? undefined : onClick}
      disabled={draft}
      style={{ '--card-accent': accent }}
    >
      <div className={styles.header}>
        <span className={styles.title}>
          {meta.subtitle || meta.title}
          {draft && <span className={styles.draftBadge}>準備中</span>}
        </span>
        {meta.description && <span className={styles.description}>{meta.description}</span>}
      </div>
      <div className={styles.footer}>
        <span className={styles.stat}>
          {isInterview(examSet)
            ? `カード${sections.length}枚・${sections.some((s) => s.hasInterviewAudio) ? '面接官の音声あり' : '読み上げ音声'}`
            : `${sections.length}セクション・${countQuestions(examSet)}問`}
          {meta.totalTime && ` ・ 約${meta.totalTime}分`}
        </span>
        {!draft && completedSections > 0 && (
          <span className={styles.progress}>
            <span className={styles.progressTrack}>
              <span className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
            </span>
            {completedSections}/{sections.length}
          </span>
        )}
        {!draft && (
          <span className={styles.arrow}>
            <ChevronIcon />
          </span>
        )}
      </div>
    </button>
  );
}
