import MiniAudioPlayer from './MiniAudioPlayer';
import QuestionCard from './QuestionCard';
import styles from './PassageGroup.module.css';

/**
 * 1つの本文に複数の設問がぶら下がるグループ（英検 Part 2 など）。
 * 本文 → Q1 → Q2 … を1本で連続再生するプレイヤーの下に、音声なしの設問カードを並べる。
 * グループ内の全問を答え合わせしたら、本文だけを聞き直すプレイヤーを出す。
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
  registerRef,
  showOnlyWrong,
  hidePrompt,
}) {
  const accent = accentColor || 'var(--color-accent)';
  const label = passageLabel || '本文';

  const sources = [passageAudio, ...questions.map((q) => q.audio)];
  const phaseLabels = [label, ...questions.map((q) => `Q${q.number}`)];
  const allGroupChecked = questions.every((q) => checkedQuestions.has(q.id));

  const visible = questions.filter(
    (q) => !(showOnlyWrong && checkedQuestions.has(q.id) && answers[q.id] === q.answer)
  );
  if (visible.length === 0) return null;

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <span className={styles.groupLabel} style={{ borderColor: accent }}>
          {label}
        </span>
        <span className={styles.groupCount}>
          {questions.map((q) => `Q${q.number}`).join(' / ')}
        </span>
      </div>

      <MiniAudioPlayer sources={sources} phaseLabels={phaseLabels} accentColor={accent} />

      {visible.map((q) => (
        <div key={q.id} ref={(el) => registerRef?.(q.id, el)}>
          <QuestionCard
            question={q}
            userAnswer={answers[q.id] || null}
            showResult={checkedQuestions.has(q.id)}
            onAnswer={(choice) => onAnswer(q.id, choice)}
            onCheck={() => onCheck(q.id)}
            accentColor={accent}
            hideAudio
            hidePrompt={hidePrompt}
          />
        </div>
      ))}

      {allGroupChecked && (
        <div className={styles.replaySection}>
          <MiniAudioPlayer src={passageAudio} label="本文だけ聞き直す" accentColor={accent} />
        </div>
      )}
    </div>
  );
}
