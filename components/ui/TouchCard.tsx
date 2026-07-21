'use client';

// ============================================================
// StayDesk — TouchCard
// Location: components/ui/TouchCard.tsx
//
// Pressable card wrapper with:
// - active:scale press animation
// - Ripple on tap
// - 44px min-height
// - Haptic feedback
// ============================================================

import React, { useCallback } from 'react';

interface TouchCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  as?: 'div' | 'button' | 'li';
  disabled?: boolean;
  'aria-label'?: string;
  id?: string;
}

function createRipple(event: React.PointerEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.5;
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
  el.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

export default function TouchCard({
  children,
  onClick,
  className = '',
  as: Tag = 'div',
  disabled = false,
  'aria-label': ariaLabel,
  id,
}: TouchCardProps) {
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!disabled) {
      createRipple(e);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(6);
      }
    }
  }, [disabled]);

  const handleClick = useCallback(() => {
    if (!disabled) onClick?.();
  }, [disabled, onClick]);

  return (
    <Tag
      id={id}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`
        touch-card ripple-host
        relative overflow-hidden
        min-h-[44px]
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
        ${className}
      `.trim()}
    >
      {children}
    </Tag>
  );
}
