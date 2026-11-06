import { useCallback, useEffect, useRef, useState } from 'react';

// 対応している形式から順に使う（Chrome などは webm/opus、iPhone の Safari は mp4）
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/aac',
  'audio/ogg;codecs=opus',
];

export function isRecordingSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder === 'function' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function pickMimeType() {
  if (typeof window.MediaRecorder?.isTypeSupported !== 'function') return '';
  return MIME_CANDIDATES.find((t) => window.MediaRecorder.isTypeSupported(t)) || '';
}

/**
 * マイク録音（MediaRecorder）をまとめたフック。
 *
 * - 録音データはメモリ上の Blob と blob: URL としてだけ持ち、どこにも送信・保存しない
 * - 作った blob: URL は discard / discardAll か、画面を離れたとき（アンマウント）に解放する
 * - マイクが拒否された・非対応のときは status で知らせる（呼び出し側は録音なしで続けられる）
 *
 * status: 'idle'（未準備）| 'requesting'（許可待ち）| 'ready' | 'denied' | 'unsupported' | 'error'
 */
export default function useRecorder() {
  const [status, setStatus] = useState(() => (isRecordingSupported() ? 'idle' : 'unsupported'));
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const urlsRef = useRef(new Set());
  const stopResolveRef = useRef(null);
  // マイクが切れて自分で止まったときの録音。次の stop() で渡す
  const orphanResultRef = useRef(null);
  const unmountedRef = useRef(false);
  // 録音時間（一時停止中は数えない）。segmentStartRef は録音が進んでいる間だけ開始時刻を持つ
  const activeMsRef = useRef(0);
  const segmentStartRef = useRef(null);

  /** マイクの使用許可を取り、録音できる状態にする。成功したら true */
  const prepare = useCallback(async () => {
    if (!isRecordingSupported()) {
      setStatus('unsupported');
      return false;
    }
    if (streamRef.current) return true;
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      // 許可を待っている間に画面を離れていたら、誰も止められなくなるのでここで止める
      if (unmountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      streamRef.current = stream;
      setStatus('ready');
      return true;
    } catch (err) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      setStatus(denied ? 'denied' : 'error');
      return false;
    }
  }, []);

  const addActiveTime = useCallback(() => {
    if (segmentStartRef.current === null) return;
    activeMsRef.current += performance.now() - segmentStartRef.current;
    segmentStartRef.current = null;
  }, []);

  const dropOrphan = useCallback(() => {
    const url = orphanResultRef.current?.url;
    orphanResultRef.current = null;
    if (url) {
      URL.revokeObjectURL(url);
      urlsRef.current.delete(url);
    }
  }, []);

  /** 録音を始める。マイクの準備ができていなければ何もしない（false） */
  const start = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || recorderRef.current) return false;
    dropOrphan();
    const mimeType = pickMimeType();
    let recorder;
    try {
      recorder = new window.MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      setStatus('error');
      return false;
    }

    chunksRef.current = [];
    activeMsRef.current = 0;
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      addActiveTime(); // stop() を通らず、マイクが切れて止まった場合の分
      const type = recorder.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      recorderRef.current = null;
      setIsRecording(false);
      setIsPaused(false);

      let result = null;
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob);
        urlsRef.current.add(url);
        result = { url, mimeType: type, size: blob.size, duration: activeMsRef.current / 1000 };
      }
      if (stopResolveRef.current) {
        stopResolveRef.current(result);
        stopResolveRef.current = null;
      } else {
        // 話した分を捨てないよう、回答を終えるときに渡す
        orphanResultRef.current = result;
      }
    };

    recorderRef.current = recorder;
    try {
      recorder.start(1000);
    } catch {
      // マイクが途中で切れたときなど。画面を止めず、録音なしで続けられるようにする
      recorderRef.current = null;
      setStatus('error');
      return false;
    }
    segmentStartRef.current = performance.now();
    setIsRecording(true);
    setIsPaused(false);
    return true;
  }, [addActiveTime, dropOrphan]);

  /** 録音を止め、{ url, mimeType, size, duration } で解決する（録音していなければ null） */
  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      const orphan = orphanResultRef.current;
      orphanResultRef.current = null;
      return Promise.resolve(orphan);
    }
    addActiveTime();
    return new Promise((resolve) => {
      stopResolveRef.current = resolve;
      recorder.stop();
    });
  }, [addActiveTime]);

  /** 一時停止（質問を聞き直している間など）。非対応のブラウザでは何もしない */
  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state !== 'recording' || typeof recorder.pause !== 'function') return;
    recorder.pause();
    addActiveTime();
    setIsPaused(true);
  }, [addActiveTime]);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state !== 'paused') return;
    recorder.resume();
    segmentStartRef.current = performance.now();
    setIsPaused(false);
  }, []);

  /** マイクを手放す（ブラウザの「マイク使用中」表示を消す）。録音中なら破棄する */
  const release = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    recorderRef.current = null;
    dropOrphan();
    stopResolveRef.current?.(null);
    stopResolveRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    setStatus((s) => (s === 'ready' ? 'idle' : s));
  }, [dropOrphan]);

  /** 録音の blob: URL を解放する */
  const discard = useCallback((url) => {
    if (!url || !urlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  }, []);

  const discardAll = useCallback(() => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
  }, []);

  // 画面を離れたらマイクを止め、録音データを解放する
  useEffect(() => {
    const urls = urlsRef.current;
    unmountedRef.current = false; // StrictMode の再マウントで true のまま残らないように戻す
    return () => {
      unmountedRef.current = true;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  return {
    status,
    /** マイクの準備ができていて録音に使えるか */
    isReady: status === 'ready',
    isRecording,
    isPaused,
    prepare,
    start,
    stop,
    pause,
    resume,
    release,
    discard,
    discardAll,
  };
}
