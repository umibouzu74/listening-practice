import { useEffect, useRef, useState } from 'react';
import { SpeakerIcon, StopIcon } from './AudioIcons';
import { INTERVIEW_CONFIG } from '../utils/examConfig';
import { cancelSpeech, isSpeechSupported, speak } from '../utils/speech';
import styles from './PhraseList.module.css';

/** 続けて並んでいる同じ group の項目を1つの見出しにまとめる（index は phrases の中の位置） */
function groupPhrases(phrases) {
  const groups = [];
  phrases.forEach((p, index) => {
    const name = p.group || '';
    const last = groups[groups.length - 1];
    const item = { ...p, index };
    if (last && last.name === name) last.items.push(item);
    else groups.push({ name, items: [item] });
  });
  return groups;
}

/**
 * 面接で使えるフレーズの一覧（英語・意味・読み上げボタン）。
 * phrases: [{ en, ja, group? }]
 * disabled: 読み上げない（面接官の発話中・録音中・まとめての練習中など）
 * hideEnglish: 英語を隠して日本語だけを見せる（タップすると英語が出る）。切り替えたときは key を変えて作り直す
 * activeIndex / activeShowsEnglish: まとめての練習で今の項目を目立たせ、英語を見せるかどうか
 */
export default function PhraseList({
  phrases,
  disabled = false,
  hideEnglish = false,
  activeIndex = null,
  activeShowsEnglish = true,
}) {
  const [playing, setPlaying] = useState(null);
  const [revealed, setRevealed] = useState(() => new Set());
  const playingRef = useRef(null);
  const activeRef = useRef(null);
  const canSpeak = isSpeechSupported();

  // 読み上げ中に画面から消えたり、読み上げられない状態になったりしたら止める
  useEffect(() => {
    if (disabled && playingRef.current !== null) cancelSpeech();
  }, [disabled]);
  useEffect(
    () => () => {
      if (playingRef.current !== null) cancelSpeech();
    },
    []
  );

  // まとめての練習で、今の項目が画面に入るようにする
  useEffect(() => {
    if (activeIndex === null || !activeRef.current) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    activeRef.current.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }, [activeIndex]);

  if (!phrases?.length) return null;

  const play = async (index, text) => {
    if (playingRef.current === index) {
      cancelSpeech();
      return;
    }
    playingRef.current = index;
    setPlaying(index);
    await speak(text, { rate: INTERVIEW_CONFIG.speechRate });
    // 別のフレーズに切り替えたときは、そちらの表示を消さない
    if (playingRef.current === index) {
      playingRef.current = null;
      setPlaying(null);
    }
  };

  const reveal = (index) => setRevealed((prev) => new Set(prev).add(index));

  return (
    <div className={styles.list}>
      {groupPhrases(phrases).map((g, gi) => (
        <div key={gi} className={styles.group}>
          {g.name && <span className={styles.groupName}>{g.name}</span>}
          <ul className={styles.items}>
            {g.items.map((p) => {
              const on = playing === p.index;
              const active = activeIndex === p.index;
              const showEnglish = !hideEnglish || revealed.has(p.index) || (active && activeShowsEnglish);
              const english = showEnglish ? (
                <span className={styles.en} lang="en">
                  {p.en}
                </span>
              ) : (
                <button type="button" className={styles.reveal} onClick={() => reveal(p.index)}>
                  英語を見る
                </button>
              );
              return (
                <li
                  key={p.index}
                  ref={active ? activeRef : undefined}
                  className={`${styles.item} ${active ? styles.itemActive : ''}`}
                >
                  {canSpeak && (
                    <button
                      type="button"
                      className={`${styles.speak} ${on ? styles.speakOn : ''}`}
                      onClick={() => play(p.index, p.en)}
                      disabled={disabled}
                      aria-label={on ? '読み上げを止める' : showEnglish ? `読み上げる: ${p.en}` : '英語を読み上げる'}
                    >
                      {on ? <StopIcon size={14} /> : <SpeakerIcon size={15} />}
                    </button>
                  )}
                  {hideEnglish ? (
                    <span className={styles.text}>
                      {p.ja && <span className={styles.jaPrompt}>{p.ja}</span>}
                      {english}
                    </span>
                  ) : (
                    <span className={styles.text}>
                      {english}
                      {p.ja && <span className={styles.ja}>{p.ja}</span>}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
