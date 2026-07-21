'use client';

// ============================================================
// StayDesk — Reusable Loading Button
// Location: components/ui/LoadingButton.tsx
//
// Drop-in replacement for <button> that:
// - Shows spinner + "Processing..." while loading
// - Disables and prevents double-submit during loading
// - Ripple effect on pointer-down
// - Immediate active:scale press feedback
// ============================================================

import React, { useCallback, useRef } from 'react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  /** Spinner color — defaults to currentColor (inherits from text color) */
  spinnerClassName?: string;
}

function createRipple(event: React.PointerEvent<HTMLButtonElement>) {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.5;
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  ripple.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
  `;

  button.appendChild(ripple);
  // Cleanup after animation
  ripple.addEventListener('animationend', () => {
    ripple.remove();
  }, { once: true });
}

export default function LoadingButton({
  loading = false,
  loadingText = 'Processing...',
  disabled,
  className = '',
  children,
  spinnerClassName = '',
  onPointerDown,
  ...props
}: LoadingButtonProps) {
  const isDisabled = loading || disabled;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!isDisabled) {
        createRipple(e);
        // Haptic feedback where supported
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(8);
        }
      }
      onPointerDown?.(e);
    },
    [isDisabled, onPointerDown]
  );

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      onPointerDown={handlePointerDown}
      className={`
        relative overflow-hidden ripple-host
        inline-flex items-center justify-center gap-2
        select-none transition-all duration-75
        ${loading ? 'btn-loading' : ''}
        ${isDisabled && !loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `.trim()}
    >
      {loading && (
        <span
          className={`btn-spinner ${spinnerClassName}`}
          aria-hidden="true"
        />
      )}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
}
