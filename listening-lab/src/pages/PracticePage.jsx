import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import AudioPlayer from '../components/AudioPlayer';
import MiniAudioPlayer from '../components/MiniAudioPlayer';
import QuestionCard from '../components/QuestionCard';
import ScoreBanner from '../components/ScoreBanner';
import FocusedPracticeView from '../components/FocusedPracticeView';
import useAudioPlayer from '../hooks/useAudioPlayer';
import useHistory from '../hooks/useHistory';
import { getExamColor } from '../utils/examConfig';
import { getExamSet } from '../data/registry';
import styles from './PracticePage.module.css';

export default function PracticePage() {
  const { examType, examId, sectionId } = useParams();
  const navigate = useNavigate();
  const accent = getExamColor(examType);
  const examSet = getExamSet(examId);
  const { saveRecord } = useHistory();

  // Build questions list
  const { questions, sectionAudio, sectionTitle, instructionAudio } = useMemo(() => {
    if (!examSet) return { questions: [], sectionAudio: null, sectionTitle: '', instructionAudio: null };

    let qs;
    let secAudio = null;
    let secTitle = '';
    let instrAudio = null;

    if (sectionId === 'all') {
      qs = examSet.sections.flatMap((s) =>
        (s.questions || []).map((q, qi) => ({
          ...q,
          id: `${s.id}_${q.id}`,
          _sectionTitle: qi === 0 ? s.title : null,
        }))
      );
      secTitle = '全問通し演習';
    } else {
      const section = examSet.sections.find((s) => s.id === sectionId);
      if (!section) return { questions: [], sectionAudio: null, sectionTitle: '', instructionAudio: null };
      qs = section.questions || [];
      secAudio = section.audioFile || section.audio || null;
      secTitle = section.title || '';
      instrAudio = section.instructionAudio || null;
    }

    return { questions: qs, sectionAudio: secAudio, sectionTitle: secTitle, instructionAudio: instrAudio };
  }, [examSet, sectionId]);

  // Section-level audio player (only used when section has a single audio file)
  const audio = useAudioPlayer(sectionAudio);

  // Track which passageAudio labels have been shown (to avoid duplicates)
  const passageAudioShown = useMemo(() => {
    const seen = new Set();
    return questions.map((q) => {
      if (q.passageAudio && !seen.has(q.passageAudio)) {
        seen.add(q.passageAudio);
        return true;
      }
      return false;
    });
  }, [questions]);

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [focusedMode, setFocusedMode] = useState(false);
  const [showOnlyWrong, setShowOnlyWrong] = useState(false);
  const questionRefs = useRef({});

  const handleAnswer = useCallback((questionId, choice) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: choice }));
  }, [submitted]);

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  const scrollToFirstUnanswered = useCallback(() => {
    const first = questions.find((q) => !answers[q.id]);
    if (first && questionRefs.current[first.id]) {
      questionRefs.current[first.id].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [questions, answers]);

  const handleSubmit = useCallback(() => {
    if (!allAnswered) {
      scrollToFirstUnanswered();
      return;
    }
    setSubmitted(true);

    const correct = questions.filter((q) => answers[q.id] === q.answer).length;
    const total = questions.length;
    const recordKey = `${examId}__${sectionId}`;
    saveRecord(recordKey, { correct, total });
  }, [allAnswered, questions, answers, examId, sectionId, saveRecord, scrollToFirstUnanswered]);

  const score = useMemo(() => {
    if (!submitted) return null;
    const correct = questions.filter((q) => answers[q.id] === q.answer).length;
    return { correct, total: questions.length };
  }, [submitted, questions, answers]);

  const resetAudio = audio.reset;
  const handleRetry = useCallback(() => {
    setAnswers({});
    setSubmitted(false);
    setShowOnlyWrong(false);
    resetAudio();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [resetAudio]);

  if (!examSet) {
    return (
      <div className={styles.page}>
        <Header onBack={() => navigate(`/${examType}`)} accentColor={accent} />
        <div className={styles.empty}>試験データが見つかりません</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className={styles.page}>
        <Header onBack={() => navigate(`/${examType}/${examId}`)} accentColor={accent} />
        <div className={styles.empty}>問題が見つかりません</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header
        onBack={() => navigate(`/${examType}/${examId}`)}
        accentColor={accent}
      />

      <div className={styles.content}>
        {/* Section title */}
        {sectionTitle && (
          <h2 className={styles.sectionTitle}>{examSet.meta.title} — {sectionTitle}</h2>
        )}

        {/* Instruction audio (e.g. Eiken part explanations) */}
        {instructionAudio && (
          <div className={styles.audioSection}>
            <MiniAudioPlayer
              src={instructionAudio}
              label="説明音声"
              accentColor={accent}
            />
          </div>
        )}

        {/* Section-level audio player (when section has a single audio) */}
        {sectionAudio && (
          <div className={styles.audioSection}>
            <AudioPlayer
              src={sectionAudio}
              accentColor={accent}
              audio={audio}
            />
          </div>
        )}

        {/* Progress indicator + Focus mode toggle */}
        {!submitted && (
          <div className={styles.progressBar}>
            <div className={styles.progressInfo}>
              <span>{Object.keys(answers).length} / {questions.length} 回答済み</span>
              <button
                className={styles.focusToggle}
                onClick={() => setFocusedMode(true)}
                style={{ '--accent': accent }}
                aria-label="1問ずつ表示"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                  <rect x="2" y="9" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" opacity="0.3"/>
                </svg>
                1問ずつ
              </button>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${(Object.keys(answers).length / questions.length) * 100}%`,
                  background: accent,
                }}
              />
            </div>
          </div>
        )}

        {/* Wrong-answer filter toggle */}
        {submitted && score && score.correct < score.total && (
          <div className={styles.filterRow}>
            <button
              className={`${styles.filterToggle} ${showOnlyWrong ? styles.filterActive : ''}`}
              style={{ '--accent': accent }}
              onClick={() => setShowOnlyWrong((v) => !v)}
            >
              {showOnlyWrong
                ? `全問表示（${questions.length}問）`
                : `間違えた問題のみ（${score.total - score.correct}問）`
              }
            </button>
          </div>
        )}

        {/* Questions */}
        <div className={styles.questions}>
          {questions.map((q, i) => {
            if (showOnlyWrong && submitted && answers[q.id] === q.answer) return null;
            return (
              <div key={q.id} ref={(el) => { questionRefs.current[q.id] = el; }}>
                {q._sectionTitle && (
                  <h3 className={styles.sectionDivider} style={{ borderColor: accent }}>
                    {q._sectionTitle}
                  </h3>
                )}
                <QuestionCard
                  question={q}
                  userAnswer={answers[q.id] || null}
                  showResult={submitted}
                  onAnswer={(choice) => handleAnswer(q.id, choice)}
                  accentColor={accent}
                  showPassageAudio={passageAudioShown[i]}
                />
              </div>
            );
          })}
        </div>

        {/* Submit button */}
        {!submitted && (
          <div className={styles.submitRow}>
            <button
              className={styles.submitButton}
              style={{ '--accent': accent }}
              onClick={handleSubmit}
            >
              {allAnswered
                ? `解答する（${questions.length}問）`
                : `未回答あり（${Object.keys(answers).length}/${questions.length}）`
              }
            </button>
          </div>
        )}

        {/* Results */}
        {submitted && score && (
          <div className={styles.resultSection}>
            <ScoreBanner correct={score.correct} total={score.total} />

            <div className={styles.resultActions}>
              <button
                className={styles.retryButton}
                style={{ '--accent': accent }}
                onClick={handleRetry}
              >
                もう一度
              </button>
              <button
                className={styles.focusReviewButton}
                style={{ '--accent': accent }}
                onClick={() => setFocusedMode(true)}
              >
                1問ずつ復習する
              </button>
              <button
                className={styles.backButton}
                onClick={() => navigate(`/${examType}/${examId}`)}
              >
                セクション選択に戻る
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Focused mode overlay */}
      {focusedMode && (
        <FocusedPracticeView
          questions={questions}
          answers={answers}
          submitted={submitted}
          onAnswer={handleAnswer}
          onClose={() => setFocusedMode(false)}
          accentColor={accent}
          sectionTitle={sectionTitle}
          examTitle={examSet?.meta?.title}
        />
      )}
    </div>
  );
}
