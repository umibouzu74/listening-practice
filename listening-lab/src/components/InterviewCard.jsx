import { useState } from 'react';
import CardImageViewer from './CardImageViewer';
import styles from './InterviewCard.module.css';

/**
 * 英検二次試験の問題カード（指示文・最初の一文・4コマのイラスト）。
 * hidden のときはカードを伏せた状態（No.2 以降）を表示する。
 * 絵をタップすると全画面で拡大表示する（練習形式・本番形式・振り返りで共通）。
 * hiddenNote: 伏せた状態のときの説明（省略時は「ここからはカードを見ずに答えます」）
 * viewerStatus: 拡大表示の上部に出す状況（回答中のタイマーと「終える」ボタンなど）
 */
export default function InterviewCard({ card, title, hidden = false, hiddenNote, viewerStatus }) {
  const [viewing, setViewing] = useState(false);
  // カードを伏せたら拡大表示も閉じる（あとでカードを見せたときに勝手に開かないように）
  if (hidden && viewing) setViewing(false);

  if (hidden) {
    return (
      <div className={styles.back} role="img" aria-label="問題カード（伏せた状態）">
        <span className={styles.backTitle}>{title || '問題カード'}</span>
        <span className={styles.backNote}>{hiddenNote || 'カードは伏せてあります。ここからはカードを見ずに答えます。'}</span>
      </div>
    );
  }

  const lines = (card?.instruction || '').split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <figure className={styles.card}>
      {title && <figcaption className={styles.title}>{title}</figcaption>}
      <div className={styles.instruction} lang="en">
        {lines.map((line, i) => (
          <p key={i} className={/^This is a story about/i.test(line) ? styles.story : undefined}>
            {line}
          </p>
        ))}
        <p className={styles.beginLabel}>Your story should begin with the following sentence:</p>
        <p className={styles.firstSentence}>{card?.firstSentence}</p>
      </div>
      {card?.image && (
        <>
          <div className={styles.imageScroll}>
            <button
              type="button"
              className={styles.imageButton}
              onClick={() => setViewing(true)}
              aria-label="4コマのイラストを拡大して見る"
            >
              <img className={styles.image} src={card.image} alt="問題カードの4コマのイラスト" />
            </button>
          </div>
          <div className={styles.imageFooter}>
            <p className={styles.scrollHint}>横にスクロールすると4コマ目まで見られます</p>
            <button type="button" className={styles.zoomButton} onClick={() => setViewing(true)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.5 10.5L14 14M7 5V9M5 7H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              拡大して見る
            </button>
          </div>
          {viewing && (
            <CardImageViewer
              src={card.image}
              title={title}
              status={viewerStatus}
              onClose={() => setViewing(false)}
            />
          )}
        </>
      )}
    </figure>
  );
}
