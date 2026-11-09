import PhraseList from './PhraseList';
import { basicPhrasesFor } from '../utils/interviewPhrases';
import styles from './PhraseHints.module.css';

/**
 * 練習形式の「使えるフレーズ」パネル。答える前に聞いてまねし、答えている間は見ながら話すためのヒント。
 * この質問のフレーズ（データの phrases）と、質問の種類ごとの基本の型を並べる。
 * この質問のフレーズがない回は、基本の型を開いた状態で出す。
 * answering: 面接官の発話中・回答中（読み上げボタンを止める）
 */
export default function PhraseHints({ question, answering }) {
  const own = question.phrases || [];
  const basic = basicPhrasesFor(question);
  return (
    <section className={styles.box} aria-label="使えるフレーズ">
      <div className={styles.head}>
        <span className={styles.title}>使えるフレーズ</span>
        <span className={styles.note}>
          {answering ? '見ながら話してみましょう' : '音声ボタンで聞いて、まねして言ってみましょう'}
        </span>
      </div>
      {own.length > 0 && <PhraseList phrases={own} disabled={answering} />}
      <details className={styles.basic} open={own.length === 0}>
        <summary className={styles.summary}>{basic.title}</summary>
        <div className={styles.basicBody}>
          <PhraseList phrases={basic.phrases} disabled={answering} />
        </div>
      </details>
    </section>
  );
}
