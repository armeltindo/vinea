import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({
  className = "w-full h-full"
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background squircle — gradient indigo → violet */}
      <rect width="100" height="100" rx="28" fill="url(#logo_bg)" />

      {/* Subtle top-left gloss */}
      <rect width="100" height="100" rx="28" fill="url(#logo_shimmer)" fillOpacity="0.12" />

      {/* ── Cross ── */}
      {/* Vertical bar */}
      <line x1="50" y1="14" x2="50" y2="55" stroke="white" strokeWidth="8" strokeLinecap="round" />
      {/* Horizontal bar */}
      <line x1="31" y1="30" x2="69" y2="30" stroke="white" strokeWidth="8" strokeLinecap="round" />

      {/* ── Community: 3 silhouettes ── */}
      {/* Left person */}
      <circle cx="30" cy="70" r="5.5" fill="white" fillOpacity="0.82" />
      <ellipse cx="30" cy="82" rx="9" ry="4.8" fill="white" fillOpacity="0.72" />

      {/* Center person (slightly elevated — focal) */}
      <circle cx="50" cy="67" r="6" fill="white" />
      <ellipse cx="50" cy="79" rx="9.5" ry="5.2" fill="white" />

      {/* Right person */}
      <circle cx="70" cy="70" r="5.5" fill="white" fillOpacity="0.82" />
      <ellipse cx="70" cy="82" rx="9" ry="4.8" fill="white" fillOpacity="0.72" />

      <defs>
        <linearGradient id="logo_bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4338CA" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="logo_shimmer" x1="0" y1="0" x2="0" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default Logo;
