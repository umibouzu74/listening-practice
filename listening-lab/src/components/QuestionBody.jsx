import { useState } from 'react';
import styles from './QuestionBody.module.css';

/** 英文スクリプトと和訳を段落（空行以外の行）単位で対にする */
function pairScript(en, ja) {
  const enLines = en.split('\n').filter((l) => l.trim());
  const jaLines = (ja || '').split('\n').filter((l) => l.trim());
  const pairs = enLines.map((line, i) => ({ en: line, ja: jaLines[i] || null }));
  // 和訳の方が行数が多い場合は最後の段落にまとめる
  if (jaLines.length > enLines.length && pairs.length > 0) {
    const rest = jaLines.slice(enLines.length).join('\n');
    const last = pairs[pairs.length - 1];
    last.ja = last.ja ? `${last.ja}\n${rest}` : rest;
  }
  return pairs;
}

const SPEAKER_RE = /^([WM]):\s*/;

function ScriptLine({ text, className }) {
  const m = text.match(SPEAKER_RE);
  if (!m) return <p className={className}>{text}</p>;
  return (
    <p className={className}>
      <span className={styles.speaker}>{m[1]}</span>
      {text.slice(m[0].length)}
    </p>
  );
}

/**
 * 問題の本体（状況・設問・選択肢・答え合わせ・解説・スクリプト）。
 * 一覧表示の QuestionCard と 1問ずつモードの両方で使う。
 * 問題が切り替わったら親側で key を変えて状態（スクリプト表示など）をリセットする。
 */
export default function QuestionBody({
  question,
  userAnswer,
  showResult,
  onAnswer,
  onCheck,
  accentColor,
  large = false,
}) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [showScriptJa, setShowScriptJa] = useState(false);
  const accent = accentColor || 'var(--color-accent)';

  const isCorrect = showResult && userAnswer === question.answer;
  const correctChoice = question.choices.find((c) => c.label === question.answer);

  // Part 3 形式: 英語の状況文があればそれを、なければ和訳のみを表示
  const situationText = question.situation || question.situationJa;
  const situationIsEnglish = Boolean(question.situation);
  const translations = [
    situationIsEnglish && question.situationJa,
    question.promptJa,
  ].filter(Boolean);

  return (
    <div className={`${styles.body} ${large ? styles.large : ''}`} style={{ '--accent': accent }}>
      {situationText && (
        <div className={styles.situation}>
          <span className={styles.situationLabel}>{situationIsEnglish ? 'Situation' : '状況'}</span>
          <p className={styles.situationText}>{situationText}</p>
        </div>
      )}

      {question.prompt && (
        <p className={styles.prompt}>
          {situationText && <span className={styles.promptLabel}>Question</span>}
          {question.prompt}
        </p>
      )}

      {translations.length > 0 && (
        <div className={styles.translation}>
          <button
            className={styles.textToggle}
            onClick={() => setShowTranslation((v) => !v)}
            aria-expanded={showTranslation}
          >
            {showTranslation ? '和訳を隠す' : '和訳を表示'}
          </button>
          {showTranslation && translations.map((t, i) => (
            <p key={i} className={styles.translationText}>{t}</p>
          ))}
        </div>
      )}

      {question.image && (
        <div className={styles.imageWrapper}>
          <img src={question.image} alt={`問題${question.number}の図表`} className={styles.image} />
        </div>
      )}

      <div className={styles.choices} role="group" aria-label="選択肢">
        {question.choices.map((choice) => {
          const isSelected = userAnswer === choice.label;
          const isCorrectChoice = showResult && choice.label === question.answer;
          const isWrongSelected = showResult && isSelected && !isCorrectChoice;

          let choiceClass = styles.choice;
          if (isCorrectChoice) choiceClass += ` ${styles.correct}`;
          else if (isWrongSelected) choiceClass += ` ${styles.incorrect}`;
          else if (isSelected) choiceClass += ` ${styles.selected}`;

          return (
            <button
              key={choice.label}
              className={choiceClass}
              onClick={() => !showResult && onAnswer(choice.label)}
              disabled={showResult}
              aria-pressed={isSelected}
            >
              <span className={styles.choiceLabel}>
                {isCorrectChoice ? '✓' : isWrongSelected ? '✕' : choice.label}
              </span>
              <span className={styles.choiceText}>{choice.text}</span>
            </button>
          );
        })}
      </div>

      {!showResult && userAnswer && onCheck && (
        <button className={styles.checkButton} onClick={onCheck}>
          答え合わせ
        </button>
      )}

      {showResult && (
        <div className={styles.explanation}>
          <div className={styles.explanationHeader}>
            {isCorrect ? (
              <span className={styles.resultCorrect}>正解！</span>
            ) : (
              <span className={styles.resultIncorrect}>
                不正解（正解: {question.answer}
                {correctChoice?.text ? ` ${correctChoice.text}` : ''}）
              </span>
            )}
          </div>
          {question.explanation && (
            <p className={styles.explanationText}>{question.explanation}</p>
          )}
        </div>
      )}

      {showResult && question.script && (
        <div className={styles.scriptSection}>
          <button
            className={styles.scriptToggle}
            onClick={() => setShowScript((v) => !v)}
            aria-expanded={showScript}
          >
            {showScript ? 'スクリプトを隠す' : 'スクリプトを表示'}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
              className={showScript ? styles.chevronUp : styles.chevronDown}>
              <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showScript && (
            <>
              {question.scriptJa && (
                <button
                  className={styles.textToggle}
                  onClick={() => setShowScriptJa((v) => !v)}
                  aria-expanded={showScriptJa}
                >
                  {showScriptJa ? '日本語訳を隠す' : '日本語訳を表示'}
                </button>
              )}
              <div className={styles.script}>
                {pairScript(question.script, showScriptJa ? question.scriptJa : null).map((pair, i) => (
                  <div key={i} className={showScriptJa ? styles.scriptPair : undefined}>
                    <ScriptLine text={pair.en} className={styles.scriptEnLine} />
                    {pair.ja && <ScriptLine text={pair.ja} className={styles.scriptJaLine} />}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
