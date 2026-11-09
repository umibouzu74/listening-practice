import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import InterviewCard from '../components/InterviewCard';
import InterviewReview, { RecordingField } from '../components/InterviewReview';
import ReadAloud from '../components/ReadAloud';
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
  buildExamStages, checkpointsFor, getInterviewSteps, groupStages, hasInterviewAudio, recordingFileName, runCue,
  stepLabel,
} from '../utils/interview';
import {
  ATTITUDE_ID, examScoreParts, maxScoreOf, maxTotalOf, recordExamFinished, setExamScore, totalScore,
} from '../utils/interviewHistory';
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

const FINISH_LABELS = {
  prep: '準備を終える',
  narration: 'ナレーションを終える',
  qa: '回答を終える',
  talk: '答えた（次へ）',
};

const ATTITUDE_PART = { id: ATTITUDE_ID, label: 'アティチュード' };

function partAnchor(id) {
  return `review-${id}`;
}

export default function InterviewExamPage({ examSet, section }) {
  const { examType, examId } = useParams();
  const navigate = useNavigate();
  const accent = getExamColor(examType);
  // 「入室・退室も通す」（開始するときの設定で進行表を作る）
  const [withTalk, setWithTalk] = usePreference('interviewExamTalk', false);
  const [runWithTalk, setRunWithTalk] = useState(withTalk);
  const stages = useMemo(() => buildExamStages(section, { withTalk: runWithTalk }), [section, runWithTalk]);
  const stageGroups = useMemo(() => groupStages(stages), [stages]);
  const steps = useMemo(() => getInterviewSteps(section), [section]);
  const scoreParts = useMemo(() => examScoreParts(steps), [steps]);
  const talkStages = useMemo(() => stages.filter((s) => s.kind === 'talk'), [stages]);

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
  const [confirmDialog, confirm] = useConfirm();

  const stage = state.index >= 0 ? stages[state.index] : null;
  const speaking = state.sub === 'cue' || state.sub === 'replay';
  const inProgress = state.index >= 0 && state.sub !== 'review';

  const { playFile, stop: stopQuestionAudio, unlock: unlockAudio } = useQuestionAudio();
  const hasAudio = hasInterviewAudio(section);

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
      if (result) setRecordings((prev) => ({ ...prev, [current.id]: { ...result, at: Date.now() } }));
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

  // 進行中や、振り返りで保存していない録音があるときは、画面を離れる前に確認する
  const unsavedCount = Object.values(recordings).filter((r) => !r.saved).length;
  const recordingsLostMessage = (
    <>
      <p>保存していない録音が {unsavedCount} 件あります。録音はこの端末のメモリ上にだけあり、画面を離れると消えます（自己採点は保存されています）。</p>
      <p>残したい録音は、各パートの「録音を保存」で端末に保存できます。</p>
    </>
  );
  useLeaveGuard(inProgress || unsavedCount > 0, () =>
    confirm(
      inProgress
        ? {
            title: '本番形式を中断しますか？',
            message: 'ここで画面を離れると、ここまでの録音は残りません。',
            confirmLabel: '中断して離れる',
            cancelLabel: '続ける',
            danger: true,
          }
        : {
            title: '録音が消えます',
            message: recordingsLostMessage,
            confirmLabel: '消して離れる',
            cancelLabel: 'この画面に残る',
            danger: true,
          }
    )
  );

  const begin = () => {
    setRecordings({});
    setTextFallback({});
    setScores({});
    setExamRunId(null);
    setRunWithTalk(withTalk);
    dispatch({ type: 'start' });
  };

  const handleScore = (partId, score) => {
    setScores((prev) => {
      const next = { ...prev };
      if (typeof score === 'number') next[partId] = score;
      else delete next[partId];
      return next;
    });
    if (examRunId) setExamScore(examId, section.id, examRunId, partId, score, scoreParts);
  };

  const handleStart = async () => {
    // クリックの中で音声と読み上げを有効にしておく（iPhone 対策）
    unlockAudio();
    unlockSpeech();
    if (await recorder.prepare()) begin();
  };

  const handleStartWithoutMic = () => {
    unlockAudio();
    unlockSpeech();
    begin();
  };

  const handleRestart = async () => {
    if (unsavedCount > 0) {
      const ok = await confirm({
        title: '録音を消してやり直しますか？',
        message: recordingsLostMessage,
        confirmLabel: '消してやり直す',
        cancelLabel: 'やめる',
        danger: true,
      });
      if (!ok) return;
    }
    discardAll();
    setRecordings({});
    setTextFallback({});
    setScores({});
    setExamRunId(null);
    dispatch({ type: 'reset' });
    window.scrollTo(0, 0);
  };

  const markSaved = (id) => {
    setRecordings((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], saved: true } } : prev));
  };
  const downloadName = (id) =>
    recordings[id]
      ? recordingFileName(examId, section.id, `exam-${id}`, recordings[id].mimeType, new Date(recordings[id].at))
      : undefined;

  // 確認は useLeaveGuard が出す
  const handleBack = () => navigate(`/${examType}/${examId}`);

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
    const total = totalScore(scores, scoreParts);
    const maxTotal = maxTotalOf(scoreParts);
    const scoredCount = scoreParts.filter((p) => typeof scores[p.id] === 'number').length;
    const partBadge = (id, max) => (typeof scores[id] === 'number' ? `採点済み ${scores[id]}/${max}` : '未採点');
    const jumpTo = (id) => {
      const el = document.getElementById(partAnchor(id));
      if (!el) return;
      if (el.tagName === 'DETAILS') el.open = true;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    };
    const jumpItems = [
      ...steps.map((q) => ({ id: q.id, label: stepLabel(q), max: maxScoreOf(q) })),
      { ...ATTITUDE_PART, max: INTERVIEW_CONFIG.maxScores.attitude },
    ];

    return (
      <div className={styles.page} style={{ '--accent': accent }}>
        <Header onBack={handleBack} accentColor={accent} />
        <div className={styles.content}>
          {headerTitle}
          <div className={styles.reviewIntro}>
            <p className={styles.reviewHeading}>お疲れさまでした。振り返りましょう</p>
            <p>
              自分の録音を聞き、模範解答・解説と比べながら自己採点してみましょう。模範解答は「音声で聞く」で読み上げられます。
              録音はこの端末のメモリ上にだけあり、画面を離れると消えます（残したいときは「録音を保存」）。自己採点は端末に保存されます。
            </p>
          </div>
          <div className={styles.totalBox}>
            <div className={styles.totalRow}>
              <span>自己採点の合計</span>
              <strong>
                {total ?? '–'} <small>/ {maxTotal}</small>
              </strong>
              <span className={styles.totalNote}>
                {total === null ? `採点済み ${scoredCount}/${scoreParts.length}` : '本番と同じ配点です'}
              </span>
            </div>
            <p className={styles.totalBreakdown}>
              ナレーション {INTERVIEW_CONFIG.maxScores.narration}点・No.1〜4 各{INTERVIEW_CONFIG.maxScores.qa}点・アティチュード{' '}
              {INTERVIEW_CONFIG.maxScores.attitude}点
            </p>
            <nav className={styles.jumps} aria-label="パートへ移動">
              {jumpItems.map((p) => {
                const scored = typeof scores[p.id] === 'number';
                return (
                  <button key={p.id} type="button" className={`${styles.jump} ${scored ? styles.jumpDone : ''}`} onClick={() => jumpTo(p.id)}>
                    <span>{p.label}</span>
                    <span className={styles.jumpScore}>{scored ? `${scores[p.id]}/${p.max}` : '未採点'}</span>
                  </button>
                );
              })}
              {talkStages.length > 0 && (
                <button type="button" className={styles.jump} onClick={() => jumpTo('talk')}>
                  <span>入室・退室</span>
                </button>
              )}
            </nav>
          </div>
          <InterviewCard card={section.card} title={section.title} />
          <div className={styles.reviewList}>
            <InterviewReview
              section={section}
              recordings={recordings}
              accentColor={accent}
              collapsible
              stepProps={(q) => ({
                id: partAnchor(q.id),
                badge: partBadge(q.id, maxScoreOf(q)),
                downloadName: downloadName(q.id),
                onRecordingSaved: () => markSaved(q.id),
              })}
              renderExtra={(q) => (
                <SelfScore
                  max={maxScoreOf(q)}
                  value={scores[q.id] ?? null}
                  onChange={(score) => handleScore(q.id, score)}
                  checkpoints={checkpointsFor(q)}
                  accentColor={accent}
                />
              )}
            />
            <section className={styles.attitude} id={partAnchor(ATTITUDE_ID)}>
              <h3 className={styles.partTitle}>
                アティチュード
                <span className={styles.partNote}>面接全体を通しての態度</span>
                <span className={styles.badge}>{partBadge(ATTITUDE_ID, INTERVIEW_CONFIG.maxScores.attitude)}</span>
              </h3>
              <p className={styles.partText}>
                本番では、積極的にコミュニケーションをとろうとする態度も 3点満点で採点されます。面接全体を思い出して採点しましょう。
              </p>
              <SelfScore
                title="アティチュード"
                max={INTERVIEW_CONFIG.maxScores.attitude}
                value={scores[ATTITUDE_ID] ?? null}
                onChange={(score) => handleScore(ATTITUDE_ID, score)}
                checkpoints={INTERVIEW_CONFIG.checkpoints.attitude}
                accentColor={accent}
              />
            </section>
            {talkStages.length > 0 && (
              <details className={styles.talkReview} id={partAnchor('talk')} open>
                <summary className={styles.talkSummary}>
                  <span className={styles.partTitle}>入室・退室のやりとり</span>
                  <span className={styles.partNote}>採点はしません</span>
                </summary>
                <div className={styles.talkList}>
                  {talkStages.map((t) => (
                    <div key={t.id} className={styles.talkItem}>
                      <p className={styles.talkLabel}>{t.label}</p>
                      <p className={styles.talkPrompt} lang="en">
                        <span className={styles.talkWho}>面接官</span>
                        {t.prompt}
                      </p>
                      <div className={styles.talkExample}>
                        <span className={styles.talkWho}>答え方の例</span>
                        <ReadAloud text={t.example} />
                      </div>
                      <RecordingField
                        recording={recordings[t.id]}
                        accentColor={accent}
                        downloadName={downloadName(t.id)}
                        onSaved={() => markSaved(t.id)}
                      />
                    </div>
                  ))}
                </div>
              </details>
            )}
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
        {confirmDialog}
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
              <li>
                {hasAudio
                  ? '面接官の質問は録音音声で流れ、画面には表示されません'
                  : '面接官の質問はブラウザの合成音声で流れ、画面には表示されません（この回には面接官の録音音声がありません）'}
              </li>
              <li>質問が終わると録音が始まります。答え終わったら「回答を終える」を押してください</li>
              <li>No.1 のあとはカードを伏せ、No.2〜4 はカードを見ずに答えます</li>
              <li>録音はこの端末の中だけで扱い、どこにも送信しません（振り返りで端末に保存できます）</li>
            </ul>
            <div className={styles.option}>
              <ToggleSwitch checked={withTalk} onChange={setWithTalk} label="入室・退室のやりとりも通す" />
              <p className={styles.optionNote}>
                黙読の前に、入室・名前・簡単な会話を（面接官は合成音声）、No.4 のあとに退室のやりとりを入れます
              </p>
            </div>
            {!isSpeechSupported() && (!hasAudio || withTalk) && (
              <p className={styles.notice}>
                このブラウザは英文の読み上げに対応していないため、合成音声の部分は文字で表示します。
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
        {confirmDialog}
      </div>
    );
  }

  // --- 進行中 ---
  const activeMs = Math.max(0, now - state.activeSince);
  const remaining = deadline ? Math.min(stage.seconds, Math.max(0, (deadline - now) / 1000)) : 0;
  const elapsed = state.sub === 'cue' ? 0 : activeMs / 1000;
  const overTarget = (stage?.kind === 'qa' || stage?.kind === 'talk') && elapsed > stage.target;
  const lowTime = stage?.kind === 'narration' && state.sub === 'active' && remaining <= INTERVIEW_CONFIG.narrationWarnSeconds;
  const showTimer = state.sub !== 'cue' && stage?.kind !== 'closing';

  let timerText = '';
  if (stage?.kind === 'prep' || stage?.kind === 'narration') timerText = `残り ${formatTime(Math.ceil(remaining))}`;
  else if (stage?.kind === 'qa' || stage?.kind === 'talk') timerText = `${formatTime(elapsed)} / 目安 ${formatTime(stage.target)}`;

  const recState = recorder.isRecording
    ? recorder.isPaused ? 'paused' : 'on'
    : recorder.isReady ? 'idle' : 'none';

  const finishLabel = FINISH_LABELS[stage?.kind];
  // タイマーと「終える」ボタン。進行状況のバー（ヘッダーの下に固定）と、絵の拡大表示の上部に出す
  const timerControls = (
    <>
      {showTimer && (
        <span className={`${styles.timer} ${overTarget || lowTime ? styles.timerWarn : ''}`} role="timer">
          {timerText}
        </span>
      )}
      {state.sub === 'active' && finishLabel && (
        <button type="button" className={styles.barButton} onClick={finishActive}>
          {finishLabel}
        </button>
      )}
    </>
  );

  return (
    <div className={styles.page} style={{ '--accent': accent }}>
      <Header onBack={handleBack} accentColor={accent} />
      <div className={styles.content}>
        {headerTitle}

        <div className={styles.status}>
          <ol className={styles.steps} aria-label="進行状況">
            {stageGroups.map((g) => (
              <li
                key={`${g.label}-${g.first}`}
                className={`${styles.stepDot} ${state.index > g.last ? styles.stepDone : ''} ${state.index >= g.first && state.index <= g.last ? styles.stepCurrent : ''}`}
              >
                {g.label}
              </li>
            ))}
          </ol>
          <div className={styles.statusControls}>{timerControls}</div>
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
              {stage?.kind === 'talk' && '面接官に答えてください。答えたら「答えた（次へ）」を押します。'}
            </p>
          )}

          {stage?.kind === 'talk' && state.sub === 'active' && (
            <p className={styles.talkHint}>
              答え方の例: <span lang="en">{stage.example}</span>
            </p>
          )}

          {(stage?.kind === 'qa' || stage?.kind === 'talk') && textFallback[stage.id] && (
            <div className={styles.fallbackPrompt}>
              <span>音声を再生できないため、質問を表示しています</span>
              <p lang="en">{stage.prompt}</p>
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
              {(stage?.kind === 'qa' || stage?.kind === 'talk') && (
                <>
                  <button className={styles.primaryButton} onClick={finishActive}>
                    {stage.kind === 'talk' ? '答えた（次へ）' : '回答を終える'}
                  </button>
                  <button className={styles.secondaryButton} onClick={() => dispatch({ type: 'replay' })}>
                    {stage.kind === 'talk' ? 'もう一度聞く' : '質問をもう一度聞く'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <InterviewCard
          card={section.card}
          title={section.title}
          hidden={!stage?.showCard}
          hiddenNote={
            stage?.kind === 'talk' && stage.label === '入室'
              ? '問題カードは、入室のやりとりのあとに渡されます。'
              : stage?.kind === 'talk' ? '問題カードは面接官に返します。' : undefined
          }
          viewerStatus={timerControls}
        />
      </div>
      {confirmDialog}
    </div>
  );
}
