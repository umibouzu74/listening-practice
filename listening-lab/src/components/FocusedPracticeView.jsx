import { useState, useEffect, useRef, useCallback } from 'react';
import useAudioPlayer from '../hooks/useAudioPlayer';
import AudioPlayer from './AudioPlayer';
import QuestionBody from './QuestionBody';
import styles from './FocusedPracticeView.module.css';

function isTypingTarget(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

/** 1問ずつモードの下部プレイヤー（問題ごとに key で作り直す） */
function QuestionAudio({ question, accent, controlsRef, extraControls }) {
  const chained = Boolean(question.passageAudio && question.audio);
  const sources = chained
    ? [question.passageAudio, question.audio]
    : question.passageAudio || question.audio || null;
  const audio = useAudioPlayer(sources);
  const phaseLabels = chained ? [question.passageLabel || '本文', `Q${question.number}`] : null;

  // キーボードショートカット用に親から操作できるようにする
  const { toggle, skip } = audio;
  useEffect(() => {
    controlsRef.current = { toggle, skip };
  }, [controlsRef, toggle, skip]);

  return (
    <AudioPlayer
      audio={audio}
      accentColor={accent}
      phaseLabels={phaseLabels}
      extraControls={extraControls}
      variant="bare"
    />
  );
}

/**
 * 1問ずつ表示する全画面モード。
 * キー操作: ←/→ 前後の問題, Space 再生/停止, 1-4 選択肢, Enter 答え合わせ, Esc 閉じる
 */
export default function FocusedPracticeView({
  questions,
  initialIndex = 0,
  answers,
  checkedQuestions,
  onAnswer,
  onCheck,
  onClose,
  accentColor,
  sectionTitle,
  examTitle,
  hidePrompt,
}) {
  const accent = accentColor || 'var(--color-accent)';
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(questions.length - 1, 0))
  );
  const bodyRef = useRef(null);
  const audioControlsRef = useRef(null);

  const question = questions[currentIndex];
  const lastIndex = questions.length - 1;

  const goToPrev = useCallback(() => setCurrentIndex((i) => Math.max(0, i - 1)), []);
  const goToNext = useCallback(() => setCurrentIndex((i) => Math.min(lastIndex, i + 1)), [lastIndex]);

  // 背景ページのスクロールを止める
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // 問題が変わったら先頭までスクロール
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
      if (!question) return;
      const checked = checkedQuestions.has(question.id);

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === ' ') {
        e.preventDefault();
        audioControlsRef.current?.toggle();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (/^[1-9]$/.test(e.key) && !checked) {
        const choice = question.choices[Number(e.key) - 1];
        if (choice) {
          e.preventDefault();
          onAnswer(question.id, choice.label);
        }
      } else if (e.key === 'Enter' && !checked && answers[question.id]) {
        e.preventDefault();
        onCheck(question.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question, answers, checkedQuestions, goToPrev, goToNext, onAnswer, onCheck, onClose]);

  if (!question) return null;

  const navButtons = (
    <>
      <button className={styles.navBtn} onClick={goToPrev} disabled={currentIndex === 0} aria-label="前の問題">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M13 15L7 10L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="14" y1="5" x2="14" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button className={styles.navBtn} onClick={goToNext} disabled={currentIndex === lastIndex} aria-label="次の問題">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M7 5L13 10L7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="6" y1="5" x2="6" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </>
  );

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="1問ずつ演習">
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onClose} aria-label="一覧に戻る">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className={styles.headerTitle}>
          <span className={styles.headerSectionTitle}>{sectionTitle}</span>
          {examTitle && <span className={styles.headerExamTitle}>{examTitle}</span>}
        </div>
        <span className={styles.headerCount}>{currentIndex + 1} / {questions.length}</span>
      </div>

      {/* 問題ごとの進捗ドット（タップでジャンプ） */}
      <div className={styles.dots}>
        {questions.map((q, i) => {
          const checked = checkedQuestions.has(q.id);
          const state = checked
            ? answers[q.id] === q.answer ? styles.dotCorrect : styles.dotWrong
            : answers[q.id] ? styles.dotAnswered : '';
          return (
            <button
              key={q.id}
              className={`${styles.dot} ${state} ${i === currentIndex ? styles.dotCurrent : ''}`}
              style={i === currentIndex ? { '--accent': accent } : undefined}
              onClick={() => setCurrentIndex(i)}
              aria-label={`問${q.number}へ移動`}
              aria-current={i === currentIndex ? 'step' : undefined}
            />
          );
        })}
      </div>

      <div className={styles.body} ref={bodyRef}>
        <div className={styles.questionHeader}>
          {question.passageLabel && <span className={styles.passageLabel}>{question.passageLabel}</span>}
          <span className={styles.questionNumber}>問 {question.number}</span>
        </div>

        <QuestionBody
          key={question.id}
          question={question}
          userAnswer={answers[question.id] || null}
          showResult={checkedQuestions.has(question.id)}
          onAnswer={(label) => onAnswer(question.id, label)}
          onCheck={() => onCheck(question.id)}
          accentColor={accent}
          large
          hidePrompt={hidePrompt}
        />

        <p className={styles.keyHint}>
          キー操作: ←/→ 前後の問題 · Space 再生/停止 · 1〜4 選択 · Enter 答え合わせ · Esc 閉じる
        </p>
      </div>

      <div className={styles.bottomPlayer}>
        <QuestionAudio
          key={question.id}
          question={question}
          accent={accent}
          controlsRef={audioControlsRef}
          extraControls={navButtons}
        />
      </div>
    </div>
  );
}
