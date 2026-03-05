import { useState } from 'react';
import styles from './QuestionCard.module.css';

export default function QuestionCard({
  question,
  userAnswer,
  showResult,
  onAnswer,
  accentColor,
}) {
  const [showScript, setShowScript] = useState(false);
  const accent = accentColor || 'var(--color-accent)';

  const isCorrect = showResult && userAnswer === question.answer;
  const isIncorrect = showResult && userAnswer && userAnswer !== question.answer;

  return (
    <div className={styles.card}>
      {/* Header row */}
      <div className={styles.headerRow}>
        <span className={styles.badge} style={{ background: accent }}>
          Q{question.number}
        </span>
        {question.playCount && (
          <span className={styles.playCount}>
            {question.playCount === 1 ? '1回再生' : `${question.playCount}回再生`}
          </span>
        )}
      </div>

      {/* Japanese prompt */}
      {question.promptJa && (
        <p className={styles.promptJa}>{question.promptJa}</p>
      )}

      {/* English prompt */}
      {question.prompt && (
        <p className={styles.prompt}>{question.prompt}</p>
      )}

      {/* Image */}
      {question.image && (
        <div className={styles.imageWrapper}>
          <img
            src={question.image}
            alt={`問題${question.number}の図表`}
            className={styles.image}
          />
        </div>
      )}

      {/* Choices */}
      <div className={styles.choices}>
        {question.choices.map((choice) => {
          const isSelected = userAnswer === choice.label;
          const isCorrectChoice = showResult && choice.label === question.answer;
          const isWrongSelected =
            showResult && isSelected && choice.label !== question.answer;

          let choiceClass = styles.choice;
          if (isCorrectChoice) choiceClass += ` ${styles.correct}`;
          else if (isWrongSelected) choiceClass += ` ${styles.incorrect}`;
          else if (isSelected && !showResult) choiceClass += ` ${styles.selected}`;

          return (
            <button
              key={choice.label}
              className={choiceClass}
              onClick={() => !showResult && onAnswer(choice.label)}
              disabled={showResult}
              style={
                isSelected && !showResult
                  ? { borderColor: accent, background: `${accent}15` }
                  : undefined
              }
            >
              <span
                className={styles.choiceLabel}
                style={
                  isSelected && !showResult
                    ? { background: accent, borderColor: accent }
                    : isCorrectChoice
                      ? { background: 'var(--color-correct)', borderColor: 'var(--color-correct)' }
                      : isWrongSelected
                        ? { background: 'var(--color-incorrect)', borderColor: 'var(--color-incorrect)' }
                        : undefined
                }
              >
                {isCorrectChoice ? '✓' : isWrongSelected ? '✕' : choice.label}
              </span>
              <span className={styles.choiceText}>{choice.text}</span>
            </button>
          );
        })}
      </div>

      {/* Result: explanation */}
      {showResult && question.explanation && (
        <div className={styles.explanation}>
          <div className={styles.explanationHeader}>
            {isCorrect ? (
              <span className={styles.resultCorrect}>正解！</span>
            ) : (
              <span className={styles.resultIncorrect}>
                不正解（正解: {question.answer}）
              </span>
            )}
          </div>
          <p className={styles.explanationText}>{question.explanation}</p>
        </div>
      )}

      {/* Result: script toggle */}
      {showResult && question.script && (
        <div className={styles.scriptSection}>
          <button
            className={styles.scriptToggle}
            onClick={() => setShowScript((v) => !v)}
          >
            {showScript ? 'スクリプトを隠す' : 'スクリプトを表示'}
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className={showScript ? styles.chevronUp : styles.chevronDown}
            >
              <path
                d="M3.5 5.25L7 8.75L10.5 5.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {showScript && (
            <p className={styles.scriptText}>{question.script}</p>
          )}
        </div>
      )}
    </div>
  );
}
