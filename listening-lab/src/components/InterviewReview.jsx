import MiniAudioPlayer from './MiniAudioPlayer';
import PhraseList from './PhraseList';
import { formatTime } from '../utils/audio';
import { getInterviewSteps, stepLabel } from '../utils/interview';
import styles from './InterviewReview.module.css';

function Field({ label, children, lang }) {
  if (!children) return null;
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.fieldBody} lang={lang}>
        {children}
      </div>
    </div>
  );
}

/**
 * 1ステップ（ナレーション / No.1〜4）分の振り返り。
 * 自分の録音・質問文・かんたん解答例・使えるフレーズ・模範解答・和訳・解説を並べる。
 * children に自己採点などを差し込める。
 */
export function InterviewReviewStep({ question, card, recording, accentColor, children }) {
  const isNarration = question.type === 'narration';
  return (
    <section className={styles.step}>
      <h3 className={styles.stepTitle}>
        {stepLabel(question)}
        <span className={styles.stepNote}>
          {isNarration ? '2分間で4コマを説明' : question.showCard ? 'カードを見て答える' : 'カードを伏せて答える'}
        </span>
      </h3>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>自分の録音</span>
        {recording ? (
          <div className={styles.recording}>
            <MiniAudioPlayer src={recording.url} accentColor={accentColor} />
            {recording.duration > 0 && (
              <span className={styles.recordingMeta}>録音時間 {formatTime(recording.duration)}</span>
            )}
          </div>
        ) : (
          <p className={styles.muted}>録音はありません</p>
        )}
      </div>

      {isNarration ? (
        <Field label="最初の一文" lang="en">
          <p>{card?.firstSentence}</p>
        </Field>
      ) : (
        <Field label="質問">
          <p lang="en">{question.prompt}</p>
          {question.promptJa && <p className={styles.translation}>{question.promptJa}</p>}
        </Field>
      )}

      {question.simpleAnswer && (
        <div className={`${styles.field} ${styles.simple}`}>
          <span className={styles.fieldLabel}>かんたん解答例（まずはここを目指す）</span>
          <div className={styles.fieldBody}>
            <p className={styles.model} lang="en">
              {question.simpleAnswer}
            </p>
            {question.simpleAnswerJa && <p className={styles.translation}>{question.simpleAnswerJa}</p>}
          </div>
        </div>
      )}
      {question.phrases?.length > 0 && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>使えるフレーズ</span>
          <PhraseList phrases={question.phrases} />
        </div>
      )}

      <Field label="模範解答" lang="en">
        {question.modelAnswer && <p className={styles.model}>{question.modelAnswer}</p>}
      </Field>
      <Field label="和訳">{question.modelAnswerJa && <p>{question.modelAnswerJa}</p>}</Field>
      <Field label="解説">{question.explanation && <p>{question.explanation}</p>}</Field>

      {children}
    </section>
  );
}

/** カード1枚分（ナレーション〜No.4）の振り返り */
export default function InterviewReview({ section, recordings = {}, accentColor, renderExtra }) {
  return (
    <div className={styles.list}>
      {getInterviewSteps(section).map((q) => (
        <InterviewReviewStep
          key={q.id}
          question={q}
          card={section.card}
          recording={recordings[q.id]}
          accentColor={accentColor}
        >
          {renderExtra?.(q)}
        </InterviewReviewStep>
      ))}
    </div>
  );
}
