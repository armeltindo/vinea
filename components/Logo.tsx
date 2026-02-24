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
      {/* Background Squircle - Premium Deep Blue */}
      <rect 
        width="100" 
        height="100" 
        rx="30" 
        fill="#2563EB" 
      />
      
      {/* Glossy overlay */}
      <rect 
        width="100" 
        height="100" 
        rx="30" 
        fill="url(#logo_shimmer)" 
        fillOpacity="0.2"
      />

      {/* Elegant Geometric White V */}
      <path 
        d="M30 35L50 70L70 35" 
        stroke="white" 
        strokeWidth="11" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      <defs>
        <linearGradient id="logo_shimmer" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default Logo;