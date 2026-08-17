export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Control Plane"
    >
      {/* Wrench */}
      <path d="M5 7a7 7 0 0 0 8 9l10 10" />
      <path d="M5 7l5 5 5-5" />
      <circle cx="24" cy="27" r="2.5" />

      {/* Top input wire */}
      <line x1="31" y1="21" x2="48" y2="21" />

      {/* Git / branch */}
      <circle cx="12" cy="45" r="3.5" />
      <circle cx="24" cy="37" r="3.5" />
      <circle cx="24" cy="53" r="3.5" />
      <path d="M15.5 45h3a5.5 5.5 0 0 0 5.5-5.5" />
      <path d="M18.5 45a5.5 5.5 0 0 1 5.5 5.5" />

      {/* Bottom input wire */}
      <line x1="31" y1="45" x2="48" y2="45" />

      {/* AND gate */}
      <path d="M48 12 H66 A20 20 0 0 1 66 52 H48 Z" />

      {/* Output wire */}
      <line x1="86" y1="32" x2="104" y2="32" />

      {/* Hard hat */}
      <path d="M108 42h42" />
      <path d="M113 42c0-12 8-20 16-20s16 8 16 20" />
      <line x1="129" y1="22" x2="129" y2="27" />

      {/* Code mark */}
      <path d="M121 31l-5 4 5 4" />
      <path d="M137 31l5 4-5 4" />
      <path d="M132 29l-6 12" />
    </svg>
  );
}
