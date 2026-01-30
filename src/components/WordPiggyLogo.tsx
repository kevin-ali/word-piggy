interface WordPiggyLogoProps {
  className?: string;
  size?: number;
}

export function WordPiggyLogo({ className = '', size = 32 }: WordPiggyLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="24" cy="26" r="18" fill="#FDA4AF" />
      <circle cx="24" cy="26" r="18" fill="url(#pigGradient)" />
      <ellipse cx="15" cy="22" rx="3" ry="3.5" fill="#FFF" />
      <ellipse cx="33" cy="22" rx="3" ry="3.5" fill="#FFF" />
      <circle cx="15" cy="23" r="1.5" fill="#374151" />
      <circle cx="33" cy="23" r="1.5" fill="#374151" />
      <ellipse cx="24" cy="32" rx="6" ry="4.5" fill="#FB7185" />
      <ellipse cx="21.5" cy="31.5" rx="1.2" ry="1.8" fill="#F43F5E" />
      <ellipse cx="26.5" cy="31.5" rx="1.2" ry="1.8" fill="#F43F5E" />
      <path
        d="M8 16C6 12 8 8 12 9"
        stroke="#FDA4AF"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M40 16C42 12 40 8 36 9"
        stroke="#FDA4AF"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="32" y="2" rx="4" width="14" height="12" fill="#0EA5E9" />
      <text
        x="39"
        y="11"
        textAnchor="middle"
        fill="#FFF"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fontSize="9"
      >
        W
      </text>
      <defs>
        <linearGradient id="pigGradient" x1="24" y1="8" x2="24" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FECDD3" />
          <stop offset="1" stopColor="#FDA4AF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function WordPiggyFavicon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="17" r="12" fill="#FDA4AF" />
      <ellipse cx="10" cy="15" rx="2" ry="2.5" fill="#FFF" />
      <ellipse cx="22" cy="15" rx="2" ry="2.5" fill="#FFF" />
      <circle cx="10" cy="15.5" r="1" fill="#374151" />
      <circle cx="22" cy="15.5" r="1" fill="#374151" />
      <ellipse cx="16" cy="21" rx="4" ry="3" fill="#FB7185" />
      <ellipse cx="14.5" cy="20.5" rx="0.8" ry="1.2" fill="#F43F5E" />
      <ellipse cx="17.5" cy="20.5" rx="0.8" ry="1.2" fill="#F43F5E" />
      <path d="M6 11C5 8 6 5 9 6" stroke="#FDA4AF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 11C27 8 26 5 23 6" stroke="#FDA4AF" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="21" y="1" rx="3" width="10" height="8" fill="#0EA5E9" />
      <text x="26" y="7" textAnchor="middle" fill="#FFF" fontFamily="system-ui" fontWeight="700" fontSize="6">W</text>
    </svg>
  );
}
