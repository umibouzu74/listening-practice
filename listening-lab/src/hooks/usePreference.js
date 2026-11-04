import { useCallback, useState } from 'react';

const PREFIX = 'listening-lab-pref:';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** localStorage に保存される表示設定（端末ごと） */
export default function usePreference(key, defaultValue) {
  const [value, setValue] = useState(() => read(key, defaultValue));

  const update = useCallback((next) => {
    setValue((prev) => {
      const v = typeof next === 'function' ? next(prev) : next;
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(v));
      } catch {
        // 保存できなくても画面上の切り替えは有効
      }
      return v;
    });
  }, [key]);

  return [value, update];
}
