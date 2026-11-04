import { useEffect } from 'react';

/**
 * active の間、画面が自動でスリープしないようにする（Screen Wake Lock API）。
 * 非対応ブラウザでは何もしない。タブを切り替えて戻ってきたときは取り直す。
 */
export default function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock = null;
    let cancelled = false;

    const request = async () => {
      try {
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) l.release();
        else lock = l;
      } catch {
        // 省電力モードなどで拒否されることがある
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
