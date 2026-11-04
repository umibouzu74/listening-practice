import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import QuestionBody from '../components/QuestionBody';
import { PlayIcon, PauseIcon } from '../components/AudioIcons';
import useAudioPlayer from '../hooks/useAudioPlayer';
import useWakeLock from '../hooks/useWakeLock';
import { getExamColor } from '../utils/examConfig';
import { formatTime } from '../utils/audio';
import { recordKey, saveProgress } from '../utils/history';
import styles from './ExamModePage.module.css';

/**
 * 放送順のプレイリストを作る: 説明 → (本文) → 各設問 …
 * 英検の音声ファイルには解答時間（約10秒の無音）が含まれているので、そのまま連続再生する。
 * 問題IDは練習モード（PracticePage）と同じ規則にそろえ、採点結果を引き継げるようにする。
 */
function buildExam(examSet, sectionId) {
  const sections = sectionId === 'all'
    ? examSet.sections
    : examSet.sections.filter((s) => s.id === sectionId);
  const items = [];
  const questions = [];
  const groupOf = {}; // questionId -> 同じ本文を共有する設問ID群

  for (const s of sections) {
    if (s.instructionAudio) {
      items.push({ kind: 'instruction', src: s.instructionAudio, sectionTitle: s.title, label: '説明' });
    }
    let group = null;
    for (const q of s.questions || []) {
      const id = sectionId === 'all' ? `${s.id}_${q.id}` : q.id;
      const question = { ...q, id };
      questions.push(question);

      if (q.passageAudio && group?.passageAudio === q.passageAudio) {
        group.ids.push(id);
      } else {
        group = { passageAudio: q.passageAudio || null, ids: [id] };
        if (q.passageAudio) {
          items.push({ kind: 'passage', src: q.passageAudio, sectionTitle: s.title, label: q.passageLabel || '本文', questionId: id });
        }
      }
      groupOf[id] = group.ids;
      if (q.audio) {
        items.push({ kind: 'question', src: q.audio, sectionTitle: s.title, label: `No.${q.number}`, questionId: id });
      }
    }
  }

  // 説明の間は、そのセクション最初の設問を先に見られるようにする
  items.forEach((item, i) => {
    if (!item.questionId) item.questionId = items.slice(i + 1).find((n) => n.questionId)?.questionId;
  });
  return { items, questions, groupOf };
}

const NO_IDS = [];

export default function ExamModePage({ examSet }) {
  const { examType, examId, sectionId } = useParams();
  const navigate = useNavigate();
  const accent = getExamColor(examType);
  const { items, questions, groupOf } = useMemo(() => buildExam(examSet, sectionId), [examSet, sectionId]);
  const sources = useMemo(() => items.map((i) => i.src), [items]);
  const audio = useAudioPlayer(sources);
  const { isPlaying, isEnded, activeIndex, currentTime, duration, toggle, pause } = audio;

  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState({});
  const inProgress = started && !isEnded;
  useWakeLock(isPlaying);

  const current = items[activeIndex];
  const visibleIds = (current?.questionId && groupOf[current.questionId]) || NO_IDS;
  const currentQuestionId = current?.kind === 'question' ? current.questionId : null;
  const answeredCount = questions.filter((q) => answers[q.id]).length;

  const sectionLabel = sectionId === 'all'
    ? '全問'
    : examSet.sections.find((s) => s.id === sectionId)?.title;

  const handleStart = () => {
    setStarted(true);
    toggle();
  };

  const setAnswer = useCallback((id, label) => {
    setAnswers((prev) => ({ ...prev, [id]: label }));
  }, []);

  const finish = useCallback(() => {
    pause();
    // 採点結果の表示は練習モードの画面に任せる（全問「答え合わせ済み」として引き継ぐ）
    saveProgress(recordKey(examId, sectionId), answers, questions.map((q) => q.id));
    navigate(`/${examType}/${examId}/${sectionId}`, { replace: true, state: { fromExam: true } });
  }, [pause, answers, questions, examType, examId, sectionId, navigate]);

  const confirmFinishEarly = () => {
    const rest = questions.length - answeredCount;
    if (window.confirm(`放送の途中ですが採点しますか？${rest > 0 ? `\n未解答の${rest}問は不正解になります。` : ''}`)) finish();
  };

  const handleBack = () => {
    if (inProgress && !window.confirm('本番モードを中断しますか？ここまでの解答は保存されません。')) return;
    navigate(`/${examType}/${examId}`);
  };

  // 放送中にタブを閉じようとしたら確認する
  useEffect(() => {
    if (!inProgress) return;
    const onBeforeUnload = (e) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [inProgress]);

  // キー操作: 1〜4 で放送中の設問に解答、Space で一時停止/再開
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !started) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (!isEnded) toggle();
        return;
      }
      const targetId = currentQuestionId ?? visibleIds[0];
      const q = questions.find((x) => x.id === targetId);
      const choice = /^[1-9]$/.test(e.key) && q?.choices[Number(e.key) - 1];
      if (choice) {
        e.preventDefault();
        setAnswer(q.id, choice.label);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [started, isEnded, toggle, currentQuestionId, visibleIds, questions, setAnswer]);

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className={styles.page} style={{ '--accent': accent }}>
      <Header onBack={handleBack} accentColor={accent} />

      <div className={styles.content}>
        <h2 className={styles.title}>
          本番モード
          <span className={styles.titleSub}>
            {[examSet.meta.title, examSet.meta.subtitle, sectionLabel].filter(Boolean).join(' ')}
          </span>
        </h2>

        {!started ? (
          <div className={styles.intro}>
            <ul className={styles.rules}>
              <li>説明 → 問題の順に、本番と同じく音声が<strong>1回だけ</strong>自動で流れます</li>
              <li>巻き戻し・聞き直しはできません（一時停止のみ可能）</li>
              <li>解答時間は音声に含まれています。流れている問題の選択肢を選んでください</li>
              <li>英検 Part 1・2 の設問文は本番どおり表示されません</li>
              <li>最後に「採点する」で、練習モードと同じ解説・スクリプト付きの結果画面に移ります</li>
            </ul>
            <p className={styles.meta}>
              全{questions.length}問
              {duration > 0 && ` ・ 放送時間 約${Math.round(duration / 60)}分`}
            </p>
            <button className={styles.startButton} onClick={handleStart} disabled={items.length === 0}>
              <PlayIcon size={20} />
              開始する
            </button>
          </div>
        ) : (
          <>
            <div className={styles.status} role="status">
              <div className={styles.statusMain}>
                <span className={styles.statusSection}>{current?.sectionTitle}</span>
                <span className={styles.statusLabel}>
                  {isEnded ? '放送終了' : current?.label}
                </span>
              </div>
              <span className={styles.statusTime}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              {!isEnded && (
                <button
                  className={styles.pauseButton}
                  onClick={toggle}
                  aria-label={isPlaying ? '一時停止' : '再開'}
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
              )}
              <div className={styles.statusTrack}>
                <div className={styles.statusFill} style={{ width: `${progress}%` }} />
              </div>
            </div>

            {isEnded ? (
              <div className={styles.endPanel}>
                <p>放送は終了しました。解答用紙を確認して「採点する」を押してください。</p>
                <button className={styles.startButton} onClick={finish}>
                  採点する（{answeredCount}/{questions.length}問 解答済み）
                </button>
              </div>
            ) : (
              <div className={styles.questions}>
                {visibleIds.map((id) => {
                  const q = questions.find((x) => x.id === id);
                  return (
                    <div
                      key={id}
                      className={`${styles.questionCard} ${id === currentQuestionId ? styles.questionCurrent : ''}`}
                    >
                      <span className={styles.questionNumber}>No.{q.number}</span>
                      <QuestionBody
                        question={q}
                        userAnswer={answers[id] || null}
                        showResult={false}
                        onAnswer={(label) => setAnswer(id, label)}
                        accentColor={accent}
                        hidePrompt
                        examMode
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* 解答用紙（いつでも見直し・変更できる） */}
        <section className={styles.sheet} aria-label="解答用紙">
          <h3 className={styles.sheetTitle}>
            解答用紙 <span>{answeredCount}/{questions.length}</span>
          </h3>
          <div className={styles.sheetGrid}>
            {questions.map((q) => (
              <div
                key={q.id}
                className={`${styles.sheetRow} ${q.id === currentQuestionId ? styles.sheetRowCurrent : ''}`}
              >
                <span className={styles.sheetNo}>{q.number}</span>
                {q.choices.map((c) => (
                  <button
                    key={c.label}
                    className={`${styles.bubble} ${answers[q.id] === c.label ? styles.bubbleOn : ''}`}
                    onClick={() => setAnswer(q.id, c.label)}
                    aria-label={`No.${q.number} 選択肢${c.label}`}
                    aria-pressed={answers[q.id] === c.label}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>

        {started && !isEnded && (
          <button className={styles.finishEarly} onClick={confirmFinishEarly}>
            途中で終了して採点する
          </button>
        )}
      </div>
    </div>
  );
}
