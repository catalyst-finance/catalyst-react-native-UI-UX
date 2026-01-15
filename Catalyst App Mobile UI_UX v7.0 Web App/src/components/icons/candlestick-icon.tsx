export const CandlestickIcon = ({ className = "", ...props }: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="2.4 2.4 19.2 19.2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Left candlestick (filled/bullish) */}
      {/* Top wick */}
      <line x1="8" y1="4" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Body (filled) */}
      <rect x="5" y="8" width="6" height="8" fill="currentColor" rx="0.5" />
      {/* Bottom wick */}
      <line x1="8" y1="16" x2="8" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Right candlestick (hollow/bearish) */}
      {/* Top wick */}
      <line x1="16" y1="6" x2="16" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Body (hollow) */}
      <rect x="13" y="11" width="6" height="7" fill="none" stroke="currentColor" strokeWidth="1.5" rx="0.5" />
      {/* Bottom wick */}
      <line x1="16" y1="18" x2="16" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};