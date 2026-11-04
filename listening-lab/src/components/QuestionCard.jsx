import MiniAudioPlayer from './MiniAudioPlayer';
import QuestionBody from './QuestionBody';
import styles from './QuestionCard.module.css';

/** 一覧表示での問題カード（ヘッダー + 音声 + 問題本体） */
export default function QuestionCard({
  question,
  userAnswer,
  showResult,
  onAnswer,
  onCheck,
  accentColor,
  showPassageAudio,
  hideAudio,
  hidePrompt,
}) {
  const accent = accentColor || 'var(--color-accent)';

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <span className={styles.badge} style={{ background: accent }}>
          Q{question.number}
        </span>
        {!hideAudio && question.passageLabel && (
          <span className={styles.passageLabel}>{question.passageLabel}</span>
        )}
        {question.playCount && (
          <span className={styles.playCount}>
            {question.playCount === 1 ? '1回再生' : `${question.playCount}回再生`}
          </span>
        )}
      </div>

      {/* PassageGroup 内では音声はグループ側でまとめて表示する */}
      {!hideAudio && (
        <>
          {showPassageAudio && question.passageAudio && (
            <MiniAudioPlayer
              src={question.passageAudio}
              label={question.passageLabel || 'Passage'}
              accentColor={accent}
            />
          )}
          {question.audio && (
            <MiniAudioPlayer src={question.audio} label="Question" accentColor={accent} />
          )}
        </>
      )}

      <QuestionBody
        question={question}
        userAnswer={userAnswer}
        showResult={showResult}
        onAnswer={onAnswer}
        onCheck={onCheck}
        accentColor={accent}
        hidePrompt={hidePrompt}
      />
    </div>
  );
}
