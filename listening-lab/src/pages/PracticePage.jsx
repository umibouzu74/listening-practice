import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import AudioPlayer from '../components/AudioPlayer';
import QuestionCard from '../components/QuestionCard';
import ScoreBanner from '../components/ScoreBanner';
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
  const { questions, audioSrc } = useMemo(() => {
    if (!examSet) return { questions: [], audioSrc: null };

    let qs;
    let src = null;

    if (sectionId === 'all') {
      qs = examSet.sections.flatMap((s) =>
        (s.questions || []).map((q) => ({ ...q, id: `${s.id}_${q.id}` }))
      );
    } else {
      const section = examSet.sections.find((s) => s.id === sectionId);
      if (!section) return { questions: [], audioSrc: null };
      qs = section.questions || [];
      src = section.audio || null;
    }

    // Use the first question's audio as default if no section-level audio
    if (!src && qs.length > 0 && qs[0].audio) {
      src = qs[0].audio;
    }

    return { questions: qs, audioSrc: src };
  }, [examSet, sectionId]);

  const audio = useAudioPlayer(audioSrc);

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleAnswer = useCallback((questionId, choice) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: choice }));
  }, [submitted]);

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  const handleSubmit = useCallback(() => {
    if (!allAnswered) return;
    setSubmitted(true);

    const correct = questions.filter((q) => answers[q.id] === q.answer).length;
    const total = questions.length;
    const recordKey = `${examId}__${sectionId}`;
    saveRecord(recordKey, { correct, total });
  }, [allAnswered, questions, answers, examId, sectionId, saveRecord]);

  const score = useMemo(() => {
    if (!submitted) return null;
    const correct = questions.filter((q) => answers[q.id] === q.answer).length;
    return { correct, total: questions.length };
  }, [submitted, questions, answers]);

  const resetAudio = audio.reset;
  const handleRetry = useCallback(() => {
    setAnswers({});
    setSubmitted(false);
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
        {/* Audio player */}
        {audioSrc && (
          <div className={styles.audioSection}>
            <AudioPlayer
              src={audioSrc}
              accentColor={accent}
              audio={audio}
            />
          </div>
        )}

        {/* Questions */}
        <div className={styles.questions}>
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              userAnswer={answers[q.id] || null}
              showResult={submitted}
              onAnswer={(choice) => handleAnswer(q.id, choice)}
              accentColor={accent}
            />
          ))}
        </div>

        {/* Submit button */}
        {!submitted && (
          <div className={styles.submitRow}>
            <button
              className={styles.submitButton}
              style={{ '--accent': accent }}
              onClick={handleSubmit}
              disabled={!allAnswered}
            >
              解答する
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
                className={styles.backButton}
                onClick={() => navigate(`/${examType}/${examId}`)}
              >
                セクション選択に戻る
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
