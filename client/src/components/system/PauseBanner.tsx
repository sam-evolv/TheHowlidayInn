import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { BOOKING_PAUSE, isBookingPauseActive } from '@/config/featureFlags';

const DISMISS_KEY = 'pauseBannerDismissed';
const DISMISS_DURATION_DAYS = 14;

/**
 * Global banner shown during booking pause period
 * Dismissible and stores state in localStorage for 14 days
 */
export function PauseBanner() {
  const [isDismissed, setIsDismissed] = useState(true);

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
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, JSON.stringify({
      timestamp: Date.now(),
    }));
  };

  if (!isBookingPauseActive() || isDismissed) {
    return null;
  }

  return (
    <div 
      className="w-full border-b"
      style={{ 
        background: 'var(--hi-beige)',
        borderColor: 'var(--hi-border)'
      }}
      data-testid="pause-banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Alert 
          className="border-0 bg-transparent py-3"
          style={{ background: 'transparent' }}
        >
          <div className="flex items-start gap-3">
            <Info 
              className="h-5 w-5 mt-0.5 flex-shrink-0" 
              style={{ color: 'var(--hi-brown)' }}
            />
            <AlertDescription 
              className="flex-1 text-sm"
              style={{ color: 'var(--hi-brown)' }}
            >
              {BOOKING_PAUSE.BANNER_COPY}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-transparent"
              aria-label="Dismiss banner"
              data-testid="button-dismiss-banner"
            >
              <X 
                className="h-4 w-4" 
                style={{ color: 'var(--hi-brown)' }}
              />
            </Button>
          </div>
        </Alert>
      </div>
    </div>
  );
}
