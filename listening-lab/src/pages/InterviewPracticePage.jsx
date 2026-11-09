import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import InterviewCard from '../components/InterviewCard';
import { InterviewReviewStep } from '../components/InterviewReview';
import PhraseHints from '../components/PhraseHints';
import SegmentedControl from '../components/SegmentedControl';
import SelfScore from '../components/SelfScore';
import ToggleSwitch from '../components/ToggleSwitch';
import useConfirm from '../hooks/useConfirm';
import useLeaveGuard from '../hooks/useLeaveGuard';
import usePreference from '../hooks/usePreference';
import useQuestionAudio from '../hooks/useQuestionAudio';
import useRecorder from '../hooks/useRecorder';
import useWakeLock from '../hooks/useWakeLock';
import { getExamColor, INTERVIEW_CONFIG } from '../utils/examConfig';
import { formatTime } from '../utils/audio';
import {
  answerTargetSeconds, checkpointsFor, getInterviewSteps, hasInterviewAudio, narrationStartSegment,
  prepSegment, questionSegment, recordingFileName, runCue, stepLabel,
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

// 質問文の表示（No.1〜4）。保存は今までの2つの設定（interviewShowPrompt / interviewShowTranslation）のまま
//   audio: 音声のみ（本番どおり。聞き取れなかったときだけ「質問文を見る」で出す）
//   en: 英文を表示 / en-ja: 英文＋和訳を表示（どちらも面接官が質問し始めてから出す）
const PROMPT_MODES = [
  { value: 'audio', label: '音声のみ' },
  { value: 'en', label: '英文' },
  { value: 'en-ja', label: '英文＋和訳' },
];

/**
 * 面接の練習形式。ナレーション・No.1〜4 を1つずつ選び、何度でもやり直せる。
 * 1回ごとに「（準備1分）→ 面接官の指示・質問 → 録音して答える → 振り返り・自己採点」の順に進む。
 * 「フレーズを表示」をオンにすると、答える前と答えている間に使えるフレーズを出す（まだ話せない人向けのヒント）。
 */
export default function InterviewPracticePage({ examSet, section }) {
  const { examType, examId } = useParams();
  const navigate = useNavigate();
  const accent = getExamColor(examType);
  const steps = useMemo(() => getInterviewSteps(section), [section]);

  const [stepIndex, setStepIndex] = useState(0);
  // 'idle'（待機・振り返り）| 'prepCue'（面接官が黙読の指示をしている）| 'prep'（準備1分）
  // | 'cue'（面接官が話している）| 'answer'（回答中）| 'replay'（質問の聞き直し）
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
  // 「音声のみ」で、聞き取れずに質問文を出した回
  const [promptRevealed, setPromptRevealed] = useState(false);
  // 「フレーズを見ずにもう一度」で始めた回（フレーズをオンにしたままでも、この回だけ隠す）
  const [hintsOff, setHintsOff] = useState(false);
  // 前回までに保存した練習の自己採点（表示用。開いた時点のものを使う）
  const [savedRecord] = useState(() => getInterviewRecord(examId, section.id));
  // 新しく使う人は「音声のみ」から（保存済みの設定があればそれを使う）
  const [showPrompt, setShowPrompt] = usePreference('interviewShowPrompt', false);
  const [showTranslation, setShowTranslation] = usePreference('interviewShowTranslation', false);
  const [showPhrases, setShowPhrases] = usePreference('interviewShowPhrases', false);
  const [narrationPrep, setNarrationPrep] = usePreference('interviewNarrationPrep', false);
  // 英文を出さずに和訳だけ、という以前の組み合わせは「音声のみ」として扱う
  const promptMode = !showPrompt ? 'audio' : showTranslation ? 'en-ja' : 'en';
  const setPromptMode = (mode) => {
    setShowPrompt(mode !== 'audio');
    setShowTranslation(mode === 'en-ja');
  };

  const recorder = useRecorder();
  const {
    start: startRecording, stop: stopRecording, pause: pauseRecording,
    resume: resumeRecording, release: releaseMic, discard,
  } = recorder;
  const [confirmDialog, confirm] = useConfirm();

  const q = steps[stepIndex];
  const isNarration = q.type === 'narration';
  const busy = phase !== 'idle';
  const speaking = phase === 'cue' || phase === 'replay' || phase === 'prepCue';

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

  // 面接官の指示・質問を流し、終わったら録音して回答を待つ（黙読の指示のあとは準備時間）
  const cueKey = speaking ? `${stepIndex}:${phase}:${attemptNo}` : null;
  useEffect(() => {
    if (!cueKey) return;
    const isReplay = phase === 'replay';
    const isPrep = phase === 'prepCue';
    const stepId = q.id;
    let cancelled = false;
    (async () => {
      if (isReplay) pauseRecording();
      const segments = isPrep ? [prepSegment(section)] : cueSegments;
      const result = await runCue(segments, { playFile, isCancelled: () => cancelled });
      if (!result) return;
      if (isPrep) {
        setActiveSince(Date.now());
        setPhase('prep');
        return;
      }
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
  }, [cueKey, phase, q.id, section, cueSegments, playFile, stopQuestionAudio, startRecording, pauseRecording, resumeRecording]);

  // 回答を終える（ナレーションは2分で自動的に終わる）
  // 1回の回答につき1度だけ（タイマーとボタンが重なったり、画面の更新より先にタイマーがもう一度来たりしても）
  const finishedAttemptRef = useRef(0);
  const finishAttempt = useCallback(async () => {
    if (finishedAttemptRef.current === attemptNo) return;
    finishedAttemptRef.current = attemptNo;
    const stepId = q.id;
    const result = await stopRecording();
    releaseMic();
    // 今回録音できなかったときは、前回の録音を今回の分として見せない
    discard(recordings[stepId]?.url);
    setRecordings((prev) => {
      const next = { ...prev };
      if (result) next[stepId] = { ...result, at: Date.now() };
      else delete next[stepId];
      return next;
    });
    recordPracticeAttempt(examId, section.id, stepId);
    setAttempts((prev) => ({ ...prev, [stepId]: (prev[stepId] || 0) + 1 }));
    // やり直したら自己採点もつけ直す
    setScores((prev) => {
      const next = { ...prev };
      delete next[stepId];
      return next;
    });
    setPhase('idle');
  }, [attemptNo, q.id, stopRecording, releaseMic, discard, recordings, examId, section.id]);

  /** 準備時間を終えて、ナレーションの指示へ */
  const endPrep = useCallback(() => {
    setPhase((p) => (p === 'prep' ? 'cue' : p));
  }, []);

  let deadline = 0;
  let limit = 0;
  if (phase === 'prep') {
    limit = INTERVIEW_CONFIG.prepSeconds;
    deadline = activeSince + limit * 1000;
  } else if (isNarration && phase === 'answer') {
    limit = INTERVIEW_CONFIG.narrationSeconds;
    deadline = activeSince + limit * 1000;
  }
  const ticking = phase === 'answer' || phase === 'replay' || phase === 'prep';
  const onDeadline = phase === 'prep' ? endPrep : finishAttempt;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (deadline && t >= deadline) onDeadline();
    }, 250);
    return () => clearInterval(id);
  }, [ticking, deadline, onDeadline]);

  // 回答の途中や、保存していない録音があるときは、画面を離れる前に確認する
  const unsavedCount = Object.values(recordings).filter((r) => !r.saved).length;
  useLeaveGuard(busy || unsavedCount > 0, () =>
    confirm(
      busy
        ? {
            title: '練習を中断しますか？',
            message: '回答の途中です。ここで画面を離れると、この回の録音は残りません。',
            confirmLabel: '中断して離れる',
            cancelLabel: '練習を続ける',
            danger: true,
          }
        : {
            title: '録音が消えます',
            message: (
              <>
                <p>保存していない録音が {unsavedCount} 件あります。画面を離れると録音は消えます（自己採点は保存されています）。</p>
                <p>残したい録音は、振り返りの「録音を保存」で端末に保存できます。</p>
              </>
            ),
            confirmLabel: '消して離れる',
            cancelLabel: 'この画面に残る',
            danger: true,
          }
    )
  );

  const startAttempt = async ({ withoutHints = false } = {}) => {
    if (busy) return;
    // クリックの中で音声と読み上げを有効にしておく（iPhone 対策）
    unlockAudio();
    unlockSpeech();
    setCardPeek(false);
    setPromptRevealed(false);
    setHintsOff(withoutHints);
    if (recorder.status !== 'unsupported') await recorder.prepare();
    setAttemptNo((n) => n + 1);
    setPhase(isNarration && narrationPrep ? 'prepCue' : 'cue');
  };

  const goToStep = (i) => {
    if (busy || i < 0 || i >= steps.length) return;
    setStepIndex(i);
    setCardPeek(false);
    setHintsOff(false);
    setPromptRevealed(false);
    window.scrollTo(0, 0); // ページの下の「次へ」から来ても、開始ボタンが見えるように
  };

  const handleScore = (score) => {
    setScores((prev) => ({ ...prev, [q.id]: score }));
    setPracticeScore(examId, section.id, q.id, score);
  };

  const markSaved = (stepId) => {
    setRecordings((prev) => (prev[stepId] ? { ...prev, [stepId]: { ...prev[stepId], saved: true } } : prev));
  };

  // 確認は useLeaveGuard が出す
  const handleBack = () => navigate(`/${examType}/${examId}`);

  const elapsed = Math.max(0, now - activeSince) / 1000;
  const target = answerTargetSeconds(q);
  const remaining = deadline ? Math.min(limit, Math.max(0, (deadline - now) / 1000)) : 0;
  const answering = phase === 'answer' || phase === 'replay';
  const timerWarn = phase === 'prep'
    ? false
    : isNarration
      ? remaining <= INTERVIEW_CONFIG.narrationWarnSeconds
      : elapsed > target;
  const showCard = isNarration || q.showCard || cardPeek;
  // 質問文: 読み上げられなかったときはいつも、英文表示なら面接官が質問し始めてから、音声のみなら「質問文を見る」を押したら出す
  const promptVisible = !isNarration && (
    textFallback[q.id] ||
    (busy && (promptMode !== 'audio' || promptRevealed))
  );
  const translationVisible = promptVisible && (promptMode === 'en-ja' || promptRevealed);
  const attempted = (attempts[q.id] || 0) > 0;
  const micNote = MIC_NOTES[recorder.status];
  const nextStep = steps[stepIndex + 1];
  const reviewShown = !busy && (attempted || modelShown[q.id]);
  // 振り返りにはこの質問のフレーズが入るので、フレーズのパネルは答える前と回答中だけ出す
  const hints = showPhrases && !reviewShown && !(busy && hintsOff)
    ? <PhraseHints key={q.id} question={q} answering={busy} />
    : null;

  let timerText = '';
  if (phase === 'prep') timerText = `準備 残り ${formatTime(Math.ceil(remaining))}`;
  else if (answering) {
    timerText = isNarration
      ? `残り ${formatTime(Math.ceil(remaining))}`
      : `${formatTime(elapsed)} / 目安 ${formatTime(target)}`;
  }

  let stateText;
  if (speaking) stateText = <span className={styles.stateSpeaking}>面接官</span>;
  else if (phase === 'prep') stateText = <span className={styles.stateMuted}>準備中</span>;
  else if (recorder.isRecording && !recorder.isPaused) stateText = <span className={styles.recOn}>● 録音中</span>;
  else stateText = <span className={styles.stateMuted}>録音なし</span>;

  // 回答中のタイマーと「終える」ボタン。ヘッダーの下に固定し、絵の拡大表示の上部にも出す
  const statusControls = (
    <>
      {stateText}
      {timerText && (
        <span className={`${styles.timer} ${timerWarn && answering ? styles.timerWarn : ''}`} role="timer">
          {timerText}
        </span>
      )}
      {phase === 'answer' && (
        <button type="button" className={styles.barButton} onClick={finishAttempt}>
          {isNarration ? 'ナレーションを終える' : '回答を終える'}
        </button>
      )}
      {phase === 'prep' && (
        <button type="button" className={styles.barButton} onClick={endPrep}>
          準備を終える
        </button>
      )}
    </>
  );

  const card = showCard ? (
    <InterviewCard card={section.card} title={section.title} viewerStatus={busy ? statusControls : null} />
  ) : (
    <div className={styles.cardHidden}>
      <InterviewCard card={section.card} title={section.title} hidden />
      <button className={styles.linkButton} onClick={() => setCardPeek(true)}>
        カードを見る（本番では見られません）
      </button>
    </div>
  );

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

        {/* ヘッダーの下に固定: 待機中はステップの切り替え、回答中はタイマーと「終える」ボタン */}
        <div className={styles.toolbar}>
          {busy ? (
            <div className={styles.statusBar} role="status">
              <span className={styles.statusStep}>{stepLabel(q)}</span>
              {statusControls}
            </div>
          ) : (
            <nav className={styles.tabs} aria-label="練習するステップ">
              {steps.map((s, i) => (
                <button
                  key={s.id}
                  className={`${styles.tab} ${i === stepIndex ? styles.tabOn : ''}`}
                  onClick={() => goToStep(i)}
                  aria-current={i === stepIndex ? 'step' : undefined}
                >
                  {stepLabel(s)}
                  {(attempts[s.id] || 0) > 0 && <span className={styles.tabDone} aria-label="練習済み">✓</span>}
                </button>
              ))}
            </nav>
          )}
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
          </div>

          {phase === 'idle' && (
            <div className={styles.settings}>
              {isNarration ? (
                <ToggleSwitch checked={narrationPrep} onChange={setNarrationPrep} label="準備時間1分をとる" />
              ) : (
                <SegmentedControl label="質問文" options={PROMPT_MODES} value={promptMode} onChange={setPromptMode} />
              )}
              <ToggleSwitch checked={showPhrases} onChange={setShowPhrases} label="フレーズを表示" />
              {!isNarration && (
                <p className={styles.settingNote}>
                  {promptMode === 'audio'
                    ? '本番と同じく、質問は音声だけで聞き取ります（聞き取れなかったときは回答中に表示できます）'
                    : '面接官が質問し始めたら、画面に質問文を出します'}
                </p>
              )}
            </div>
          )}

          {promptVisible && (
            <div className={styles.prompt}>
              {textFallback[q.id] && <span className={styles.promptNote}>音声を再生できないため、質問を表示しています</span>}
              <p lang="en">{q.prompt}</p>
              {translationVisible && q.promptJa && <p className={styles.promptJa}>{q.promptJa}</p>}
            </div>
          )}

          {speaking && (
            <p className={styles.speaking}>
              <span className={styles.speakerIcon} aria-hidden="true" />
              {phase === 'prepCue' || isNarration ? '面接官が話しています…' : '面接官が質問しています…'}
            </p>
          )}

          {phase === 'prep' && (
            <p className={styles.recLine}>
              黙読の時間です。カードを見て、ナレーションの準備をしましょう（録音はまだしません）。
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
              <button
                className={styles.primaryButton}
                onClick={() => startAttempt()}
                disabled={recorder.status === 'requesting'}
              >
                {recorder.status === 'requesting'
                  ? 'マイクの許可を待っています…'
                  : attempted
                    ? 'もう一度やる'
                    : isNarration
                      ? narrationPrep ? '準備1分から始める' : 'ナレーションを始める'
                      : '質問を聞いて答える'}
              </button>
              {attempted && showPhrases && (
                <button
                  className={styles.secondaryButton}
                  onClick={() => startAttempt({ withoutHints: true })}
                  disabled={recorder.status === 'requesting'}
                >
                  フレーズを見ずにもう一度
                </button>
              )}
              {micNote && <p className={styles.notice}>{micNote}</p>}
              {!q.audio && !isSpeechSupported() && !isNarration && (
                <p className={styles.notice}>このブラウザは読み上げに対応していないため、質問を文字で表示します。</p>
              )}
              {!hasInterviewAudio(section) && (
                <p className={styles.notice}>この回には面接官の録音音声がないため、ブラウザの合成音声で流します。</p>
              )}
            </div>
          )}

          {phase === 'prep' && (
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={endPrep}>
                準備を終えてナレーションへ
              </button>
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
              {!isNarration && !promptVisible && (
                <button className={styles.linkButton} onClick={() => setPromptRevealed(true)}>
                  聞き取れなかったときは：質問文を見る
                </button>
              )}
            </div>
          )}
        </section>

        {/* 回答し終えたら、振り返り（録音・模範解答・自己採点）をすぐ下に出す */}
        {reviewShown && (
          <div className={styles.review}>
            <InterviewReviewStep
              question={q}
              card={section.card}
              recording={recordings[q.id]}
              accentColor={accent}
              downloadName={
                recordings[q.id]
                  ? recordingFileName(examId, section.id, q.id, recordings[q.id].mimeType, new Date(recordings[q.id].at))
                  : undefined
              }
              onRecordingSaved={() => markSaved(q.id)}
            >
              {recordings[q.id] && !recordings[q.id].saved && (
                <p className={styles.recordingNote}>
                  録音はこの画面を離れると消えます。残したいときは「録音を保存」で端末に保存してください。
                </p>
              )}
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

        {/* 問題カードは操作パネルのすぐ下に。カードを伏せている No.2〜4 は、フレーズを先に出す */}
        {showCard ? (
          <>
            {card}
            {hints}
          </>
        ) : (
          <>
            {hints}
            {card}
          </>
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
      {confirmDialog}
    </div>
  );
}
