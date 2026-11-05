import styles from './InterviewCard.module.css';

/**
 * 英検二次試験の問題カード（指示文・最初の一文・4コマのイラスト）。
 * hidden のときはカードを伏せた状態（No.2 以降）を表示する。
 */
export default function InterviewCard({ card, title, hidden = false }) {
  if (hidden) {
    return (
      <div className={styles.back} role="img" aria-label="問題カード（伏せた状態）">
        <span className={styles.backTitle}>{title || '問題カード'}</span>
        <span className={styles.backNote}>カードは伏せてあります。ここからはカードを見ずに答えます。</span>
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
            <img className={styles.image} src={card.image} alt="問題カードの4コマのイラスト" />
          </div>
          <p className={styles.scrollHint}>横にスクロールすると4コマ目まで見られます</p>
        </>
      )}
    </figure>
  );
}
