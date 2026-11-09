import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import SegmentedControl from './SegmentedControl';
import usePreference from '../hooks/usePreference';
import { INTERVIEW_CONFIG } from '../utils/examConfig';
import styles from './CardImageViewer.module.css';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEPS = [1, 1.5, 2, 3, 4];
const DOUBLE_TAP_MS = 300;

const LAYOUTS = [
  { value: 'row', label: '横一列' },
  { value: 'grid', label: '2×2' },
  { value: 'column', label: '縦一列' },
];

function clampZoom(z) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

function defaultLayout() {
  // スマホの縦向きは、1コマずつ縦に並べると画面の幅いっぱいに大きく見られる
  return typeof window !== 'undefined' && window.innerWidth < 600 && window.innerHeight > window.innerWidth
    ? 'column'
    : 'row';
}

/** 4コマのうち i コマ目を切り出す位置（img の幅と左へのずらし。どちらも切り出す幅に対する %） */
function panelCrop(i) {
  const { count, left, right, pad } = INTERVIEW_CONFIG.cardPanels;
  const w = (right - left) / count;
  const x0 = Math.max(0, left + w * i - pad);
  const x1 = Math.min(1, left + w * (i + 1) + pad);
  const cropW = x1 - x0;
  return { width: `${100 / cropW}%`, marginLeft: `${(-x0 / cropW) * 100}%` };
}

function distance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * 問題カードの絵の拡大表示（全画面）。
 * - ピンチ・ダブルタップ（ダブルクリック）・＋/− ボタンで拡大し、スクロールで動かす
 * - 横一列 / 2×2 / 縦一列 の並べ方を切り替えられる（選んだ並べ方は端末に保存）
 * - × ボタンか Esc で閉じる
 * status: 上部に出す状況（タイマーと「終える」ボタンなど。回答中でも見えるように）
 */
export default function CardImageViewer({ src, title, onClose, status }) {
  const [layout, setLayout] = usePreference('cardViewLayout', defaultLayout());
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const scrollRef = useRef(null);
  const closeRef = useRef(null);
  const pendingScroll = useRef(null);
  const pinchRef = useRef(null);
  const tapRef = useRef({ time: 0, x: 0, y: 0, moved: false, lastTouchEnd: 0 });

  const currentLayout = LAYOUTS.some((l) => l.value === layout) ? layout : 'row';

  /** (clientX, clientY) の位置を動かさずに倍率を変える */
  const zoomAt = useCallback((next, clientX, clientY) => {
    const el = scrollRef.current;
    const z = clampZoom(next);
    const prev = zoomRef.current;
    if (!el || z === prev) return;
    const rect = el.getBoundingClientRect();
    const px = (clientX ?? rect.left + rect.width / 2) - rect.left;
    const py = (clientY ?? rect.top + rect.height / 2) - rect.top;
    const ratio = z / prev;
    pendingScroll.current = {
      left: (el.scrollLeft + px) * ratio - px,
      top: (el.scrollTop + py) * ratio - py,
    };
    zoomRef.current = z;
    setZoom(z);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    const p = pendingScroll.current;
    if (!el || !p) return;
    pendingScroll.current = null;
    el.scrollLeft = Math.max(0, p.left);
    el.scrollTop = Math.max(0, p.top);
  }, [zoom]);

  const changeLayout = (next) => {
    setLayout(next);
    zoomRef.current = 1;
    setZoom(1);
    scrollRef.current?.scrollTo(0, 0);
  };

  const stepZoom = useCallback(
    (dir) => {
      const z = zoomRef.current;
      const next =
        dir > 0 ? ZOOM_STEPS.find((s) => s > z + 0.01) : [...ZOOM_STEPS].reverse().find((s) => s < z - 0.01);
      zoomAt(next ?? (dir > 0 ? MAX_ZOOM : MIN_ZOOM));
    },
    [zoomAt]
  );

  const toggleZoomAt = (clientX, clientY) => {
    zoomAt(zoomRef.current > 1.05 ? 1 : 2.5, clientX, clientY);
  };

  // 開いている間は後ろのページをスクロールさせない。閉じたら元の場所にフォーカスを戻す
  useEffect(() => {
    const previous = document.activeElement;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    closeRef.current?.focus();
    // iPhone の Safari のページ全体の拡大（ジェスチャー）を止め、絵だけを拡大する
    const stopGesture = (e) => e.preventDefault();
    document.addEventListener('gesturestart', stopGesture);
    return () => {
      root.style.overflow = prevOverflow;
      document.removeEventListener('gesturestart', stopGesture);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.key === '+' || e.key === '=') && !e.metaKey && !e.ctrlKey) {
        stepZoom(1);
      } else if (e.key === '-' && !e.metaKey && !e.ctrlKey) {
        stepZoom(-1);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, stepZoom]);

  // --- タッチ操作（ピンチで拡大・ダブルタップで拡大/元に戻す。1本指の移動はブラウザのスクロールに任せる） ---
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      pinchRef.current = { dist: distance(a, b), zoom: zoomRef.current };
      tapRef.current.moved = true;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      tapRef.current.moved = false;
      tapRef.current.startX = t.clientX;
      tapRef.current.startY = t.clientY;
    }
  };

  const onTouchMove = (e) => {
    const pinch = pinchRef.current;
    if (pinch && e.touches.length === 2) {
      const [a, b] = e.touches;
      const next = pinch.zoom * (distance(a, b) / pinch.dist);
      zoomAt(next, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      return;
    }
    const t = e.touches[0];
    const tap = tapRef.current;
    if (t && Math.hypot(t.clientX - tap.startX, t.clientY - tap.startY) > 10) tap.moved = true;
  };

  const onTouchEnd = (e) => {
    const tap = tapRef.current;
    tap.lastTouchEnd = Date.now();
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length > 0 || tap.moved) return;
    const t = e.changedTouches[0];
    const now = Date.now();
    if (now - tap.time < DOUBLE_TAP_MS && Math.hypot(t.clientX - tap.x, t.clientY - tap.y) < 30) {
      tap.time = 0;
      toggleZoomAt(t.clientX, t.clientY);
    } else {
      tap.time = now;
      tap.x = t.clientX;
      tap.y = t.clientY;
    }
  };

  const onDoubleClick = (e) => {
    // タッチのダブルタップは onTouchEnd で処理済み
    if (Date.now() - tapRef.current.lastTouchEnd < 800) return;
    toggleZoomAt(e.clientX, e.clientY);
  };

  // ポータルにしない（ページの --accent などの色をそのまま受け継ぐため。position: fixed で全画面に出す）
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`${title || '問題カード'}の絵（拡大表示）`}>
      <div className={styles.bar}>
        <div className={styles.barRow}>
          <span className={styles.title}>{title || '問題カード'}</span>
          {status && <div className={styles.status}>{status}</div>}
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="拡大表示を閉じる">
            <span aria-hidden="true">×</span>
            <span className={styles.closeText}>閉じる</span>
          </button>
        </div>
        <div className={styles.barRow}>
          <SegmentedControl
            label="並べ方"
            options={LAYOUTS}
            value={currentLayout}
            onChange={changeLayout}
            hideLabelOnNarrow
          />
          <div className={styles.zoom} role="group" aria-label="拡大率">
            <button type="button" className={styles.zoomButton} onClick={() => stepZoom(-1)} disabled={zoom <= MIN_ZOOM} aria-label="縮小">
              −
            </button>
            <button type="button" className={styles.zoomValue} onClick={() => zoomAt(1)} aria-label="等倍に戻す">
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" className={styles.zoomButton} onClick={() => stepZoom(1)} disabled={zoom >= MAX_ZOOM} aria-label="拡大">
              ＋
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={styles.scroller}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onDoubleClick={onDoubleClick}
        tabIndex={0}
      >
        <div className={styles.center}>
          <div className={`${styles.content} ${styles[currentLayout]}`} style={{ '--zoom': zoom }}>
            {currentLayout === 'row' ? (
              <img className={styles.full} src={src} alt="問題カードの4コマのイラスト" draggable={false} />
            ) : (
              Array.from({ length: INTERVIEW_CONFIG.cardPanels.count }, (_, i) => (
                <div key={i} className={styles.panel}>
                  <img src={src} alt={`${i + 1}コマ目`} style={panelCrop(i)} draggable={false} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <p className={styles.help}>ピンチやダブルタップで拡大できます</p>
    </div>
  );
}
