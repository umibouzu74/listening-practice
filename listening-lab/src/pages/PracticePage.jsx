import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import AudioPlayer from '../components/AudioPlayer';
import MiniAudioPlayer from '../components/MiniAudioPlayer';
import QuestionCard from '../components/QuestionCard';
import PassageGroup from '../components/PassageGroup';
import ScoreBanner from '../components/ScoreBanner';
import FocusedPracticeView from '../components/FocusedPracticeView';
import useAudioPlayer from '../hooks/useAudioPlayer';
import usePreference from '../hooks/usePreference';
import { getExamColor } from '../utils/examConfig';
import {
  recordKey, getRecord, saveResult, updateWrong,
  loadProgress, saveProgress, clearProgress,
} from '../utils/history';
import styles from './PracticePage.module.css';

const EMPTY = { questions: [], sectionAudio: null, sectionTitle: '', instructionAudio: null, nextSection: null };

/** 演習対象の問題リストを組み立てる */
function buildPractice(examSet, sectionId, wrongIds) {
  if (!examSet) return EMPTY;
  let result;

  if (sectionId === 'all') {
    result = {
      ...EMPTY,
      sectionTitle: '全問通し演習',
      questions: examSet.sections.flatMap((s) =>
        (s.questions || []).map((q) => ({
          ...q,
          id: `${s.id}_${q.id}`,
          _sectionId: s.id,
          _sectionTitle: s.title,
          _localId: q.id,
        }))
      ),
    };
  } else {
    const idx = examSet.sections.findIndex((s) => s.id === sectionId);
    const section = examSet.sections[idx];
    if (!section) return EMPTY;
    result = {
      questions: (section.questions || []).map((q) => ({
        ...q,
        _sectionId: section.id,
        _sectionTitle: section.title,
        _localId: q.id,
      })),
      sectionAudio: section.audioFile || section.audio || null,
      sectionTitle: section.title || '',
      instructionAudio: section.instructionAudio || null,
      nextSection: examSet.sections[idx + 1] || null,
    };
  }

  if (wrongIds) {
    const set = new Set(wrongIds);
    result.questions = result.questions.filter((q) => set.has(q.id));
    result.sectionTitle += '（間違えた問題）';
    result.nextSection = null;
  }

  // 全問通しでは各セクションの最初の問題の前に見出しを出す
  if (sectionId === 'all') {
    let prev = null;
    result.questions = result.questions.map((q) => {
      const showDivider = q._sectionId !== prev;
      prev = q._sectionId;
      return { ...q, _divider: showDivider ? q._sectionTitle : null };
    });
  }
  return result;
}

/** 同じ本文（passageAudio）を共有する連続した設問をグループにまとめる */
function buildRenderItems(questions) {
  const items = [];
  let group = null;
  questions.forEach((q, index) => {
    if (q.passageAudio && q.audio) {
      if (group && group.passageAudio === q.passageAudio) {
        group.questions.push(q);
      } else {
        group = { type: 'passageGroup', passageAudio: q.passageAudio, passageLabel: q.passageLabel, questions: [q] };
        items.push(group);
      }
    } else {
      group = null;
      items.push({ type: 'question', question: q, index });
    }
  });
  return items;
}

export default function PracticePage({ examSet }) {
  const { examType, examId, sectionId } = useParams();
  const [searchParams] = useSearchParams();
  const reviewWrong = searchParams.get('mode') === 'wrong';
  const navigate = useNavigate();
  const fromExam = Boolean(useLocation().state?.fromExam);
  const accent = getExamColor(examType);
  const historyKey = recordKey(examId, sectionId);
  const progressKey = reviewWrong ? `${historyKey}:wrong` : historyKey;
  const backToSections = () => navigate(`/${examType}/${examId}`);

  // ページ表示時点の「前回間違えた問題」で固定する
  const [wrongIds] = useState(() => (reviewWrong ? getRecord(historyKey)?.lastWrong ?? [] : null));
  const { questions, sectionAudio, sectionTitle, instructionAudio, nextSection } = useMemo(
    () => buildPractice(examSet, sectionId, wrongIds),
    [examSet, sectionId, wrongIds]
  );
  const renderItems = useMemo(() => buildRenderItems(questions), [questions]);

  // passageAudio はあるが設問音声がない問題では、本文プレイヤーを最初の1問にだけ出す
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

  const sectionPlayer = useAudioPlayer(sectionAudio);

  // 解答途中の状態はタブを閉じるまで保持（戻る操作で消えないように）
  const [restored] = useState(() => loadProgress(progressKey));
  const [answers, setAnswers] = useState(() => restored?.answers ?? {});
  const [checkedQuestions, setCheckedQuestions] = useState(() => new Set(restored?.checked ?? []));
  const [showRestoredNotice, setShowRestoredNotice] = useState(Boolean(restored));
  const [focus, setFocus] = useState(null); // { questions, initialIndex } | null
  const [showOnlyWrong, setShowOnlyWrong] = useState(false);
  const [hidePrompt, setHidePrompt] = usePreference('hidePrompt', true);
  const questionRefs = useRef({});
  const savedRef = useRef(false);

  const registerRef = useCallback((id, el) => {
    if (el) questionRefs.current[id] = el;
    else delete questionRefs.current[id];
  }, []);

  const handleAnswer = useCallback((questionId, choice) => {
    if (checkedQuestions.has(questionId)) return;
    setAnswers((prev) => ({ ...prev, [questionId]: choice }));
  }, [checkedQuestions]);

  const handleCheckQuestion = useCallback((questionId) => {
    if (!answers[questionId]) return;
    setCheckedQuestions((prev) => new Set(prev).add(questionId));
  }, [answers]);

  const handleCheckAll = useCallback(() => {
    setCheckedQuestions((prev) => {
      const next = new Set(prev);
      questions.forEach((q) => answers[q.id] && next.add(q.id));
      return next;
    });
  }, [questions, answers]);

  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const checkedCount = questions.filter((q) => checkedQuestions.has(q.id)).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const allChecked = questions.length > 0 && checkedCount === questions.length;
  const uncheckedAnsweredCount = answeredCount - questions.filter((q) => answers[q.id] && checkedQuestions.has(q.id)).length;

  const wrongQuestions = useMemo(
    () => (allChecked ? questions.filter((q) => answers[q.id] !== q.answer) : []),
    [allChecked, questions, answers]
  );
  const score = allChecked ? { correct: questions.length - wrongQuestions.length, total: questions.length } : null;

  // 途中経過の保存
  useEffect(() => {
    if (!allChecked) saveProgress(progressKey, answers, checkedQuestions);
  }, [allChecked, progressKey, answers, checkedQuestions]);

  // 全問答え合わせしたら履歴に保存
  useEffect(() => {
    if (!allChecked || savedRef.current || !examSet) return;
    savedRef.current = true;
    clearProgress(progressKey);

    const wrongIdsNow = wrongQuestions.map((q) => q.id);
    if (reviewWrong) {
      updateWrong(historyKey, wrongIdsNow);
      return;
    }
    saveResult(historyKey, {
      correct: questions.length - wrongQuestions.length,
      total: questions.length,
      wrongIds: wrongIdsNow,
    });
    // 全問通しの結果は各セクションの履歴にも反映する
    if (sectionId === 'all') {
      for (const s of examSet.sections) {
        const qs = questions.filter((q) => q._sectionId === s.id);
        if (qs.length === 0) continue;
        const wrong = qs.filter((q) => answers[q.id] !== q.answer);
        saveResult(recordKey(examId, s.id), {
          correct: qs.length - wrong.length,
          total: qs.length,
          wrongIds: wrong.map((q) => q._localId),
        });
      }
    }
  }, [allChecked, examSet, examId, sectionId, historyKey, progressKey, reviewWrong, questions, answers, wrongQuestions]);

  const scrollToQuestion = useCallback((id) => {
    questionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const scrollToFirstUnanswered = useCallback(() => {
    const first = questions.find((q) => !answers[q.id]);
    if (first) scrollToQuestion(first.id);
  }, [questions, answers, scrollToQuestion]);

  const resetSectionAudio = sectionPlayer.reset;
  const handleRetry = useCallback(() => {
    setAnswers({});
    setCheckedQuestions(new Set());
    setShowOnlyWrong(false);
    setShowRestoredNotice(false);
    savedRef.current = false;
    clearProgress(progressKey);
    resetSectionAudio();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [resetSectionAudio, progressKey]);

  const openFocus = useCallback((mode) => {
    if (mode === 'review') {
      const list = showOnlyWrong ? wrongQuestions : questions;
      const firstWrong = list.findIndex((q) => answers[q.id] !== q.answer);
      setFocus({ questions: list, initialIndex: Math.max(firstWrong, 0) });
    } else {
      const firstOpen = questions.findIndex((q) => !checkedQuestions.has(q.id));
      setFocus({ questions, initialIndex: Math.max(firstOpen, 0) });
    }
  }, [showOnlyWrong, wrongQuestions, questions, answers, checkedQuestions]);

  if (questions.length === 0) {
    return (
      <div className={styles.page}>
        <Header onBack={backToSections} accentColor={accent} />
        <div className={styles.empty}>
          {reviewWrong ? '解き直す問題はありません。全問正解です！' : '問題が見つかりません'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header onBack={backToSections} accentColor={accent} />

      <div className={styles.content}>
        <h2 className={styles.sectionTitle}>
          {examSet.meta.title}
          {examSet.meta.subtitle && ` ${examSet.meta.subtitle}`} — {sectionTitle}
        </h2>

        {showRestoredNotice && !allChecked && (
          <div className={styles.notice}>
            <span>前回の続きから再開しました</span>
            <button className={styles.noticeAction} onClick={handleRetry}>最初から</button>
            <button className={styles.noticeClose} onClick={() => setShowRestoredNotice(false)} aria-label="閉じる">×</button>
          </div>
        )}

        {instructionAudio && (
          <div className={styles.audioSection}>
            <MiniAudioPlayer src={instructionAudio} label="説明音声" accentColor={accent} />
          </div>
        )}

        {sectionAudio && (
          <div className={styles.audioSection}>
            <AudioPlayer audio={sectionPlayer} accentColor={accent} />
          </div>
        )}

        {!allChecked && (
          <div className={styles.progressBar}>
            <div className={styles.progressInfo}>
              <span>
                {checkedCount > 0
                  ? `${checkedCount} / ${questions.length} 確認済み`
                  : `${answeredCount} / ${questions.length} 解答済み`}
              </span>
              <span className={styles.progressTools}>
                <button
                  className={`${styles.focusToggle} ${hidePrompt ? styles.toggleOn : ''}`}
                  onClick={() => setHidePrompt((v) => !v)}
                  style={{ '--accent': accent }}
                  aria-pressed={hidePrompt}
                  title="本番と同じく、音声で読まれる設問文を答え合わせまで隠します"
                >
                  設問を隠す
                </button>
                <button
                  className={styles.focusToggle}
                  onClick={() => openFocus('practice')}
                  style={{ '--accent': accent }}
                >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="2" y="3" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="2" y="9" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" opacity="0.3" />
                </svg>
                  1問ずつ
                </button>
              </span>
            </div>
            <div className={styles.progressTrack}>
              {checkedCount > 0 && (
                <div
                  className={styles.progressFillChecked}
                  style={{ width: `${(checkedCount / questions.length) * 100}%` }}
                />
              )}
              <div
                className={styles.progressFill}
                style={{ width: `${(answeredCount / questions.length) * 100}%`, background: accent }}
              />
            </div>
          </div>
        )}

        {score && score.correct < score.total && (
          <div className={styles.filterRow}>
            <button
              className={`${styles.filterToggle} ${showOnlyWrong ? styles.filterActive : ''}`}
              style={{ '--accent': accent }}
              onClick={() => setShowOnlyWrong((v) => !v)}
              aria-pressed={showOnlyWrong}
            >
              {showOnlyWrong
                ? `全問表示（${questions.length}問）`
                : `間違えた問題のみ表示（${wrongQuestions.length}問）`}
            </button>
          </div>
        )}

        <div className={styles.questions}>
          {renderItems.map((item) => {
            if (item.type === 'passageGroup') {
              return (
                <div key={item.passageAudio}>
                  {item.questions[0]._divider && (
                    <h3 className={styles.sectionDivider} style={{ borderColor: accent }}>
                      {item.questions[0]._divider}
                    </h3>
                  )}
                  <PassageGroup
                    passageAudio={item.passageAudio}
                    passageLabel={item.passageLabel}
                    questions={item.questions}
                    answers={answers}
                    checkedQuestions={checkedQuestions}
                    onAnswer={handleAnswer}
                    onCheck={handleCheckQuestion}
                    accentColor={accent}
                    registerRef={registerRef}
                    showOnlyWrong={showOnlyWrong}
                    hidePrompt={hidePrompt}
                  />
                </div>
              );
            }

            const q = item.question;
            const isChecked = checkedQuestions.has(q.id);
            if (showOnlyWrong && isChecked && answers[q.id] === q.answer) return null;
            return (
              <div key={q.id} ref={(el) => registerRef(q.id, el)}>
                {q._divider && (
                  <h3 className={styles.sectionDivider} style={{ borderColor: accent }}>
                    {q._divider}
                  </h3>
                )}
                <QuestionCard
                  question={q}
                  userAnswer={answers[q.id] || null}
                  showResult={isChecked}
                  onAnswer={(choice) => handleAnswer(q.id, choice)}
                  onCheck={() => handleCheckQuestion(q.id)}
                  accentColor={accent}
                  showPassageAudio={passageAudioShown[item.index]}
                  hidePrompt={hidePrompt}
                />
              </div>
            );
          })}
        </div>

        {!allChecked && (
          <div className={styles.submitRow}>
            {uncheckedAnsweredCount > 0 && (
              <button
                className={styles.submitButton}
                style={{ '--accent': accent }}
                onClick={handleCheckAll}
              >
                {allAnswered
                  ? `まとめて答え合わせ（${questions.length}問）`
                  : `解答済みをまとめて確認（${uncheckedAnsweredCount}問）`}
              </button>
            )}
            {!allAnswered && (
              <button
                className={`${styles.submitButton} ${styles.submitButtonSecondary}`}
                style={{ '--accent': accent }}
                onClick={scrollToFirstUnanswered}
              >
                未解答の問題へ（{answeredCount}/{questions.length}）
              </button>
            )}
          </div>
        )}

        {score && (
          <div className={styles.resultSection}>
            {fromExam && <p className={styles.resultLabel}>本番モードの結果</p>}
            <ScoreBanner correct={score.correct} total={score.total} />

            <div className={styles.resultActions}>
              {nextSection && (
                <button
                  className={styles.primaryButton}
                  style={{ '--accent': accent }}
                  onClick={() => navigate(`/${examType}/${examId}/${nextSection.id}`)}
                >
                  次へ: {nextSection.title}
                </button>
              )}
              {wrongQuestions.length > 0 && (
                <button
                  className={styles.outlineButton}
                  style={{ '--accent': accent }}
                  onClick={() => navigate(`/${examType}/${examId}/${sectionId}?mode=wrong`)}
                >
                  間違えた{wrongQuestions.length}問を解き直す
                </button>
              )}
              <button
                className={styles.outlineButton}
                style={{ '--accent': accent }}
                onClick={() => openFocus('review')}
              >
                1問ずつ復習する
              </button>
              <button className={styles.ghostButton} onClick={handleRetry}>
                もう一度（全{questions.length}問）
              </button>
              <button className={styles.ghostButton} onClick={backToSections}>
                セクション選択に戻る
              </button>
            </div>
          </div>
        )}
      </div>

      {focus && (
        <FocusedPracticeView
          questions={focus.questions}
          initialIndex={focus.initialIndex}
          answers={answers}
          checkedQuestions={checkedQuestions}
          onAnswer={handleAnswer}
          onCheck={handleCheckQuestion}
          onClose={() => setFocus(null)}
          accentColor={accent}
          sectionTitle={sectionTitle}
          examTitle={[examSet.meta.title, examSet.meta.subtitle].filter(Boolean).join(' ')}
          hidePrompt={hidePrompt}
        />
      )}
    </div>
  );
}
