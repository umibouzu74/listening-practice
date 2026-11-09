import { ChevronIcon } from './AudioIcons';
import styles from './PhraseBookLink.module.css';

/** 面接の基本フレーズ集（#/eiken/phrases）への入口。面接の一覧・カード一覧に置く */
export default function PhraseBookLink({ accentColor, onClick }) {
  return (
    <button
      type="button"
      className={styles.link}
      style={{ '--item-accent': accentColor || 'var(--color-accent)' }}
      onClick={onClick}
    >
      <span className={styles.icon} aria-hidden="true">
        💬
      </span>
      <span className={styles.text}>
        <span className={styles.title}>面接の基本フレーズ集</span>
        <span className={styles.hint}>どのカードでも使える言い回しを、聞いてまねして覚える（まずはここから）</span>
      </span>
      <ChevronIcon />
    </button>
  );
}
