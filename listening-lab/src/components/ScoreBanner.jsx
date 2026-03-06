import styles from './ScoreBanner.module.css';

function getMessage(percent) {
  if (percent === 100) return 'パーフェクト！';
  if (percent >= 80) return '素晴らしい！';
  if (percent >= 60) return 'よくできました！';
  if (percent >= 40) return 'もう少し！';
  return '繰り返し練習しよう！';
}

export default function ScoreBanner({ correct, total }) {
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  let level;
  if (percent >= 80) level = 'high';
  else if (percent >= 50) level = 'mid';
  else level = 'low';

  return (
    <div className={`${styles.banner} ${styles[level]}`}>
      <p className={styles.message}>{getMessage(percent)}</p>
      <div className={styles.scoreRow}>
        <span className={styles.fraction}>
          <span className={styles.correct}>{correct}</span>
          <span className={styles.separator}>/</span>
          <span className={styles.total}>{total}</span>
        </span>
        <span className={styles.percent}>{percent}%</span>
      </div>
    </div>
  );
}
