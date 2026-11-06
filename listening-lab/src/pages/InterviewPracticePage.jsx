import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import InterviewCard from '../components/InterviewCard';
import { InterviewReviewStep } from '../components/InterviewReview';
import SelfScore from '../components/SelfScore';
import usePreference from '../hooks/usePreference';
import useQuestionAudio from '../hooks/useQuestionAudio';
import useRecorder from '../hooks/useRecorder';
import useWakeLock from '../hooks/useWakeLock';
import { getExamColor, INTERVIEW_CONFIG } from '../utils/examConfig';
import { formatTime } from '../utils/audio';
import {
  answerTargetSeconds, checkpointsFor, getInterviewSteps, hasInterviewAudio, narrationStartSegment,
  questionSegment, runCue, stepLabel,
} from '../utils/interview';
import {
  getInterviewRecord, maxScoreOf, recordPracticeAttempt, setPracticeScore,
} from '../utils/interviewHistory';
import { cancelSpeech, isSpeechSupported, primeVoices, unlockSpeech } from '../utils/speech';
import styles from './InterviewPracticePage.module.css';

const MIC_NOTES = {
  unsupported: 'このブラウザは録音に対応していないため、録音なしで練習します。',
  denied: 'マイクが許可されていないため、録音なしで練習します（ブラウザの設定で許可できます）。',
  error: 'マイクを使えなかったため、録音なしで練習します。',
};

/**
 * 面接の練習形式。ナレーション・No.1〜4 を1つずつ選び、何度でもやり直せる。
 * 1回ごとに「面接官の指示・質問 → 録音して答える → 振り返り・自己採点」の順に進む。
 */
export default function InterviewPracticePage({ examSet, section }) {
  const { examType, examId } = useParams();
  const navigate = useNavigate();
  const accent = getExamColor(examType);
  const steps = useMemo(() => getInterviewSteps(section), [section]);

  const [stepIndex, setStepIndex] = useState(0);
  // 'idle'（待機・振り返り）| 'cue'（面接官が話している）| 'answer'（回答中）| 'replay'（質問の聞き直し）
  const [phase, setPhase] = useState('idle');
  const [attemptNo, setAttemptNo] = useState(0);
  const [activeSince, setActiveSince] = useState(0);
  const [now, setNow] = useState(0);
  const [recordings, setRecordings] = useState({});
  const [attempts, setAttempts] = useState({});
  const [scores, setScores] = useState({});
  const [modelShown, setModelShown] = useState({});
  const [textFallback, setTextFallback] = useState({});
  const [cardPeek, setCardPeek] = useState(false);
  // 前回までに保存した練習の自己採点（表示用。開いた時点のものを使う）
  const [savedRecord] = useState(() => getInterviewRecord(examId, section.id));
  const [showPrompt, setShowPrompt] = usePreference('interviewShowPrompt', true);
  const [showTranslation, setShowTranslation] = usePreference('interviewShowTranslation', false);

  const recorder = useRecorder();
  const {
    start: startRecording, stop: stopRecording, pause: pauseRecording,
    resume: resumeRecording, release: releaseMic, discard,
  } = recorder;

  const q = steps[stepIndex];
  const isNarration = q.type === 'narration';
  const busy = phase !== 'idle';
  const speaking = phase === 'cue' || phase === 'replay';

  const cueSegments = useMemo(() => {
    if (isNarration) return [narrationStartSegment(section)];
    return [questionSegment(q)];
  }, [q, isNarration, section]);
  const { playFile, stop: stopQuestionAudio, unlock: unlockAudio } = useQuestionAudio();

  useWakeLock(busy);

  useEffect(() => {
    primeVoices();
    return () => cancelSpeech();
  }, []);

  // 面接官の指示・質問を流し、終わったら録音して回答を待つ
  const cueKey = speaking ? `${stepIndex}:${phase}:${attemptNo}` : null;
  useEffect(() => {
    if (!cueKey) return;
    const isReplay = phase === 'replay';
    const stepId = q.id;
    let cancelled = false;
    (async () => {
      if (isReplay) pauseRecording();
      const result = await runCue(cueSegments, { playFile, isCancelled: () => cancelled });
      if (!result) return;
      if (!result.questionVoiced) setTextFallback((prev) => ({ ...prev, [stepId]: true }));
      if (isReplay) {
        resumeRecording();
      } else {
        startRecording();
        setActiveSince(Date.now());
      }
      setPhase('answer');
    })();
    return () => {
      cancelled = true;
      cancelSpeech();
      stopQuestionAudio();
    };
  }, [cueKey, phase, q.id, cueSegments, playFile, stopQuestionAudio, startRecording, pauseRecording, resumeRecording]);

  // 回答を終える（ナレーションは2分で自動的に終わる）
  const finishingRef = useRef(false);
  const finishAttempt = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const stepId = q.id;
    const result = await stopRecording();
    releaseMic();
    if (result) {
      discard(recordings[stepId]?.url);
      setRecordings((prev) => ({ ...prev, [stepId]: result }));
    }
    recordPracticeAttempt(examId, section.id);
    setAttempts((prev) => ({ ...prev, [stepId]: (prev[stepId] || 0) + 1 }));
    // やり直したら自己採点もつけ直す
    setScores((prev) => {
      const next = { ...prev };
      delete next[stepId];
      return next;
    });
    finishingRef.current = false;
    setPhase('idle');
  }, [q.id, stopRecording, releaseMic, discard, recordings, examId, section.id]);

  const deadline = isNarration && phase === 'answer' ? activeSince + INTERVIEW_CONFIG.narrationSeconds * 1000 : 0;
  const ticking = phase === 'answer' || phase === 'replay';
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (deadline && t >= deadline) finishAttempt();
    }, 250);
    return () => clearInterval(id);
  }, [ticking, deadline, finishAttempt]);

  // 回答中にタブを閉じようとしたら確認する
  useEffect(() => {
    if (!busy) return;
    const onBeforeUnload = (e) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [busy]);

  const startAttempt = async () => {
    if (busy) return;
    // クリックの中で音声と読み上げを有効にしておく（iPhone 対策）
    unlockAudio();
    unlockSpeech();
    if (recorder.status !== 'unsupported') await recorder.prepare();
    setAttemptNo((n) => n + 1);
    setPhase('cue');
  };

  const goToStep = (i) => {
    if (busy || i < 0 || i >= steps.length) return;
    setStepIndex(i);
    setCardPeek(false);
  };

  const handleScore = (score) => {
    setScores((prev) => ({ ...prev, [q.id]: score }));
    setPracticeScore(examId, section.id, q.id, score);
  };

  const handleBack = () => {
    if (busy && !window.confirm('回答の途中です。練習を終えてカード一覧に戻りますか？')) return;
    navigate(`/${examType}/${examId}`);
  };

  const elapsed = Math.max(0, now - activeSince) / 1000;
  const target = answerTargetSeconds(q);
  const remaining = deadline ? Math.min(target, Math.max(0, (deadline - now) / 1000)) : 0;
  const timerWarn = isNarration
    ? remaining <= INTERVIEW_CONFIG.narrationWarnSeconds
    : elapsed > target;
  const showCard = isNarration || q.showCard || cardPeek;
  const promptVisible = !isNarration && (showPrompt || textFallback[q.id]);
  const attempted = (attempts[q.id] || 0) > 0;
  const micNote = MIC_NOTES[recorder.status];
  const nextStep = steps[stepIndex + 1];

  return (
    <div className={styles.page} style={{ '--accent': accent }}>
      <Header onBack={handleBack} accentColor={accent} />
      <div className={styles.content}>
        <h2 className={styles.title}>
          練習形式
          <span className={styles.titleSub}>
            {[examSet.meta.title, examSet.meta.subtitle, section.title].filter(Boolean).join(' ')}
          </span>
        </h2>

        <div className={styles.toolbar}>
          <nav className={styles.tabs} aria-label="練習するステップ">
            {steps.map((s, i) => (
              <button
                key={s.id}
                className={`${styles.tab} ${i === stepIndex ? styles.tabOn : ''}`}
                onClick={() => goToStep(i)}
                disabled={busy && i !== stepIndex}
                aria-current={i === stepIndex ? 'step' : undefined}
              >
                {stepLabel(s)}
                {(attempts[s.id] || 0) > 0 && <span className={styles.tabDone} aria-label="練習済み">✓</span>}
              </button>
            ))}
          </nav>
          <div className={styles.toggles}>
            <button
              className={`${styles.toggle} ${showPrompt ? styles.toggleOn : ''}`}
              onClick={() => setShowPrompt((v) => !v)}
              aria-pressed={showPrompt}
            >
              質問文
            </button>
            <button
              className={`${styles.toggle} ${showTranslation ? styles.toggleOn : ''}`}
              onClick={() => setShowTranslation((v) => !v)}
              aria-pressed={showTranslation}
            >
              和訳
            </button>
          </div>
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.stepLabel}>{stepLabel(q)}</span>
            <span className={styles.stepNote}>
              {isNarration
                ? '最初の一文から、2分以内で4コマを説明します'
                : q.showCard
                  ? 'カードを見て答えます'
                  : 'カードを伏せて答えます'}
            </span>
            {busy && (
              <span className={`${styles.timer} ${timerWarn && !speaking ? styles.timerWarn : ''}`}>
                {phase === 'cue'
                  ? ''
                  : isNarration
                    ? `残り ${formatTime(Math.ceil(remaining))}`
                    : `${formatTime(elapsed)} / 目安 ${formatTime(target)}`}
              </span>
            )}
          </div>

          {promptVisible && (
            <div className={styles.prompt}>
              <p lang="en">{q.prompt}</p>
              {showTranslation && q.promptJa && <p className={styles.promptJa}>{q.promptJa}</p>}
            </div>
          )}
          {!isNarration && !promptVisible && showTranslation && q.promptJa && (
            <div className={styles.prompt}>
              <p className={styles.promptJa}>{q.promptJa}</p>
            </div>
          )}

          {speaking && (
            <p className={styles.speaking}>
              <span className={styles.speakerIcon} aria-hidden="true" />
              {isNarration ? '面接官が話しています…' : '面接官が質問しています…'}
            </p>
          )}

          {phase === 'answer' && (
            <p className={styles.recLine} role="status">
              {recorder.isRecording ? (
                <span className={styles.recOn}>● 録音中</span>
              ) : (
                <span className={styles.recNone}>録音なし</span>
              )}
              {isNarration ? '話し終えたら「ナレーションを終える」を押します。' : '答え終わったら「回答を終える」を押します。'}
            </p>
          )}

          {phase === 'idle' && (
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={startAttempt}>
                {attempted ? 'もう一度やる' : isNarration ? 'ナレーションを始める' : '質問を聞いて答える'}
              </button>
              {micNote && <p className={styles.notice}>{micNote}</p>}
              {!q.audio && !isSpeechSupported() && !isNarration && (
                <p className={styles.notice}>このブラウザは読み上げに対応していないため、質問を文字で表示します。</p>
              )}
              {!hasInterviewAudio(section) && (
                <p className={styles.notice}>この回には面接官の音声がないため、ブラウザの読み上げで流します。</p>
              )}
            </div>
          )}

          {phase === 'answer' && (
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={finishAttempt}>
                {isNarration ? 'ナレーションを終える' : '回答を終える'}
              </button>
              {!isNarration && (
                <button className={styles.secondaryButton} onClick={() => setPhase('replay')}>
                  質問をもう一度聞く
                </button>
              )}
            </div>
          )}
        </section>

        {/* 回答し終えたら、振り返り（録音・模範解答・自己採点）をすぐ下に出す */}
        {!busy && (attempted || modelShown[q.id]) && (
          <div className={styles.review}>
            <InterviewReviewStep question={q} card={section.card} recording={recordings[q.id]} accentColor={accent}>
              {attempted && (
                <SelfScore
                  key={`${q.id}:${attempts[q.id]}`}
                  max={maxScoreOf(q)}
                  value={scores[q.id] ?? null}
                  onChange={handleScore}
                  checkpoints={checkpointsFor(q)}
                  previous={savedRecord?.practiceScores?.[q.id]?.score}
                  accentColor={accent}
                />
              )}
            </InterviewReviewStep>
          </div>
        )}

        {showCard ? (
          <InterviewCard card={section.card} title={section.title} />
        ) : (
          <div className={styles.cardHidden}>
            <InterviewCard card={section.card} title={section.title} hidden />
            <button className={styles.linkButton} onClick={() => setCardPeek(true)}>
              カードを見る（本番では見られません）
            </button>
          </div>
        )}

        {!busy && !attempted && !modelShown[q.id] && (
          <button
            className={styles.linkButton}
            onClick={() => setModelShown((prev) => ({ ...prev, [q.id]: true }))}
          >
            先に模範解答・解説を見る
          </button>
        )}

        {!busy && nextStep && (
          <button className={styles.secondaryButton} onClick={() => goToStep(stepIndex + 1)}>
            次へ：{stepLabel(nextStep)}
          </button>
        )}
        {!busy && !nextStep && (
          <button className={styles.secondaryButton} onClick={() => navigate(`/${examType}/${examId}`)}>
            カード一覧に戻る
          </button>
        )}
      </div>
    </div>
  );
}
