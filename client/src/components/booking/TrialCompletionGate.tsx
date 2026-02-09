import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { BOOKING_PAUSE } from '@/config/featureFlags';

interface TrialCompletionGateProps {
  isOpen: boolean;
  onClose: () => void;
  onPass: () => void;
  service: 'daycare' | 'boarding';
}

/**
 * Modal gate that confirms trial day completion before allowing bookings
 * Shown during booking pause period to ensure only existing customers can book
 */
export function TrialCompletionGate({
  isOpen,
  onClose,
  onPass,
  service,
}: TrialCompletionGateProps) {
  const [showTrialUnavailable, setShowTrialUnavailable] = useState(false);

  const handleYes = () => {
    // Store completion confirmation for convenience (can be used later for pass-through)
    localStorage.setItem('trialCompleted', 'true');
    onPass();
    onClose();
  };

  const handleNo = () => {
    setShowTrialUnavailable(true);
  };

  const handleBackToBooking = () => {
    setShowTrialUnavailable(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[480px]"
        data-testid="trial-completion-gate-modal"
      >
        {!showTrialUnavailable ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold" style={{ color: 'var(--hi-brown)' }}>
                Has your dog completed the trial day?
              </DialogTitle>
              <DialogDescription className="text-base pt-2" style={{ color: 'var(--hi-brown-light)' }}>
                All dogs must complete a trial day before booking {service} services. 
                This helps ensure the best experience for your pet and our facility.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2">
              <Button
                variant="default"
                onClick={handleYes}
                className="w-full sm:w-auto order-1"
                autoFocus
                data-testid="button-trial-yes"
                style={{
                  background: 'var(--hi-gold)',
                  color: 'white',
                }}
              >
                Yes, continue
              </Button>
              <Button
                variant="outline"
                onClick={handleNo}
                className="w-full sm:w-auto order-2"
                data-testid="button-trial-no"
                style={{
                  borderColor: 'var(--hi-border)',
                  color: 'var(--hi-brown)',
                }}
              >
                No, I still need a trial day
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold" style={{ color: 'var(--hi-brown)' }}>
                Trial Days Currently Unavailable
              </DialogTitle>
            </DialogHeader>

            <Alert 
              className="my-4"
              style={{
                background: 'var(--hi-beige)',
                borderColor: 'var(--hi-border)',
              }}
            >
              <Info className="h-4 w-4" style={{ color: 'var(--hi-brown)' }} />
              <AlertDescription style={{ color: 'var(--hi-brown)' }}>
                {BOOKING_PAUSE.TRIAL_DAY_COPY}
              </AlertDescription>
            </Alert>

            <DialogDescription className="text-sm" style={{ color: 'var(--hi-brown-light)' }}>
              We apologize for the inconvenience. We look forward to welcoming you and your dog after the holidays!
            </DialogDescription>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleBackToBooking}
                className="w-full sm:w-auto"
                data-testid="button-back"
                style={{
                  borderColor: 'var(--hi-border)',
                  color: 'var(--hi-brown)',
                }}
              >
                Back
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
