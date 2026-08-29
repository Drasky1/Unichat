import React, { useState } from 'react';

function getInitials(name) {
  if (!name) return 'UN';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradient(seed = '') {
  const gradients = [
    'linear-gradient(135deg, #4f46e5, #06b6d4)',
    'linear-gradient(135deg, #6366f1, #a855f7)',
    'linear-gradient(135deg, #0284c7, #2563eb)',
    'linear-gradient(135deg, #059669, #0d9488)',
    'linear-gradient(135deg, #d97706, #ea580c)',
    'linear-gradient(135deg, #7c3aed, #db2777)',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export default function Avatar({ avatar, name = '', size = 'md', online = false, className = '' }) {
  const [imgError, setImgError] = useState(false);

  const imageUrl = typeof avatar === 'object' ? avatar?.image : (typeof avatar === 'string' && avatar.startsWith('http') ? avatar : null);
  const initials = avatar?.initials || getInitials(name || avatar?.name);
  const gradient = getGradient(name || initials);

  return (
    <div className={`avatar-container avatar-${size} ${className}`}>
      {imageUrl && !imgError ? (
        <img
          src={imageUrl}
          alt={name || initials}
          className="avatar-image"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="avatar-initials" style={{ background: gradient }}>
          {initials}
        </div>
      )}
      {online && <span className="avatar-status-dot" aria-label="Online" />}
    </div>
  );
}
