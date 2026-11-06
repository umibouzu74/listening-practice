import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * 進行中に画面を離れようとしたら確認する（タブを閉じる・ブラウザの戻る・スマホの戻るやスワイプ）。
 * ヘッダーの戻るボタンは呼び出し側で確認してから navigate する（PUSH なのでここでは止めない）。
 */
export default function useLeaveGuard(active, message) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);

  const blocker = useBlocker(({ historyAction }) => active && historyAction === 'POP');
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(message)) blocker.proceed();
    else blocker.reset();
  }, [blocker, message]);
}
