import { useState } from 'react';
import MiniAudioPlayer from './MiniAudioPlayer';
import PhraseList from './PhraseList';
import ReadAloud from './ReadAloud';
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

/** 自分の録音（再生と、端末への保存） */
export function RecordingField({ recording, accentColor, downloadName, onSaved }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>自分の録音</span>
      {recording ? (
        <div className={styles.recording}>
          <MiniAudioPlayer src={recording.url} accentColor={accentColor} />
          <div className={styles.recordingRow}>
            {recording.duration > 0 && (
              <span className={styles.recordingMeta}>録音時間 {formatTime(recording.duration)}</span>
            )}
            {downloadName && (
              <a className={styles.download} href={recording.url} download={downloadName} onClick={() => onSaved?.()}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 2.5V10M4.5 6.75L8 10.25L11.5 6.75M3 13H13"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                録音を保存
              </a>
            )}
            {recording.saved && <span className={styles.saved}>保存しました</span>}
          </div>
        </div>
      ) : (
        <p className={styles.muted}>録音はありません</p>
      )}
    </div>
  );
}

/**
 * 1ステップ（ナレーション / No.1〜4）分の振り返り。
 * 自分の録音・質問文・かんたん解答例・使えるフレーズ・模範解答・和訳・解説を並べる。
 * 模範解答・かんたん解答例は読み上げで聞ける。children に自己採点などを差し込める。
 * collapsible: 見出しを押して折りたためるようにする（本番形式の振り返りなど、長いとき）
 * badge: 見出しの横に出す状態（「採点済み 12/15」など）
 * downloadName / onRecordingSaved: 録音を端末に保存するときのファイル名と、保存したときの通知
 */
export function InterviewReviewStep({
  question,
  card,
  recording,
  accentColor,
  children,
  collapsible = false,
  badge,
  id,
  downloadName,
  onRecordingSaved,
}) {
  const [open, setOpen] = useState(true);
  const isNarration = question.type === 'narration';

  const title = (
    <h3 className={styles.stepTitle}>
      {stepLabel(question)}
      <span className={styles.stepNote}>
        {isNarration ? '2分間で4コマを説明' : question.showCard ? 'カードを見て答える' : 'カードを伏せて答える'}
      </span>
      {badge && <span className={styles.badge}>{badge}</span>}
    </h3>
  );

  const body = (
    <>
      <RecordingField
        recording={recording}
        accentColor={accentColor}
        downloadName={downloadName}
        onSaved={onRecordingSaved}
      />

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
            <ReadAloud text={question.simpleAnswer} textClassName={styles.model} />
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

      {question.modelAnswer && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>模範解答</span>
          <div className={styles.fieldBody}>
            <ReadAloud text={question.modelAnswer} textClassName={styles.model} />
          </div>
        </div>
      )}
      <Field label="和訳">{question.modelAnswerJa && <p>{question.modelAnswerJa}</p>}</Field>
      <Field label="解説">{question.explanation && <p>{question.explanation}</p>}</Field>

      {children}
    </>
  );

  if (!collapsible) {
    return (
      <section className={styles.step} id={id}>
        {title}
        {body}
      </section>
    );
  }

  return (
    <details className={`${styles.step} ${styles.collapsible}`} id={id} open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className={styles.summary}>{title}</summary>
      {/* 閉じている間も中身は残す（自己採点の観点のチェックなどを消さない） */}
      <div className={styles.collapsibleBody}>{body}</div>
    </details>
  );
}

/**
 * カード1枚分（ナレーション〜No.4）の振り返り。
 * stepProps(q) で、ステップごとの追加の props（badge・downloadName など）を渡せる。
 */
export default function InterviewReview({ section, recordings = {}, accentColor, renderExtra, stepProps, collapsible = false }) {
  return (
    <div className={styles.list}>
      {getInterviewSteps(section).map((q) => (
        <InterviewReviewStep
          key={q.id}
          question={q}
          card={section.card}
          recording={recordings[q.id]}
          accentColor={accentColor}
          collapsible={collapsible}
          {...stepProps?.(q)}
        >
          {renderExtra?.(q)}
        </InterviewReviewStep>
      ))}
    </div>
  );
}
