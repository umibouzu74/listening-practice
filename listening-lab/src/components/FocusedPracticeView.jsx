import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import useAudioPlayer from '../hooks/useAudioPlayer';
import styles from './FocusedPracticeView.module.css';

const SPEEDS = [0.75, 1.0, 1.25, 1.5];
const SKIP_SEC = 5;

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FocusedPracticeView({
  questions,
  answers,
  checkedQuestions,
  onAnswer,
  onCheck,
  onClose,
  accentColor,
  sectionTitle,
  examTitle,
}) {
  const accent = accentColor || 'var(--color-accent)';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showScript, setShowScript] = useState(false);
  const progressRef = useRef(null);
  const draggingRef = useRef(false);
  const [dragProgress, setDragProgress] = useState(null);

  const question = questions[currentIndex];

  // Determine which audio to play: passage audio or question audio
  const audioSrc = question?.passageAudio || question?.audio || null;

  const {
    isPlaying, currentTime, duration, progress,
    playbackRate, error, toggle, seek, setSpeed, reset,
    isLooping, toggleLoop, setIsSeeking,
  } = useAudioPlayer(audioSrc);

  const displayProgress = dragProgress !== null ? dragProgress : progress;

  // Reset script visibility when changing question
  useEffect(() => {
    setShowScript(false);
  }, [currentIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) setCurrentIndex((i) => i - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
          break;
        case ' ':
          e.preventDefault();
          toggle();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, questions.length, toggle, onClose]);

  // --- Seekbar drag ---
  const calcRatio = useCallback((clientX) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!draggingRef.current) return;
    const ratio = calcRatio(e.clientX);
    setDragProgress(ratio * 100);
  }, [calcRatio]);

  const handlePointerUp = useCallback((e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsSeeking(false);
    const ratio = calcRatio(e.clientX);
    seek(ratio * (duration || 0));
    setDragProgress(null);
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  }, [calcRatio, duration, seek, handlePointerMove, setIsSeeking]);

  const handlePointerDown = useCallback((e) => {
    if (!duration) return;
    e.preventDefault();
    draggingRef.current = true;
    setIsSeeking(true);
    const ratio = calcRatio(e.clientX);
    setDragProgress(ratio * 100);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [duration, calcRatio, handlePointerMove, handlePointerUp, setIsSeeking]);

  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleProgressClick = useCallback((e) => {
    if (!duration || draggingRef.current) return;
    const ratio = calcRatio(e.clientX);
    seek(ratio * duration);
  }, [duration, seek, calcRatio]);

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(playbackRate);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
  }, [playbackRate, setSpeed]);

  const skipBack = useCallback(() => {
    seek(Math.max(0, currentTime - SKIP_SEC));
  }, [currentTime, seek]);

  const skipForward = useCallback(() => {
    seek(Math.min(duration || 0, currentTime + SKIP_SEC));
  }, [currentTime, duration, seek]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  }, [currentIndex, questions.length]);

  if (!question) return null;

  const isChecked = checkedQuestions.has(question.id);
  const isCorrect = isChecked && answers[question.id] === question.answer;
  const isIncorrect = isChecked && answers[question.id] && answers[question.id] !== question.answer;

  return (
    <div className={styles.overlay}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onClose} aria-label="一覧に戻る">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className={styles.headerTitle}>
          <span className={styles.headerSectionTitle}>{sectionTitle}</span>
          {examTitle && <span className={styles.headerExamTitle}>{examTitle}</span>}
        </div>
        <span className={styles.headerCount}>{currentIndex + 1} / {questions.length}</span>
      </div>

      {/* Question content */}
      <div className={styles.body}>
        <div className={styles.questionHeader}>
          {question.passageLabel && (
            <span className={styles.passageLabel}>{question.passageLabel}</span>
          )}
          <span className={styles.questionNumber}>問 {question.number}</span>
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
            const isSelected = answers[question.id] === choice.label;
            const isCorrectChoice = isChecked && choice.label === question.answer;
            const isWrongSelected = isChecked && isSelected && choice.label !== question.answer;

            let choiceClass = styles.choice;
            if (isCorrectChoice) choiceClass += ` ${styles.correct}`;
            else if (isWrongSelected) choiceClass += ` ${styles.incorrect}`;
            else if (isSelected && !isChecked) choiceClass += ` ${styles.selected}`;

            return (
              <button
                key={choice.label}
                className={choiceClass}
                onClick={() => !isChecked && onAnswer(question.id, choice.label)}
                disabled={isChecked}
                style={
                  isSelected && !isChecked
                    ? { borderColor: accent, background: `${accent}15` }
                    : undefined
                }
              >
                <span
                  className={styles.choiceLabel}
                  style={
                    isSelected && !isChecked
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

        {/* Per-question check button */}
        {!isChecked && answers[question.id] && onCheck && (
          <button
            className={styles.checkButton}
            onClick={() => onCheck(question.id)}
            style={{ '--accent': accent }}
          >
            答え合わせ
          </button>
        )}

        {/* Result: explanation */}
        {isChecked && question.explanation && (
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

        {/* Script toggle */}
        {isChecked && question.script && (
          <div className={styles.scriptSection}>
            <button
              className={styles.scriptToggle}
              onClick={() => setShowScript((v) => !v)}
              style={{ '--accent': accent }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="8" cy="8" r="2" fill="currentColor"/>
              </svg>
              {showScript ? 'スクリプトを隠す' : 'スクリプトをみる'}
            </button>
            {showScript && (
              <p className={styles.scriptText}>{question.script}</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom audio player */}
      <div className={styles.bottomPlayer}>
        {/* Seek bar */}
        <div className={styles.seekRow}>
          <button
            className={styles.abBtn}
            onClick={skipBack}
            aria-label="5秒戻る"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10C3 6.13 6.13 3 10 3C13.87 3 17 6.13 17 10C17 13.87 13.87 17 10 17C8.11 17 6.42 16.2 5.2 14.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M3 5V9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div
            className={styles.seekTrack}
            ref={progressRef}
            onClick={handleProgressClick}
            onPointerDown={handlePointerDown}
          >
            <div
              className={styles.seekFill}
              style={{ width: `${displayProgress}%`, background: accent }}
            />
            <div
              className={styles.seekThumb}
              style={{ left: `${displayProgress}%`, background: accent }}
            />
          </div>
          <button
            className={styles.abBtn}
            onClick={skipForward}
            aria-label="5秒進む"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3.5V1L14.5 4.5L10 8V5.5C6.96 5.5 4.5 7.96 4.5 11C4.5 14.04 6.96 16.5 10 16.5C13.04 16.5 15.5 14.04 15.5 11H17.5C17.5 15.14 14.14 18.5 10 18.5C5.86 18.5 2.5 15.14 2.5 11C2.5 6.86 5.86 3.5 10 3.5Z" fill="currentColor"/>
              <text x="10" y="12.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor">5</text>
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className={styles.controlsRow}>
          <button className={styles.loopBtn} onClick={toggleLoop} aria-label="ループ再生"
            style={isLooping ? { color: accent } : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M14 3L17 6L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 10V8C3 6.34 4.34 5 6 5H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 17L3 14L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 10V12C17 13.66 15.66 15 14 15H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          <button className={styles.speedBtn} onClick={cycleSpeed} aria-label={`再生速度 ${playbackRate}x`}>
            {playbackRate}x
          </button>

          <button
            className={styles.mainPlayBtn}
            onClick={toggle}
            style={{ background: accent }}
            aria-label={isPlaying ? '一時停止' : '再生'}
          >
            {isPlaying ? (
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="8" y="6" width="4" height="16" rx="1" fill="white"/>
                <rect x="16" y="6" width="4" height="16" rx="1" fill="white"/>
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M10 6V22L22 14L10 6Z" fill="white"/>
              </svg>
            )}
          </button>

          <button className={styles.navBtn} onClick={goToPrev} disabled={currentIndex === 0} aria-label="前の問題">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 15L7 10L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="14" y1="5" x2="14" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          <button className={styles.navBtn} onClick={goToNext} disabled={currentIndex === questions.length - 1} aria-label="次の問題">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 5L13 10L7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="6" y1="5" x2="6" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
