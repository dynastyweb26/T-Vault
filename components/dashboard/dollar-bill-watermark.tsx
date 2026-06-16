interface DollarBillWatermarkProps {
  className?: string;
}

export function DollarBillWatermark({ className }: DollarBillWatermarkProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      {/* Bill body */}
      <rect
        x="4"
        y="4"
        width="312"
        height="132"
        rx="6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="12"
        y="12"
        width="296"
        height="116"
        rx="4"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeDasharray="3 2"
        opacity="0.7"
      />

      {/* Corner scroll ornaments */}
      <path
        d="M20 20 C28 20 32 24 32 32 C32 24 36 20 44 20 C36 20 32 16 32 8 C32 16 28 20 20 20Z"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.65"
      />
      <path
        d="M276 20 C284 20 288 24 288 32 C288 24 292 20 300 20 C292 20 288 16 288 8 C288 16 284 20 276 20Z"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.65"
      />
      <path
        d="M20 120 C28 120 32 116 32 108 C32 116 36 120 44 120 C36 120 32 124 32 132 C32 124 28 120 20 120Z"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.65"
      />
      <path
        d="M276 120 C284 120 288 116 288 108 C288 116 292 120 300 120 C292 120 288 124 288 132 C288 124 284 120 276 120Z"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.65"
      />

      {/* Edge micro-pattern bands */}
      <rect x="18" y="18" width="284" height="6" stroke="currentColor" strokeWidth="0.4" opacity="0.5" />
      <rect x="18" y="116" width="284" height="6" stroke="currentColor" strokeWidth="0.4" opacity="0.5" />
      {Array.from({ length: 28 }).map((_, i) => (
        <line
          key={`top-${i}`}
          x1={22 + i * 10}
          y1="19"
          x2={22 + i * 10}
          y2="23"
          stroke="currentColor"
          strokeWidth="0.35"
          opacity="0.45"
        />
      ))}
      {Array.from({ length: 28 }).map((_, i) => (
        <line
          key={`bot-${i}`}
          x1={22 + i * 10}
          y1="117"
          x2={22 + i * 10}
          y2="121"
          stroke="currentColor"
          strokeWidth="0.35"
          opacity="0.45"
        />
      ))}

      {/* Left portrait panel frame */}
      <rect
        x="24"
        y="32"
        width="72"
        height="76"
        rx="2"
        stroke="currentColor"
        strokeWidth="0.75"
      />
      <ellipse
        cx="60"
        cy="68"
        rx="22"
        ry="28"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.55"
      />
      <ellipse
        cx="60"
        cy="62"
        rx="14"
        ry="16"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.4"
      />
      {/* Stylized bust silhouette */}
      <path
        d="M60 48 C54 48 50 54 50 62 C50 70 54 76 60 78 C66 76 70 70 70 62 C70 54 66 48 60 48Z"
        stroke="currentColor"
        strokeWidth="0.55"
        opacity="0.5"
      />
      <path
        d="M48 82 C52 88 68 88 72 82"
        stroke="currentColor"
        strokeWidth="0.55"
        opacity="0.45"
      />

      {/* Right denomination panel */}
      <rect
        x="224"
        y="32"
        width="72"
        height="76"
        rx="2"
        stroke="currentColor"
        strokeWidth="0.75"
      />
      <text
        x="260"
        y="78"
        textAnchor="middle"
        fill="currentColor"
        fontSize="36"
        fontFamily="Georgia, serif"
        fontWeight="700"
        opacity="0.55"
      >
        $
      </text>

      {/* Central seal / medallion */}
      <circle cx="160" cy="70" r="34" stroke="currentColor" strokeWidth="1" />
      <circle cx="160" cy="70" r="28" stroke="currentColor" strokeWidth="0.6" opacity="0.7" />
      <circle cx="160" cy="70" r="22" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 1.5" opacity="0.55" />
      {/* Seal rays */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 16;
        const x1 = 160 + Math.cos(angle) * 18;
        const y1 = 70 + Math.sin(angle) * 18;
        const x2 = 160 + Math.cos(angle) * 26;
        const y2 = 70 + Math.sin(angle) * 26;
        return (
          <line
            key={`ray-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="0.4"
            opacity="0.5"
          />
        );
      })}
      {/* Inner shield */}
      <path
        d="M160 52 L172 58 L172 74 C172 82 160 88 160 88 C160 88 148 82 148 74 L148 58 Z"
        stroke="currentColor"
        strokeWidth="0.65"
        opacity="0.6"
      />
      <path
        d="M154 64 L160 60 L166 64 L164 72 L156 72 Z"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.45"
      />
      {/* Banner below seal */}
      <path
        d="M142 92 Q160 98 178 92"
        stroke="currentColor"
        strokeWidth="0.55"
        opacity="0.5"
      />

      {/* Guilloche-style horizontal lines across center field */}
      {Array.from({ length: 8 }).map((_, i) => (
        <path
          key={`wave-${i}`}
          d={`M108 ${44 + i * 8} Q134 ${40 + i * 8} 160 ${44 + i * 8} Q186 ${48 + i * 8} 212 ${44 + i * 8}`}
          stroke="currentColor"
          strokeWidth="0.35"
          opacity="0.35"
        />
      ))}

      {/* Vertical fine-line border filigree */}
      <path
        d="M108 28 L108 112 M212 28 L212 112"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.4"
      />
      <path
        d="M104 32 L104 108 M216 32 L216 108"
        stroke="currentColor"
        strokeWidth="0.35"
        strokeDasharray="1 2"
        opacity="0.35"
      />

      {/* Serial-style micro text lines */}
      <text
        x="28"
        y="30"
        fill="currentColor"
        fontSize="5"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.15em"
        opacity="0.4"
      >
        TVLT SERIES 2026
      </text>
      <text
        x="28"
        y="128"
        fill="currentColor"
        fontSize="5"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.12em"
        opacity="0.4"
      >
        FEDERAL RESERVE NOTE
      </text>
      <text
        x="210"
        y="30"
        fill="currentColor"
        fontSize="5"
        fontFamily="ui-monospace, monospace"
        opacity="0.4"
      >
        A00000000A
      </text>

      {/* Treasury seal circle (left of center) */}
      <circle cx="118" cy="70" r="10" stroke="currentColor" strokeWidth="0.5" opacity="0.45" />
      <path
        d="M118 64 L121 70 L118 76 L115 70 Z"
        stroke="currentColor"
        strokeWidth="0.4"
        opacity="0.4"
      />

      {/* Federal reserve seal circle (right of center) */}
      <circle cx="202" cy="70" r="10" stroke="currentColor" strokeWidth="0.5" opacity="0.45" />
      <circle cx="202" cy="70" r="5" stroke="currentColor" strokeWidth="0.4" opacity="0.35" />
    </svg>
  );
}
