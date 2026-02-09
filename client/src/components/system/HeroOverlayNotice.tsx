import { useEffect, useState } from 'react';
import { isBookingPauseActive } from '@/config/featureFlags';
import { BOOKING_PAUSE } from '@/config/featureFlags';

/**
 * Elegant in-hero overlay notice for booking pause period
 * Positioned at bottom of hero section with premium aesthetic
 */
export function HeroOverlayNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isBookingPauseActive()) {
      return;
    }
    
    // Trigger fade-in animation after mount
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!isBookingPauseActive()) {
    return null;
  }

  return (
    <div 
      className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 max-w-[90%] sm:max-w-xl px-4"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate(-50%, 0)' : 'translate(-50%, 10px)',
        transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
      }}
      data-testid="hero-overlay-notice"
      role="status"
      aria-live="polite"
    >
      <div 
        className="rounded-xl px-6 py-3 text-center backdrop-blur-md"
        style={{
          background: 'rgba(0, 0, 0, 0.55)',
          color: '#ffffff',
        }}
      >
        <p className="text-sm sm:text-base leading-relaxed">
          {BOOKING_PAUSE.BANNER_COPY}
        </p>
      </div>
    </div>
  );
}
