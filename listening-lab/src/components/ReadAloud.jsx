import { useEffect, useMemo, useRef, useState } from 'react';
import { SpeakerIcon, StopIcon } from './AudioIcons';
import usePreference from '../hooks/usePreference';
import { INTERVIEW_CONFIG } from '../utils/examConfig';
import { cancelSpeech, isSpeechSupported, speakAll, splitSentences } from '../utils/speech';
import styles from './ReadAloud.module.css';

const SPEEDS = [0.8, 1.0];

/**
 * 英文（模範解答など）を、再生ボタンで読み上げる。読んでいる文をハイライトする。
 * 音声ファイルはないので、フレーズ集と同じブラウザの読み上げ（speechSynthesis）を使う。
 * 速さは 0.8x / 1.0x（1.0x が INTERVIEW_CONFIG.speechRate）。端末に保存する。
 * 自分の録音などほかの音声を再生し始めると止まる。
 */
export default function ReadAloud({ text, className = '', textClassName = '' }) {
  const sentences = useMemo(() => splitSentences(text), [text]);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(null);
  const [speed, setSpeed] = usePreference('modelAnswerSpeed', 1.0);
  const runRef = useRef(0);
  const canSpeak = isSpeechSupported();

  // 画面から消えたら止める
  useEffect(
    () => () => {
      if (runRef.current < 0) cancelSpeech();
    },
    []
  );

  const stop = () => {
    cancelSpeech();
  };

  const play = async () => {
    const run = Math.abs(runRef.current) + 1;
    runRef.current = -run; // 負の値 = 読み上げ中
    setPlaying(true);
    await speakAll(sentences, {
      rate: INTERVIEW_CONFIG.speechRate * speed,
      onIndex: (i) => {
        if (runRef.current === -run) setActive(i);
      },
    });
    if (runRef.current === -run) {
      runRef.current = run;
      setPlaying(false);
      setActive(null);
    }
  };

  const rate = SPEEDS.includes(speed) ? speed : 1.0;

  return (
    <div className={`${styles.wrap} ${className}`}>
      <p className={`${styles.text} ${textClassName}`} lang="en">
        {sentences.map((s, i) => (
          <span key={i} className={active === i ? styles.active : undefined}>
            {s}{' '}
          </span>
        ))}
      </p>
      {canSpeak && (
        <div className={styles.controls}>
          <button
            type="button"
            className={`${styles.play} ${playing ? styles.playOn : ''}`}
            onClick={playing ? stop : play}
          >
            {playing ? <StopIcon size={14} /> : <SpeakerIcon size={15} />}
            {playing ? '止める' : '音声で聞く'}
          </button>
          <div className={styles.speeds} role="group" aria-label="読み上げの速さ">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                className={`${styles.speed} ${rate === s ? styles.speedOn : ''}`}
                aria-pressed={rate === s}
                onClick={() => setSpeed(s)}
                disabled={playing}
              >
                {s.toFixed(1)}x
              </button>
            ))}
          </div>
          <span className={styles.note}>合成音声</span>
        </div>
      )}
    </div>
  );
}
