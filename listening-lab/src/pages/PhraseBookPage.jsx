import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PhraseList from '../components/PhraseList';
import ToggleSwitch from '../components/ToggleSwitch';
import usePreference from '../hooks/usePreference';
import useWakeLock from '../hooks/useWakeLock';
import { getExamColor, INTERVIEW_CONFIG } from '../utils/examConfig';
import { PHRASE_BOOK } from '../utils/interviewPhrases';
import { cancelSpeech, isSpeechSupported, primeVoices, speak, unlockSpeech } from '../utils/speech';
import styles from './PhraseBookPage.module.css';

const EXAM_TYPE = 'eiken';

/** まとめての練習で、1つのフレーズを言うために空ける時間（ms）。長いフレーズほど長くする */
function sayingTime(en) {
  const words = en.trim().split(/\s+/).length;
  return 1500 + words * 600;
}

/**
 * 面接の基本フレーズ集（#/eiken/phrases）。どのカードでも使える言い回しを、聞いてまねして覚える。
 * 区分ごとに「続けて練習」で、フレーズを順に流して言う練習ができる。
 *   英語を表示: 音声 → 続けて言う（リピート）
 *   英語を隠す: 日本語を見て言う → 音声で答えを確かめる
 */
export default function PhraseBookPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const accent = getExamColor(EXAM_TYPE);
  const canSpeak = isSpeechSupported();
  const [hideEnglish, setHideEnglish] = usePreference('phraseBookHideEnglish', false);
  // まとめての練習: { sectionId, recall }（recall = 英語を隠して、日本語から言う）
  const [drill, setDrill] = useState(null);
  // 練習中の位置と、その項目の英語を見せているか
  const [drillPos, setDrillPos] = useState({ index: 0, showEnglish: true });
  // 音声を流せずに練習が止まったか
  const [drillFailed, setDrillFailed] = useState(false);

  useWakeLock(!!drill);

  useEffect(() => {
    primeVoices();
    return () => cancelSpeech();
  }, []);

  useEffect(() => {
    if (!drill) return;
    const section = PHRASE_BOOK.sections.find((s) => s.id === drill.sectionId);
    const rate = INTERVIEW_CONFIG.speechRate;
    let cancelled = false;
    let timer = null;
    const wait = (ms) =>
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
      });

    (async () => {
      for (let i = 0; i < section.phrases.length; i++) {
        const { en } = section.phrases[i];
        if (i > 0) setDrillPos({ index: i, showEnglish: !drill.recall });
        if (drill.recall) {
          // 日本語を見て言う時間をとってから、答えを流す
          await wait(sayingTime(en) + 500);
          if (cancelled) return;
          setDrillPos({ index: i, showEnglish: true });
        }
        const ok = await speak(en, { rate });
        if (cancelled) return;
        if (!ok) {
          setDrillFailed(true);
          break;
        }
        // リピートなら言う時間、日本語から言う練習なら答えを確かめる間
        await wait(drill.recall ? 1200 : sayingTime(en));
        if (cancelled) return;
      }
      setDrill(null);
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancelSpeech();
    };
  }, [drill]);

  const startDrill = (sectionId) => {
    // クリックの中で読み上げを有効にしておく（iPhone 対策）
    unlockSpeech();
    setDrillFailed(false);
    setDrillPos({ index: 0, showEnglish: !hideEnglish });
    setDrill({ sectionId, recall: hideEnglish });
  };

  const jumpTo = (id) => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(`phrases-${id}`)?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  };

  // 直接開いたとき（履歴がないとき）は英検の一覧（面接のタブ）へ戻る
  const handleBack = () => (location.key === 'default' ? navigate(`/${EXAM_TYPE}?format=interview`) : navigate(-1));
  const drillSection = drill ? PHRASE_BOOK.sections.find((s) => s.id === drill.sectionId) : null;

  return (
    <div className={`${styles.page} ${drill ? styles.pageDrilling : ''}`} style={{ '--accent': accent }}>
      <Header onBack={handleBack} accentColor={accent} />
      <div className={styles.content}>
        <h2 className={styles.title}>
          {PHRASE_BOOK.title}
          <span className={styles.titleSub}>{PHRASE_BOOK.subtitle}</span>
        </h2>

        <div className={styles.intro}>
          <p>どのカードでも使える言い回しです。まずはここで覚えてから、問題カードの練習に進みましょう。</p>
          <ol className={styles.steps}>
            <li>音声ボタンで聞いて、まねして言う</li>
            <li>「続けて練習」で、音声のあとに続けて言う</li>
            <li>「英語を隠す」をオンにして、日本語を見て英語で言う</li>
          </ol>
          <p>言えるようになったら、問題カードの練習形式で「フレーズを表示」をオンにして答えてみましょう。</p>
          {!canSpeak && <p className={styles.notice}>このブラウザは読み上げに対応していないため、音声は流れません。</p>}
          {drillFailed && (
            <p className={styles.notice} role="alert">
              音声を流せなかったため、練習を止めました。端末の音量やマナーモードを確かめて、もう一度試してください。
            </p>
          )}
        </div>

        <div className={styles.toolbar}>
          <nav className={styles.chips} aria-label="フレーズの区分">
            {PHRASE_BOOK.sections.map((s) => (
              <button key={s.id} type="button" className={styles.chip} onClick={() => jumpTo(s.id)}>
                {s.short}
              </button>
            ))}
          </nav>
          <ToggleSwitch
            className={styles.toggle}
            checked={hideEnglish}
            onChange={setHideEnglish}
            label="英語を隠す"
            disabled={!!drill}
          />
        </div>

        {PHRASE_BOOK.sections.map((s) => {
          const drilling = drill?.sectionId === s.id;
          return (
            <section key={s.id} id={`phrases-${s.id}`} className={styles.section} aria-labelledby={`phrases-${s.id}-title`}>
              <div className={styles.sectionHead}>
                <h3 id={`phrases-${s.id}-title`} className={styles.sectionTitle}>
                  {s.title}
                </h3>
                <p className={styles.sectionNote}>{s.description}</p>
              </div>

              {canSpeak && (
                <div className={styles.drill}>
                  <button
                    type="button"
                    className={`${styles.drillButton} ${drilling ? styles.drillButtonOn : ''}`}
                    onClick={() => (drilling ? setDrill(null) : startDrill(s.id))}
                    disabled={!!drill && !drilling}
                  >
                    {drilling ? '練習を止める' : '続けて練習'}
                  </button>
                  <span className={styles.drillNote} role={drilling ? 'status' : undefined}>
                    {hideEnglish
                      ? '日本語を見て英語で言ったあと、音声で答えを確かめます'
                      : '音声のあとに続けて、声に出して言います'}
                  </span>
                </div>
              )}

              <PhraseList
                key={hideEnglish ? 'hidden' : 'shown'}
                phrases={s.phrases}
                disabled={!!drill}
                hideEnglish={hideEnglish}
                activeIndex={drilling ? drillPos.index : null}
                activeShowsEnglish={drillPos.showEnglish}
              />
            </section>
          );
        })}

        <button type="button" className={styles.backButton} onClick={handleBack}>
          戻る
        </button>
      </div>

      {/* 続けて練習している間は、止めるボタンを画面の下に固定する（自動スクロールで位置が動かないように） */}
      {drillSection && (
        <div className={styles.drillBar}>
          <span className={styles.drillBarText} role="status">
            <span className={styles.drillBarTitle}>{drillSection.short}</span>
            <span className={styles.drillBarCount}>
              {drillPos.index + 1} / {drillSection.phrases.length}
            </span>
          </span>
          <button type="button" className={styles.drillStop} onClick={() => setDrill(null)}>
            練習を止める
          </button>
        </div>
      )}
    </div>
  );
}
