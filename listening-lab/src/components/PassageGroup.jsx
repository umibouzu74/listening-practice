import { useMemo } from 'react';
import PassageQuestionPlayer from './PassageQuestionPlayer';
import MiniAudioPlayer from './MiniAudioPlayer';
import QuestionCard from './QuestionCard';
import styles from './PassageGroup.module.css';

/**
 * Renders a passage group: one combined audio player (passage → Q1 → Q2 ...)
 * followed by individual question cards (without their own audio).
 *
 * After all questions in the group are checked, shows a "replay passage" player.
 */
export default function PassageGroup({
  passageAudio,
  passageLabel,
  questions,
  answers,
  checkedQuestions,
  onAnswer,
  onCheck,
  accentColor,
  questionRefs,
  showOnlyWrong,
}) {
  const accent = accentColor || 'var(--color-accent)';

  // Build questionAudios array for the chained player
  const questionAudios = useMemo(() =>
    questions.map((q) => ({
      src: q.audio,
      label: `Q${q.number}`,
    })),
    [questions]
  );

  // Check if all questions in this group are checked
  const allGroupChecked = questions.every((q) => checkedQuestions.has(q.id));

  return (
    <div className={styles.group}>
      {/* Group header */}
      <div className={styles.groupHeader}>
        <span className={styles.groupLabel} style={{ borderColor: accent }}>
          {passageLabel}
        </span>
        <span className={styles.groupCount}>
          {questions.map((q) => `Q${q.number}`).join(' / ')}
        </span>
      </div>

      {/* Combined chained player: passage → Q1 → Q2 */}
      <PassageQuestionPlayer
        passageSrc={passageAudio}
        questionAudios={questionAudios}
        passageLabel={passageLabel}
        accentColor={accent}
      />

      {/* Individual question cards (without audio) */}
      {questions.map((q) => {
        const isChecked = checkedQuestions.has(q.id);
        if (showOnlyWrong && isChecked && answers[q.id] === q.answer) return null;
        return (
          <div key={q.id} ref={(el) => { if (questionRefs) questionRefs.current[q.id] = el; }}>
            <QuestionCard
              question={q}
              userAnswer={answers[q.id] || null}
              showResult={isChecked}
              onAnswer={(choice) => onAnswer(q.id, choice)}
              onCheck={() => onCheck(q.id)}
              accentColor={accent}
              hideAudio
            />
          </div>
        );
      })}

      {/* Replay passage only (after all group questions checked) */}
      {allGroupChecked && (
        <div className={styles.replaySection}>
          <MiniAudioPlayer
            src={passageAudio}
            label={`${passageLabel || '本文'}を聞き直す`}
            accentColor={accent}
          />
        </div>
      )}
    </div>
  );
}
