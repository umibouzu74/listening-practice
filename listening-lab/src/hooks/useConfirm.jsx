import { useCallback, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * 確認ダイアログを Promise で使うためのフック。
 * const [dialog, confirm] = useConfirm(); … if (await confirm({ title, message })) { … }
 * dialog は画面のどこかに描画しておく。
 */
export default function useConfirm() {
  const [request, setRequest] = useState(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setRequest((prev) => {
          prev?.resolve(false); // 前の確認が開いたままなら「やめる」扱いにする
          return { ...options, resolve };
        });
      }),
    []
  );

  const close = useCallback((ok) => {
    setRequest((prev) => {
      prev?.resolve(ok);
      return null;
    });
  }, []);
  const onConfirm = useCallback(() => close(true), [close]);
  const onCancel = useCallback(() => close(false), [close]);

  const dialog = (
    <ConfirmDialog
      open={!!request}
      title={request?.title}
      message={request?.message}
      confirmLabel={request?.confirmLabel}
      cancelLabel={request?.cancelLabel}
      danger={request?.danger}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
  return [dialog, confirm];
}
