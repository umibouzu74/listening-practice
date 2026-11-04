// 音声プレイヤーで使う SVG アイコン群

export function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M5 3V15L15 9L5 3Z" fill="white" />
    </svg>
  );
}

export function PauseIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="4" y="3" width="3" height="12" rx="0.5" fill="white" />
      <rect x="11" y="3" width="3" height="12" rx="0.5" fill="white" />
    </svg>
  );
}

export function SkipIcon({ direction = 'forward', size = 18, seconds = 5 }) {
  const d = direction === 'back'
    ? 'M10 3.5V1L5.5 4.5L10 8V5.5C13.04 5.5 15.5 7.96 15.5 11C15.5 14.04 13.04 16.5 10 16.5C6.96 16.5 4.5 14.04 4.5 11H2.5C2.5 15.14 5.86 18.5 10 18.5C14.14 18.5 17.5 15.14 17.5 11C17.5 6.86 14.14 3.5 10 3.5Z'
    : 'M10 3.5V1L14.5 4.5L10 8V5.5C6.96 5.5 4.5 7.96 4.5 11C4.5 14.04 6.96 16.5 10 16.5C13.04 16.5 15.5 14.04 15.5 11H17.5C17.5 15.14 14.14 18.5 10 18.5C5.86 18.5 2.5 15.14 2.5 11C2.5 6.86 5.86 3.5 10 3.5Z';
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={d} fill="currentColor" />
      <text x="10" y="12.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor">
        {seconds}
      </text>
    </svg>
  );
}

export function LoopIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M14 3L17 6L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 10V8C3 6.34 4.34 5 6 5H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 17L3 14L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 10V12C17 13.66 15.66 15 14 15H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronIcon({ direction = 'right', size = 16 }) {
  const d = direction === 'left' ? 'M10 4L6 8L10 12' : 'M6 4L10 8L6 12';
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
