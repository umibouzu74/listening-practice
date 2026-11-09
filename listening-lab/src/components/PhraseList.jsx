import { useEffect, useRef, useState } from 'react';
import { SpeakerIcon, StopIcon } from './AudioIcons';
import { INTERVIEW_CONFIG } from '../utils/examConfig';
import { cancelSpeech, isSpeechSupported, speak } from '../utils/speech';
import styles from './PhraseList.module.css';

/** 続けて並んでいる同じ group の項目を1つの見出しにまとめる */
function groupPhrases(phrases) {
  const groups = [];
  for (const p of phrases) {
    const name = p.group || '';
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(p);
    else groups.push({ name, items: [p] });
  }
  return groups;
}

/**
 * 面接で使えるフレーズの一覧（英語・意味・読み上げボタン）。
 * phrases: [{ en, ja, group? }]。disabled のときは読み上げない（面接官の発話中・録音中など）
 */
export default function PhraseList({ phrases, disabled = false }) {
  const [playing, setPlaying] = useState(null);
  const playingRef = useRef(null);
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

  if (!phrases?.length) return null;

  const play = async (key, text) => {
    if (playingRef.current === key) {
      cancelSpeech();
      return;
    }
    playingRef.current = key;
    setPlaying(key);
    await speak(text, { rate: INTERVIEW_CONFIG.speechRate });
    // 別のフレーズに切り替えたときは、そちらの表示を消さない
    if (playingRef.current === key) {
      playingRef.current = null;
      setPlaying(null);
    }
  };

  return (
    <div className={styles.list}>
      {groupPhrases(phrases).map((g, gi) => (
        <div key={gi} className={styles.group}>
          {g.name && <span className={styles.groupName}>{g.name}</span>}
          <ul className={styles.items}>
            {g.items.map((p, i) => {
              const key = `${gi}-${i}`;
              const on = playing === key;
              return (
                <li key={key} className={styles.item}>
                  {canSpeak && (
                    <button
                      type="button"
                      className={`${styles.speak} ${on ? styles.speakOn : ''}`}
                      onClick={() => play(key, p.en)}
                      disabled={disabled}
                      aria-label={on ? '読み上げを止める' : `読み上げる: ${p.en}`}
                    >
                      {on ? <StopIcon size={14} /> : <SpeakerIcon size={15} />}
                    </button>
                  )}
                  <span className={styles.text}>
                    <span className={styles.en} lang="en">
                      {p.en}
                    </span>
                    {p.ja && <span className={styles.ja}>{p.ja}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
