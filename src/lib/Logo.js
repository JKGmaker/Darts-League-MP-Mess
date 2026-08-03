export default function MabbLogo({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="MABB logo">
      <rect x="8" y="22" width="84" height="56" fill="#4A4A4A" />
      <circle cx="50" cy="50" r="32" fill="#fff" />
      <circle cx="50" cy="50" r="28" fill="#E8430C" />
      <g stroke="#fff" strokeWidth="3.5" fill="none">
        <line x1="50" y1="22" x2="50" y2="78" />
        <line x1="22" y1="50" x2="78" y2="50" />
        <path d="M 30 30 Q 42 50 30 70" />
        <path d="M 70 30 Q 58 50 70 70" />
      </g>
    </svg>
  );
}
