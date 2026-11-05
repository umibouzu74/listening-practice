import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import InterviewCard from '../components/InterviewCard';
import InterviewReview from '../components/InterviewReview';
import SelfScore from '../components/SelfScore';
import useQuestionAudio from '../hooks/useQuestionAudio';
import useRecorder from '../hooks/useRecorder';
import useWakeLock from '../hooks/useWakeLock';
import { getExamColor, INTERVIEW_CONFIG } from '../utils/examConfig';
import { formatTime } from '../utils/audio';
import { buildExamStages, checkpointsFor, getInterviewSteps, runCue } from '../utils/interview';
import { maxScoreOf, recordExamFinished, setExamScore, totalScore } from '../utils/interviewHistory';
import { cancelSpeech, isSpeechSupported, primeVoices, unlockSpeech } from '../utils/speech';
import styles from './InterviewExamPage.module.css';

// 進行状態
//   index: ステージ番号（-1 = 開始前）
//   sub:   'intro' | 'cue'（面接官が話している）| 'active'（受験者の番）
//          | 'replay'（質問の聞き直し）| 'review'（振り返り）
//   activeSince: 受験者の番が始まった時刻（ms）
const INITIAL = { index: -1, sub: 'intro', activeSince: 0 };

function reducer(state, action) {
  switch (action.type) {
    case 'start':
      return { index: 0, sub: 'cue', activeSince: 0 };
    case 'cueDone':
      if (state.sub === 'cue') return { ...state, sub: 'active', activeSince: action.at };
      if (state.sub === 'replay') return { ...state, sub: 'active' }; // 経過時間はそのまま
      return state;
    case 'replay':
      return state.sub === 'active' ? { ...state, sub: 'replay' } : state;
    case 'next':
      // タイマーとボタンが同時に押された場合などに二重に進まないよう、元のステージを確認する
      if (action.from !== state.index) return state;
      return state.index + 1 >= action.total
        ? { index: action.total, sub: 'review', activeSince: 0 }
        : { index: state.index + 1, sub: 'cue', activeSince: 0 };
    case 'reset':
      return INITIAL;
    default:
      return state;
  }
}

const MIC_MESSAGES = {
  unsupported: 'このブラウザは録音に対応していません。録音なしで、タイマーと流れだけ練習できます。',
  denied: 'マイクの使用が許可されていません。ブラウザの設定でマイクを許可するか、録音なしで練習できます。',
  error: 'マイクを使えませんでした。録音なしで、タイマーと流れだけ練習できます。',
};

export default function InterviewExamPage({ examSet, section }) {
  const { examType, examId } = useParams();
  const navigate = useNavigate();
  const accent = getExamColor(examType);
  const stages = useMemo(() => buildExamStages(section), [section]);
  const progressStages = useMemo(() => stages.filter((s) => s.kind !== 'closing'), [stages]);
  const steps = useMemo(() => getInterviewSteps(section), [section]);

  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [now, setNow] = useState(0);
  const [recordings, setRecordings] = useState({});
  // 読み上げ・音声が使えず、質問文を画面に出したステージ
  const [textFallback, setTextFallback] = useState({});
  // 振り返りでの自己採点（この回の分）と、履歴に保存した回の ID
  const [scores, setScores] = useState({});
  const [examRunId, setExamRunId] = useState(null);

  const recorder = useRecorder();
  const {
    start: startRecording, stop: stopRecording, pause: pauseRecording,
    resume: resumeRecording, release: releaseMic, discardAll,
  } = recorder;

  const stage = state.index >= 0 ? stages[state.index] : null;
  const speaking = state.sub === 'cue' || state.sub === 'replay';
  const inProgress = state.index >= 0 && state.sub !== 'review';

  // 質問の音声ファイル（あるときだけ）。useAudioPlayer で再生し、終わったら次へ
  const cueSegments = stage && speaking ? (state.sub === 'replay' ? stage.replay : stage.cue) : null;
  const cueAudioSrc = cueSegments?.find((s) => s.audio)?.audio || null;
  const { playFile, stop: stopQuestionAudio } = useQuestionAudio(cueAudioSrc);

  useWakeLock(inProgress);

  useEffect(() => {
    primeVoices();
    return () => cancelSpeech();
  }, []);

  // 面接官のパート（決まり文句と質問）を順に流し、終わったら受験者の番にする
  const cueKey = speaking ? `${state.index}:${state.sub}` : null;
  useEffect(() => {
    if (!cueKey) return;
    const current = stages[state.index];
    const isReplay = state.sub === 'replay';
    let cancelled = false;

    (async () => {
      // 質問を聞き直している間は録音しない
      if (isReplay) pauseRecording();
      const result = await runCue(isReplay ? current.replay : current.cue, {
        playFile,
        isCancelled: () => cancelled,
      });
      if (!result) return;
      if (!result.questionVoiced) setTextFallback((prev) => ({ ...prev, [current.id]: true }));

      if (current.kind === 'closing') {
        releaseMic();
        setExamRunId(recordExamFinished(examId, section.id));
        dispatch({ type: 'next', from: state.index, total: stages.length });
        return;
      }
      if (isReplay) resumeRecording();
      else if (current.record) startRecording();
      dispatch({ type: 'cueDone', at: Date.now() });
    })();

    return () => {
      cancelled = true;
      cancelSpeech();
      stopQuestionAudio();
    };
  }, [cueKey, stages, state.index, state.sub, playFile, stopQuestionAudio, startRecording, pauseRecording, resumeRecording, releaseMic, examId, section.id]);

  // 受験者の番を終えて次のステージへ（録音していれば止めて保存する）
  const finishingRef = useRef(false);
  const finishActive = useCallback(async () => {
    const from = state.index;
    const current = stages[from];
    if (!current || finishingRef.current) return;
    finishingRef.current = true;
    if (current.record) {
      const result = await stopRecording();
      if (result) setRecordings((prev) => ({ ...prev, [current.id]: result }));
    }
    finishingRef.current = false;
    dispatch({ type: 'next', from, total: stages.length });
  }, [state.index, stages, stopRecording]);

  // タイマー（黙読・ナレーションは時間切れで自動的に次へ）
  const deadline = stage?.seconds && state.sub === 'active' ? state.activeSince + stage.seconds * 1000 : 0;
  const ticking = state.sub === 'active' || state.sub === 'replay';
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (deadline && t >= deadline) finishActive();
    }, 250);
    return () => clearInterval(id);
  }, [ticking, deadline, finishActive]);

  // 進行中にタブを閉じようとしたら確認する
  useEffect(() => {
    if (!inProgress) return;
    const onBeforeUnload = (e) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [inProgress]);

  const begin = () => {
    setRecordings({});
    setTextFallback({});
    setScores({});
    setExamRunId(null);
    dispatch({ type: 'start' });
  };

  const handleScore = (q, score) => {
    setScores((prev) => {
      const next = { ...prev };
      if (typeof score === 'number') next[q.id] = score;
      else delete next[q.id];
      return next;
    });
    if (examRunId) setExamScore(examId, section.id, examRunId, q.id, score, steps);
  };

  const handleStart = async () => {
    unlockSpeech(); // クリックの中で読み上げを有効にしておく（iPhone 対策）
    if (await recorder.prepare()) begin();
  };

  const handleStartWithoutMic = () => {
    unlockSpeech();
    begin();
  };

  const handleRestart = () => {
    discardAll();
    setRecordings({});
    setTextFallback({});
    setScores({});
    setExamRunId(null);
    dispatch({ type: 'reset' });
  };

  const handleBack = () => {
    if (inProgress && !window.confirm('本番形式を中断しますか？ここまでの録音は保存されません。')) return;
    navigate(`/${examType}/${examId}`);
  };

  const headerTitle = (
    <h2 className={styles.title}>
      本番形式
      <span className={styles.titleSub}>
        {[examSet.meta.title, examSet.meta.subtitle, section.title].filter(Boolean).join(' ')}
      </span>
    </h2>
  );

  // --- 振り返り ---
  if (state.sub === 'review') {
    const total = totalScore(scores, steps);
    const maxTotal = steps.reduce((sum, q) => sum + maxScoreOf(q), 0);
    const scoredCount = steps.filter((q) => typeof scores[q.id] === 'number').length;
    return (
      <div className={styles.page} style={{ '--accent': accent }}>
        <Header onBack={handleBack} accentColor={accent} />
        <div className={styles.content}>
          {headerTitle}
          <div className={styles.reviewIntro}>
            <p className={styles.reviewHeading}>お疲れさまでした。振り返りましょう</p>
            <p>
              自分の録音を聞き、模範解答・解説と比べながら自己採点してみましょう。録音はこの端末のメモリ上にだけあり、
              画面を離れると消えます（自己採点は端末に保存されます）。
            </p>
          </div>
          <div className={styles.totalBox}>
            <span>自己採点の合計</span>
            <strong>
              {total ?? '–'} <small>/ {maxTotal}</small>
            </strong>
            <span className={styles.totalNote}>
              {total === null ? `採点済み ${scoredCount}/${steps.length}` : 'アティチュード（3点）は含みません'}
            </span>
          </div>
          <InterviewCard card={section.card} title={section.title} />
          <div className={styles.reviewList}>
            <InterviewReview
              section={section}
              recordings={recordings}
              accentColor={accent}
              renderExtra={(q) => (
                <SelfScore
                  max={maxScoreOf(q)}
                  value={scores[q.id] ?? null}
                  onChange={(score) => handleScore(q, score)}
                  checkpoints={checkpointsFor(q)}
                  accentColor={accent}
                />
              )}
            />
          </div>
          <div className={styles.footerButtons}>
            <button className={styles.primaryButton} onClick={handleRestart}>
              もう一度本番形式で
            </button>
            <button className={styles.secondaryButton} onClick={() => navigate(`/${examType}/${examId}`)}>
              カード一覧に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 開始前 ---
  if (state.sub === 'intro') {
    const micMessage = MIC_MESSAGES[recorder.status];
    const canRecord = recorder.status !== 'unsupported';
    return (
      <div className={styles.page} style={{ '--accent': accent }}>
        <Header onBack={handleBack} accentColor={accent} />
        <div className={styles.content}>
          {headerTitle}
          <div className={styles.intro}>
            <ul className={styles.rules}>
              <li>
                面接官の指示に従い、<strong>黙読1分 → ナレーション2分 → No.1 → No.2〜4</strong>
                の順に本番と同じ流れで進みます
              </li>
              <li>面接官の質問は音声で流れ、画面には表示されません</li>
              <li>質問が終わると録音が始まります。答え終わったら「回答を終える」を押してください</li>
              <li>No.1 のあとはカードを伏せ、No.2〜4 はカードを見ずに答えます</li>
              <li>録音はこの端末の中だけで扱い、どこにも送信・保存しません</li>
            </ul>
            {!isSpeechSupported() && (
              <p className={styles.notice}>
                このブラウザは英文の読み上げに対応していないため、質問は文字で表示します。
              </p>
            )}
            {micMessage && <p className={styles.notice}>{micMessage}</p>}
            <div className={styles.introButtons}>
              {canRecord && recorder.status !== 'denied' && recorder.status !== 'error' && (
                <button
                  className={styles.primaryButton}
                  onClick={handleStart}
                  disabled={recorder.status === 'requesting'}
                >
                  {recorder.status === 'requesting' ? 'マイクの許可を待っています…' : '開始する（マイクを使います）'}
                </button>
              )}
              {micMessage && (
                <button className={styles.primaryButton} onClick={handleStartWithoutMic}>
                  録音なしで始める
                </button>
              )}
              {(recorder.status === 'denied' || recorder.status === 'error') && (
                <button className={styles.secondaryButton} onClick={handleStart}>
                  もう一度マイクを試す
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 進行中 ---
  const activeMs = Math.max(0, now - state.activeSince);
  const remaining = deadline ? Math.min(stage.seconds, Math.max(0, (deadline - now) / 1000)) : 0;
  const elapsed = state.sub === 'cue' ? 0 : activeMs / 1000;
  const overTarget = stage?.kind === 'qa' && elapsed > stage.target;
  const lowTime = stage?.kind === 'narration' && state.sub === 'active' && remaining <= INTERVIEW_CONFIG.narrationWarnSeconds;
  const showTimer = state.sub !== 'cue' && stage?.kind !== 'closing';

  let timerText = '';
  if (stage?.kind === 'prep' || stage?.kind === 'narration') timerText = `残り ${formatTime(Math.ceil(remaining))}`;
  else if (stage?.kind === 'qa') timerText = `${formatTime(elapsed)} / 目安 ${formatTime(stage.target)}`;

  const recState = recorder.isRecording
    ? recorder.isPaused ? 'paused' : 'on'
    : recorder.isReady ? 'idle' : 'none';

  return (
    <div className={styles.page} style={{ '--accent': accent }}>
      <Header onBack={handleBack} accentColor={accent} />
      <div className={styles.content}>
        {headerTitle}

        <div className={styles.status}>
          <ol className={styles.steps} aria-label="進行状況">
            {progressStages.map((s, i) => (
              <li
                key={s.id}
                className={`${styles.stepDot} ${i < state.index ? styles.stepDone : ''} ${i === state.index ? styles.stepCurrent : ''}`}
              >
                {s.label}
              </li>
            ))}
          </ol>
          {showTimer && (
            <span className={`${styles.timer} ${overTarget || lowTime ? styles.timerWarn : ''}`}>
              {timerText}
            </span>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead} role="status">
            <span className={styles.stageLabel}>{stage?.label}</span>
            {stage?.record && recState === 'on' && <span className={styles.recOn}>● 録音中</span>}
            {stage?.record && recState === 'paused' && <span className={styles.recPaused}>録音一時停止</span>}
            {stage?.record && recState === 'none' && <span className={styles.recNone}>録音なし</span>}
          </div>

          {speaking ? (
            <p className={styles.speaking}>
              <span className={styles.speakerIcon} aria-hidden="true" />
              {stage?.kind === 'qa' ? '面接官が質問しています…' : '面接官が話しています…'}
            </p>
          ) : (
            <p className={styles.guide}>
              {stage?.kind === 'prep' && 'カードを黙読して、ナレーションの準備をしましょう。'}
              {stage?.kind === 'narration' && 'カードの最初の一文から、4コマのストーリーを話してください。'}
              {stage?.kind === 'qa' && '質問に答えてください。答え終わったら「回答を終える」を押します。'}
            </p>
          )}

          {stage?.kind === 'qa' && textFallback[stage.id] && (
            <div className={styles.fallbackPrompt}>
              <span>読み上げが使えないため、質問を表示しています</span>
              <p lang="en">{stage.question.prompt}</p>
            </div>
          )}

          {state.sub === 'active' && (
            <div className={styles.actions}>
              {stage?.kind === 'prep' && (
                <button className={styles.secondaryButton} onClick={finishActive}>
                  準備を終えてナレーションへ
                </button>
              )}
              {stage?.kind === 'narration' && (
                <button className={styles.primaryButton} onClick={finishActive}>
                  ナレーションを終える
                </button>
              )}
              {stage?.kind === 'qa' && (
                <>
                  <button className={styles.primaryButton} onClick={finishActive}>
                    回答を終える
                  </button>
                  <button className={styles.secondaryButton} onClick={() => dispatch({ type: 'replay' })}>
                    質問をもう一度聞く
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <InterviewCard card={section.card} title={section.title} hidden={!stage?.showCard} />
      </div>
    </div>
  );
}
