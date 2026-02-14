import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { Link } from "wouter";

interface TrialRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dogName: string;
  reason: 'trial_required' | 'trial_cooldown';
  eligibleAt?: string | null;
}

export default function TrialRequiredDialog({ open, onOpenChange, dogName, reason, eligibleAt }: TrialRequiredDialogProps) {
  const isCooldown = reason === 'trial_cooldown';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-amber-100 p-2">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <DialogTitle className="text-amber-900">
              {isCooldown ? 'Trial Day Just Completed' : 'Trial Day Required'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {isCooldown ? (
              <>
                Great news! <strong>{dogName}</strong> has completed the Trial Day.
                You can book daycare or boarding starting{' '}
                <strong>
                  {eligibleAt ? new Date(eligibleAt).toLocaleDateString('en-IE', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  }) : 'tomorrow'}
                </strong>.
              </>
            ) : (
              <>
                All new dogs must complete a <strong>Trial Day</strong> before booking
                daycare or boarding services. This helps us ensure <strong>{dogName}</strong> is
                comfortable and safe in our care.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {isCooldown ? (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-900 mb-2">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">Available Soon</span>
              </div>
              <p className="text-sm text-amber-700">
                You can book services for {dogName} starting at midnight tonight.
                Check back tomorrow to make your reservation!
              </p>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h4 className="font-semibold text-amber-900 mb-2">What is a Trial Day?</h4>
                <p className="text-sm text-amber-700">
                  A Trial Day is a single daycare session where we get to know {dogName},
                  assess their temperament, and ensure they're a good fit for our group
                  environment. It's just <strong>€20</strong> and unlocks access to all our services.
                </p>
              </div>

              <Link href="/trial">
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Trial Day for {dogName}
                </Button>
              </Link>
            </>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Go Back
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
