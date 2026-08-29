import React from 'react';

export default function UnichatLogo({ size = 'md', showText = true, className = '' }) {
  const sizeMap = {
    sm: { icon: 26, text: 15, sub: 8 },
    md: { icon: 34, text: 17, sub: 9 },
    lg: { icon: 44, text: 21, sub: 10 },
    xl: { icon: 56, text: 28, sub: 12 },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`unichat-logo-wrapper ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {/* Official Unichat Symbol: Geometric U + Beacon Star */}
      <div
        className="unichat-logo-icon"
        style={{
          width: currentSize.icon,
          height: currentSize.icon,
          borderRadius: Math.round(currentSize.icon * 0.28),
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 3px 12px var(--accent-glow)',
          flexShrink: 0,
        }}
      >
        <svg
          width={Math.round(currentSize.icon * 0.65)}
          height={Math.round(currentSize.icon * 0.65)}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bold Geometric U */}
          <path
            d="M20 38V58C20 74.5685 33.4315 88 50 88C66.5685 88 80 74.5685 80 58V38H62V58C62 64.6274 56.6274 70 50 70C43.3726 70 38 64.6274 38 58V38H20Z"
            fill="#FFFFFF"
          />
          {/* 4-Pointed Precision Academic Star */}
          <path
            d="M50 8L54.8 24.5L68 30L54.8 35.5L50 52L45.2 35.5L32 30L45.2 24.5L50 8Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: currentSize.text,
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
              }}
            >
              Unichat
            </span>
            <span
              style={{
                fontSize: currentSize.sub,
                fontWeight: 800,
                letterSpacing: '0.06em',
                padding: '1.5px 5px',
                borderRadius: '4px',
                background: 'var(--accent-subtle)',
                color: 'var(--accent-light)',
                border: '1px solid var(--accent-border)',
                textTransform: 'uppercase',
              }}
            >
              OS
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
