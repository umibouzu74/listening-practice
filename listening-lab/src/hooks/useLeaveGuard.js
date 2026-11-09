import { useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import { addPopGate } from '../utils/popGate';

/**
 * 画面を離れると失われるもの（回答の途中・保存していない録音）があるときに、離れる前に確認する。
 *
 * - アプリ内の移動（ヘッダーの「＜」・ボタン・ブラウザやスマホの戻る）は useBlocker で止め、
 *   confirmLeave()（アプリ内の確認ダイアログ。Promise<boolean>）で確かめる
 * - アドレスバーで URL のハッシュを書き換えたときは、ルーターが止められない（履歴に番号がない）ので、
 *   popstate を先に受け取って元の画面に戻し、同じように確かめてから移動する
 * - タブを閉じる・再読み込みは beforeunload でブラウザの確認を出す（文言は変えられない）
 *
 * 呼び出し側は、ヘッダーの戻るボタンでもそのまま navigate すればよい。
 */
export default function useLeaveGuard(active, confirmLeave) {
  const navigate = useNavigate();
  // 確認して離れると決めた移動先（このあとは止めない）
  const [leaveTo, setLeaveTo] = useState(null);
  const guarding = active && leaveTo === null;

  const latest = useRef({ confirmLeave });
  useEffect(() => {
    latest.current.confirmLeave = confirmLeave;
  });

  useEffect(() => {
    if (!guarding) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // 古いブラウザ向け
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [guarding]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      guarding &&
      (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search)
  );
  useEffect(() => {
    latest.current.blocker = blocker;
  });

  const blocked = blocker.state === 'blocked';
  useEffect(() => {
    if (!blocked) return;
    let answered = false;
    latest.current.confirmLeave().then((ok) => {
      if (answered) return;
      answered = true;
      const b = latest.current.blocker;
      if (b?.state !== 'blocked') return;
      if (ok) b.proceed();
      else b.reset();
    });
    return () => {
      answered = true;
    };
  }, [blocked]);

  // ルーターが止められない移動（URL のハッシュの書き換えなど）
  useEffect(() => {
    if (!guarding) return;
    let asking = false;
    return addPopGate(() => {
      // ルーターが作った履歴（番号つき）への移動は useBlocker に任せる
      if (window.history.state?.idx != null) return false;
      const target = window.location.hash.replace(/^#/, '') || '/';
      window.history.back(); // 元の画面の履歴に戻す
      if (!asking) {
        asking = true;
        latest.current.confirmLeave().then((ok) => {
          asking = false;
          if (ok) setLeaveTo(target);
        });
      }
      return true; // ルーターには画面を切り替えさせない
    });
  }, [guarding]);

  // 止めるのをやめてから（useBlocker の関数が入れ替わってから）移動する
  useEffect(() => {
    if (leaveTo !== null) navigate(leaveTo);
  }, [leaveTo, navigate]);
}
