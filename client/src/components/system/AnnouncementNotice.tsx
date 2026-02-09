import { useState, useEffect } from 'react';
import { X, PawPrint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BOOKING_PAUSE, isBookingPauseActive } from '@/config/featureFlags';

const DISMISS_KEY = 'pauseBannerDismissed';
const DISMISS_DURATION_DAYS = 14;

/**
 * Elegant floating announcement bar for booking pause period
 * Polished, warm, and upscale design matching The Howliday Inn aesthetic
 */
export function AnnouncementNotice() {
  const [isDismissed, setIsDismissed] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if pause is active
    if (!isBookingPauseActive()) {
      return;
    }

    // Check localStorage for dismiss state
    const dismissData = localStorage.getItem(DISMISS_KEY);
    if (dismissData) {
      try {
        const { timestamp } = JSON.parse(dismissData);
        const dismissAge = Date.now() - timestamp;
        const maxAge = DISMISS_DURATION_DAYS * 24 * 60 * 60 * 1000;
        
        if (dismissAge < maxAge) {
          setIsDismissed(true);
          return;
        }
      } catch {
        // Invalid data, show banner
      }
    }
    
    setIsDismissed(false);
    
    // Trigger fade-in animation after mount
    setTimeout(() => setIsVisible(true), 50);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
      localStorage.setItem(DISMISS_KEY, JSON.stringify({
        timestamp: Date.now(),
      }));
    }, 300); // Wait for fade-out animation
  };

  if (!isBookingPauseActive() || isDismissed) {
    return null;
  }

  return (
    <div 
      className="sticky top-[80px] left-0 right-0 z-40 transition-all duration-500 ease-out"
      style={{
        height: '44px',
        background: 'rgba(232, 213, 196, 0.95)', // hi-beige with transparency
        borderBottom: '1px solid rgba(229, 221, 212, 0.6)',
        boxShadow: '0 2px 8px rgba(26, 22, 20, 0.08)',
        backdropFilter: 'blur(8px)',
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        opacity: isVisible ? 1 : 0,
      }}
      data-testid="announcement-notice"
      role="banner"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-full gap-3 relative">
          {/* Paw Print Icon */}
          <PawPrint 
            className="h-4 w-4 flex-shrink-0" 
            style={{ color: 'var(--hi-gold)' }}
            aria-hidden="true"
          />
          
          {/* Announcement Text */}
          <p 
            className="text-sm font-medium text-center"
            style={{ 
              color: 'var(--hi-brown)',
              letterSpacing: '0.01em'
            }}
          >
            {BOOKING_PAUSE.BANNER_COPY}
          </p>

          {/* Dismiss Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="absolute right-0 h-8 w-8 p-0 hover:bg-transparent transition-opacity hover:opacity-70"
            aria-label="Dismiss announcement"
            data-testid="button-dismiss-announcement"
          >
            <X 
              className="h-4 w-4" 
              style={{ color: 'var(--hi-brown)' }}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
